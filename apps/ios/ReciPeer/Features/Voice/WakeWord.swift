import Foundation
import Speech
import AVFoundation

/// On-device wake-word detection using the Speech framework as a continuous
/// phrase-spotter — no third-party wake engine needed. Runs only while the
/// assistant is armed but idle; on hearing the trigger phrase it fires
/// `onDetected`. Mirrors live/wake-word.ts (kept available; the provider
/// currently arms tap-to-talk only, matching the RN app).
final class WakeWord: @unchecked Sendable {
    private static let language = "en-US"
    private static let patterns = ["hey chef", "hey chefs", "hey chief", "a chef", "hey shef"]

    private let onDetected: () -> Void
    private let onError: ((Error) -> Void)?

    private let recognizer: SFSpeechRecognizer?
    private let request = SFSpeechAudioBufferRecognitionRequest()
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private let lock = NSLock()
    private var active = false
    private var detected = false

    init(onDetected: @escaping () -> Void, onError: ((Error) -> Void)? = nil) {
        self.onDetected = onDetected
        self.onError = onError
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: Self.language))
    }

    static func isWake(_ transcript: String) -> Bool {
        let normalized = transcript.lowercased()
            .map { $0.isLetter || $0.isNumber || $0 == " " ? $0 : " " }
            .reduce(into: "") { $0.append($1) }
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
        return Self.patterns.contains { normalized.contains($0) }
    }

    func start() async throws {
        // Speech + mic permissions.
        let speechStatus = await withCheckedContinuation { (continuation: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
        }
        guard speechStatus == .authorized else {
            throw VoiceEngineError.wakePermission
        }
        let micGranted = await Self.requestMicPermission()
        guard micGranted else {
            throw VoiceEngineError.capturePermission
        }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.duckOthers])
        try session.setActive(true, options: [])

        lock.lock()
        active = true
        detected = false
        lock.unlock()

        try begin()
    }

    func stop() {
        lock.lock()
        active = false
        lock.unlock()
        teardownRecognition()
    }

    func destroy() {
        stop()
    }

    private func teardownRecognition() {
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()
        recognitionTask?.cancel()
        recognitionTask = nil
    }

    private func begin() throws {
        let input = audioEngine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        guard inputFormat.sampleRate > 0 else {
            throw VoiceEngineError.captureStart
        }

        request.shouldReportPartialResults = true
        // On-device where available (simulator has no on-device model).
        if let supports = recognizer?.supportsOnDeviceRecognition {
            _ = supports
        }

        recognitionTask = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            self.lock.lock()
            let isActive = self.active
            let alreadyDetected = self.detected
            self.lock.unlock()
            guard isActive, !alreadyDetected else { return }

            if let result {
                let transcript = result.bestTranscription.formattedString
                if Self.isWake(transcript) {
                    self.lock.lock()
                    self.detected = true
                    self.lock.unlock()
                    self.teardownRecognition()
                    self.onDetected()
                }
            } else if let error {
                self.onError?(error)
            }
        }

        input.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, _ in
            self?.request.append(buffer)
        }
        audioEngine.prepare()
        try audioEngine.start()
    }

    static func requestMicPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }
}

extension VoiceEngineError {
    static var wakePermission: VoiceEngineError {
        .capturePermission
    }
}
