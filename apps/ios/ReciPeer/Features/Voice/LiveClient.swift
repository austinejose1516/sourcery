import Foundation

/// A JSON value that can hold any JSON payload (tool-call args).
enum JSONValue: Decodable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }

    var numberValue: Double? {
        if case .number(let value) = self { return value }
        return nil
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            self = .null
        }
    }
}

/// One tool-call item from the server (live-client.ts LiveEvent).
struct ToolCall: Decodable {
    let id: String?
    let name: String
    let args: [String: JSONValue]?
}

/// A tool result sent back to the server.
struct ToolResult: Encodable {
    let id: String?
    let name: String
    let result: String
}

/// Events from the Gemini Live proxy (GET /voice/live), live-client.ts LiveEvent.
enum LiveEvent {
    case ready
    case audio(data: String, mimeType: String)
    case inputTranscript(String)
    case outputTranscript(String)
    case toolCall([ToolCall])
    case turnComplete
    case interrupted
    case error(String)
}

/// Client for the Gemini Live proxy. Auth rides as a `?token=` query param —
/// the proxy verifies the Supabase JWT itself. Mirrors live/live-client.ts.
final class LiveClient: NSObject, @unchecked Sendable {
    private var task: URLSessionWebSocketTask?
    private lazy var session = URLSession(
        configuration: .default,
        delegate: self,
        delegateQueue: nil,
    )
    private let lock = NSLock()
    private var closed = true
    private var openContinuation: CheckedContinuation<Void, Error>?
    private let onEvent: @Sendable (LiveEvent) -> Void

    init(onEvent: @escaping @Sendable (LiveEvent) -> Void) {
        self.onEvent = onEvent
    }

    /// Open the socket. Resolves once connected (before the session `start`).
    func connect(token: String) async throws {
        guard var components = URLComponents(url: AppConfig.apiBaseURL, resolvingAgainstBaseURL: false) else {
            throw ApiError(message: "Invalid API base URL.", status: 0)
        }
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.path = "/voice/live"
        components.queryItems = [URLQueryItem(name: "token", value: token)]
        guard let url = components.url else {
            throw ApiError(message: "Invalid voice socket URL.", status: 0)
        }

        let task = session.webSocketTask(with: url)
        lock.lock()
        self.task = task
        closed = false
        lock.unlock()
        task.resume()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            lock.lock()
            openContinuation = continuation
            lock.unlock()
        }

        receiveLoop(task: task)
    }

    /// Begin the Gemini session with the screen's actions + context.
    func start(tools: [[String: Any]], context: String) {
        send([
            "type": "start",
            "tools": tools,
            "context": context,
        ])
    }

    func sendAudio(_ base64Pcm16: String) {
        send(["type": "audio", "data": base64Pcm16])
    }

    func sendToolResults(_ results: [ToolResult]) {
        let responses: [[String: Any]] = results.map { result in
            var dict: [String: Any] = ["name": result.name, "result": result.result]
            if let id = result.id { dict["id"] = id }
            return dict
        }
        send(["type": "tool_response", "responses": responses])
    }

    func close() {
        lock.lock()
        let wasClosed = closed
        closed = true
        let task = self.task
        self.task = nil
        lock.unlock()
        guard !wasClosed, task != nil else { return }
        send(["type": "end"])
        task?.cancel(with: .normalClosure, reason: nil)
    }

    // MARK: - Internals

    private func send(_ payload: [String: Any]) {
        lock.lock()
        let task = self.task
        let isClosed = closed
        lock.unlock()
        guard let task, !isClosed, JSONSerialization.isValidJSONObject(payload) else { return }
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        task.send(.data(data)) { _ in }
    }

    private func receiveLoop(task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handle(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handle(text)
                    }
                @unknown default:
                    break
                }
                self.lock.lock()
                let isClosed = self.closed
                self.lock.unlock()
                if !isClosed {
                    self.receiveLoop(task: task)
                }
            case .failure:
                self.lock.lock()
                let alreadyClosed = self.closed
                self.closed = true
                self.lock.unlock()
                if !alreadyClosed {
                    self.onEvent(.error("Voice connection dropped."))
                }
            }
        }
    }

    private func handle(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "ready":
            onEvent(.ready)
        case "audio":
            if let payload = json["data"] as? String, let mimeType = json["mimeType"] as? String {
                onEvent(.audio(data: payload, mimeType: mimeType))
            }
        case "input_transcript":
            if let value = json["text"] as? String {
                onEvent(.inputTranscript(value))
            }
        case "output_transcript":
            if let value = json["text"] as? String {
                onEvent(.outputTranscript(value))
            }
        case "tool_call":
            let calls: [ToolCall]
            if let raw = json["calls"],
               JSONSerialization.isValidJSONObject(raw) ?? false,
               let rawData = try? JSONSerialization.data(withJSONObject: raw),
               let decoded = try? JSONDecoder().decode([ToolCall].self, from: rawData) {
                calls = decoded
            } else {
                calls = []
            }
            onEvent(.toolCall(calls))
        case "turn_complete":
            onEvent(.turnComplete)
        case "interrupted":
            onEvent(.interrupted)
        case "error":
            onEvent(.error(json["message"] as? String ?? "Voice error."))
        default:
            break
        }
    }
}

extension LiveClient: URLSessionWebSocketDelegate {
    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?,
    ) {
        lock.lock()
        let continuation = openContinuation
        openContinuation = nil
        lock.unlock()
        continuation?.resume()
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?,
    ) {
        lock.lock()
        let continuation = openContinuation
        openContinuation = nil
        let wasClosed = closed
        closed = true
        lock.unlock()

        if let continuation {
            continuation.resume(
                throwing: ApiError(message: "Couldn't reach the voice service.", status: 0),
            )
        } else if !wasClosed {
            onEvent(.error("Voice connection dropped."))
        }
    }
}
