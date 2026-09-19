import AVFoundation

/// Gapless streaming playback of Gemini's spoken reply. Chunks arrive as base64
/// PCM (24 kHz); each is scheduled on an AVAudioPlayerNode queue so they butt up
/// against each other without clicks. `stop()` clears everything scheduled
/// (barge-in). Mirrors live/live-playback.ts (the resample-to-context-rate trick
/// is unnecessary here — AVAudioPlayerNode natively resamples buffers).
final class LivePlayback: @unchecked Sendable {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var format: AVAudioFormat?
    private let lock = NSLock()
    private var pendingFrames: [AVAudioFramePosition] = []

    init() {
        let outputFormat = engine.outputNode.outputFormat(forBus: 0)
        format = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: outputFormat.sampleRate,
            channels: 1,
            interleaved: false,
        )
        engine.attach(player)
        if let format {
            engine.connect(player, to: engine.mainMixerNode, format: format)
        }
    }

    /// Milliseconds of audio still queued (so the mic can wait it out).
    func drainDelayMs() -> Double {
        lock.lock(); defer { lock.unlock() }
        let pending = pendingFrames.reduce(0, +)
        guard let format else { return 0 }
        return Double(pending) / format.sampleRate * 1000
    }

    func enqueue(_ base64: String, mimeType: String) {
        guard let format else { return }
        let bytes = base64ToBytes(base64)
        let floats = pcm16ToFloat32(bytes)
        guard !floats.isEmpty else { return }

        let sourceRate = rateFromMime(mimeType)
        let targetRate = format.sampleRate
        let resampled = sourceRate == targetRate ? floats : resampleFloat32(floats, fromRate: sourceRate, toRate: targetRate)
        guard !resampled.isEmpty,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(resampled.count)) else { return }

        resampled.withUnsafeBufferPointer { pointer in
            buffer.floatChannelData?[0].update(from: pointer.baseAddress!, count: resampled.count)
        }
        buffer.frameLength = AVAudioFrameCount(resampled.count)

        lock.lock()
        pendingFrames.append(AVAudioFramePosition(buffer.frameLength))
        lock.unlock()

        player.scheduleBuffer(buffer) { [weak self] in
            guard let self else { return }
            self.lock.lock()
            if !self.pendingFrames.isEmpty { self.pendingFrames.removeFirst() }
            self.lock.unlock()
        }

        if !player.isPlaying {
            if !engine.isRunning {
                try? engine.start()
            }
            player.play()
        }
    }

    /// Cancel everything scheduled (barge-in / interruption).
    func stop() {
        lock.lock()
        pendingFrames.removeAll()
        lock.unlock()
        player.stop()
    }

    func destroy() {
        stop()
        engine.stop()
    }
}
