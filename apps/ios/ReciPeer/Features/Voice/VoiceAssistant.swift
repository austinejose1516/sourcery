import Foundation
import AVFoundation

/// A capability the assistant can invoke on the current screen (types.ts).
struct VoiceAction {
    /// snake_case function name Gemini will call, e.g. "next_step".
    let name: String
    /// Natural-language description Gemini uses to decide when to call it.
    let description: String
    /// OpenAPI-subset JSON schema for the call args (omit for no-arg actions).
    let parameters: [String: Any]?
    /// Runs the action. Returning a non-empty string makes the assistant speak it.
    let handler: @MainActor ([String: JSONValue]) async -> String?

    init(
        name: String,
        description: String,
        parameters: [String: Any]? = nil,
        handler: @escaping @MainActor ([String: JSONValue]) async -> String?,
    ) {
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler
    }
}

/// Global voice state + the action/context registry (voice-store.ts).
@Observable
@MainActor
final class VoiceStore {
    var status: VoiceStatus = .idle
    var transcript = ""
    var reply: String?
    var error: String?

    private var actionGroups: [String: [VoiceAction]] = [:]
    private var contextProviders: [String: () -> String] = [:]

    func registerActions(_ id: String, _ actions: [VoiceAction]) {
        actionGroups[id] = actions
    }

    func unregisterActions(_ id: String) {
        actionGroups.removeValue(forKey: id)
    }

    func registerContext(_ id: String, _ provider: @escaping () -> String) {
        contextProviders[id] = provider
    }

    func unregisterContext(_ id: String) {
        contextProviders.removeValue(forKey: id)
    }

    /// Flatten every registered screen's actions. Later registrations win on clash.
    func collectActions() -> [VoiceAction] {
        var byName: [String: VoiceAction] = [:]
        for group in actionGroups.values {
            for action in group {
                byName[action.name] = action
            }
        }
        return Array(byName.values)
    }

    /// Join every registered screen's context into one prompt block.
    func collectContext() -> String {
        contextProviders.values
            .compactMap { provider in
                let text = provider()
                return text.isEmpty ? nil : text
            }
            .joined(separator: "\n\n")
    }
}

/// Owns the one voice session for the whole app (voice-assistant-provider.tsx).
///
///   idle ──(tap mic)──▶ connecting ──ready──▶ listening ⇄ speaking
///      ▲                                            │
///      └───────────────── (tap mic) ───────────────┘
///
/// Half-duplex: the mic pauses while the assistant speaks, then resumes after
/// the reply drains. Screens register actions/context and drive it via
/// toggle()/enable()/disable().
@MainActor
final class VoiceAssistant: ObservableObject {
    static let shared = VoiceAssistant()

    let store = VoiceStore()

    /// Phase mirrors the provider's Phase; `wake`/`thinking` never occur in this
    /// build (wake word + REST path not wired — same as RN).
    private(set) var phase: Phase = .idle
    private var micGranted = false

    private var live: LiveClient?
    private var capture: MicCapture?
    private var playback: LivePlayback?
    private var resumeTask: Task<Void, Never>?

    private var inputBuffer = ""
    private var outputBuffer = ""

    enum Phase {
        case idle, connecting, listening, speaking
    }

    var isSessionActive: Bool {
        switch phase {
        case .idle: false
        default: true
        }
    }

    private init() {}

    // MARK: - Public API

    /// Pre-grant the mic permission + prepare the audio session. Call on mount.
    func enable() async {
        guard !micGranted else { return }
        let granted = await MicPermission.request()
        if !granted {
            store.status = .error
            store.error = "Microphone access is needed for voice control."
            return
        }
        micGranted = true
        Self.configureVoiceSession()
    }

    /// Stop any active conversation. Call on unmount.
    func disable() {
        endSession()
        store.transcript = ""
    }

    /// Mic button: stop the live conversation if one is active, else start one.
    func toggle() {
        if isSessionActive {
            endSession()
        } else {
            Task { await startSession() }
        }
    }

    // MARK: - Session

    private func startSession() async {
        if isSessionActive { return }

        if !micGranted {
            await enable()
            guard micGranted else { return }
        }

        phase = .connecting
        store.status = .connecting
        inputBuffer = ""
        outputBuffer = ""
        store.error = nil
        store.reply = nil
        store.transcript = ""

        Self.configureVoiceSession()

        let live = LiveClient { [weak self] event in
            Task { @MainActor in
                self?.handle(event)
            }
        }
        self.live = live
        do {
            guard let token = await APIClient.authToken() else {
                throw ApiError(message: "You need to be signed in to use voice.", status: 401)
            }
            try await live.connect(token: token)
            let playback = LivePlayback()
            self.playback = playback
            let capture = MicCapture { [weak self] chunk in
                Task { @MainActor in
                    self?.live?.sendAudio(chunk)
                }
            }
            self.capture = capture
            live.start(tools: Self.declarations(store.collectActions()), context: store.collectContext())
            // capture.start() fires on the 'ready' event.
        } catch {
            store.error = (error as? LocalizedError)?.errorDescription ?? String(describing: error)
            store.status = .error
            endSession(keepStatus: true)
        }
    }

    private func endSession(keepStatus: Bool = false) {
        resumeTask?.cancel()
        resumeTask = nil
        capture?.stop()
        capture = nil
        playback?.destroy()
        playback = nil
        live?.close()
        live = nil
        if !keepStatus {
            phase = .idle
            store.status = .idle
        }
    }

    // MARK: - Event handling (provider handleEvent)

    private func handle(_ event: LiveEvent) {
        switch event {
        case .ready:
            // Setup acknowledged — start streaming the mic.
            try? capture?.start()
            phase = .listening
            store.status = .listening

        case .inputTranscript(let text):
            inputBuffer += text
            store.transcript = inputBuffer

        case .outputTranscript(let text):
            outputBuffer += text
            store.reply = outputBuffer

        case .audio(let data, let mimeType):
            if phase != .speaking {
                resumeTask?.cancel()
                resumeTask = nil
                capture?.pause() // half-duplex
                phase = .speaking
                store.status = .speaking
            }
            playback?.enqueue(data, mimeType: mimeType)

        case .toolCall(let calls):
            Task { await runToolCalls(calls) }

        case .turnComplete:
            inputBuffer = ""
            outputBuffer = ""
            // Resume the mic only AFTER the reply finishes playing — otherwise
            // the mic captures the assistant's own voice and causes spurious turns.
            resumeTask?.cancel()
            let drain = (playback?.drainDelayMs() ?? 0) + 250
            resumeTask = Task { [weak self] in
                try? await Task.sleep(for: .milliseconds(Int(drain)))
                guard !Task.isCancelled else { return }
                self?.capture?.resume()
                if self?.phase == .speaking {
                    self?.phase = .listening
                    self?.store.status = .listening
                }
            }

        case .interrupted:
            resumeTask?.cancel()
            resumeTask = nil
            playback?.stop()
            capture?.resume()
            phase = .listening
            store.status = .listening

        case .error(let message):
            store.error = message
            store.status = .error
            endSession(keepStatus: true)
        }
    }

    private func runToolCalls(_ calls: [ToolCall]) async {
        let actions = store.collectActions()
        let byName = Dictionary(uniqueKeysWithValues: actions.map { ($0.name, $0) })
        var results: [ToolResult] = []
        for call in calls {
            guard let action = byName[call.name] else {
                results.append(ToolResult(id: call.id, name: call.name, result: "unknown action"))
                continue
            }
            do {
                let out = try await action.handler(call.args ?? [:])
                results.append(
                    ToolResult(
                        id: call.id,
                        name: call.name,
                        result: (out?.trimmingCharacters(in: .whitespaces)).isNilOrEmpty ? "done" : out!.trimmingCharacters(in: .whitespaces),
                    ),
                )
            } catch {
                results.append(ToolResult(id: call.id, name: call.name, result: "failed"))
            }
        }
        live?.sendToolResults(results)
    }

    // MARK: - Static helpers

    /// Strip handlers — only the declaration travels to the server (api.ts).
    private static func declarations(_ actions: [VoiceAction]) -> [[String: Any]] {
        actions.map { action in
            var dict: [String: Any] = [
                "name": action.name,
                "description": action.description,
            ]
            if let parameters = action.parameters {
                dict["parameters"] = parameters
            }
            return dict
        }
    }

    /// play-and-record so we capture + play at once, audible through the silent
    /// switch (kitchens run muted). Mirrors audio-capture.ts configureVoiceSession.
    static func configureVoiceSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(
            .playAndRecord,
            mode: .voiceChat,
            options: [.defaultToSpeaker, .allowBluetoothHFP],
        )
        try? session.setActive(true, options: [])
    }
}

extension Optional where Wrapped == String {
    var isNilOrEmpty: Bool {
        self == nil || self?.isEmpty == true
    }
}

enum MicPermission {
    static func request() async -> Bool {
        if #available(iOS 17.0, *) {
            return await withCheckedContinuation { continuation in
                AVAudioApplication.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
        return await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }
}
