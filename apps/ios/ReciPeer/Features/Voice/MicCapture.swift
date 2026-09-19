import AVFoundation

/// Mic capture for the Gemini Live session: AVAudioEngine input tap → 16 kHz
/// int16 mono → base64 chunks. Half-duplex: `pause()` keeps the mic open but
/// drops chunks while the assistant speaks. Mirrors live/audio-capture.ts.
final class MicCapture: @unchecked Sendable {
    private let engine = AVAudioEngine()
    private let lock = NSLock()
    private var paused = false
    private var started = false
    private let onChunk: @Sendable (String) -> Void

    private static let targetRate: Double = 16000

    init(onChunk: @escaping @Sendable (String) -> Void) {
        self.onChunk = onChunk
    }

    var isPaused: Bool {
        lock.lock(); defer { lock.unlock() }
        return paused
    }

    func pause() {
        lock.lock(); paused = true; lock.unlock()
    }

    func resume() {
        lock.lock(); paused = false; lock.unlock()
    }

    func start() throws {
        guard !started else { return }
        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
            throw VoiceEngineError.captureStart
        }
        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: Self.targetRate,
            channels: 1,
            interleaved: false,
        ) else {
            throw VoiceEngineError.captureStart
        }
        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            throw VoiceEngineError.captureStart
        }

        let ratio = Self.targetRate / inputFormat.sampleRate
        input.installTap(onBus: 0, bufferSize: 4800, format: inputFormat) { [weak self] buffer, _ in
            guard let self else { return }
            if self.isPaused { return }
            self.convert(buffer: buffer, converter: converter, targetFormat: targetFormat, ratio: ratio)
        }

        engine.prepare()
        try engine.start()
        started = true
    }

    func stop() {
        guard started else { return }
        started = false
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
    }

    private func convert(
        buffer: AVAudioPCMBuffer,
        converter: AVAudioConverter,
        targetFormat: AVAudioFormat,
        ratio: Double,
    ) {
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 64
        guard let out = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: capacity) else { return }
        var fed = false
        var conversionError: NSError?
        let status = converter.convert(to: out, error: &conversionError) { _, outStatus in
            if fed {
                outStatus.pointee = .endOfStream
                return nil
            }
            fed = true
            outStatus.pointee = .haveData
            return buffer
        }
        guard status != .error, conversionError == nil,
              let channel = out.floatChannelData?[0] else { return }
        let frames = Int(out.frameLength)
        guard frames > 0 else { return }
        let floats = Array(UnsafeBufferPointer(start: channel, count: frames))
        let payload = bytesToBase64(floatTo16BitPCM(floats))
        onChunk(payload)
    }
}

enum VoiceEngineError: LocalizedError {
    case captureStart
    case capturePermission

    var errorDescription: String? {
        switch self {
        case .captureStart: "Couldn't start the microphone."
        case .capturePermission:
            "Microphone and speech permission are needed to listen for \"Hey Chef\"."
        }
    }
}
