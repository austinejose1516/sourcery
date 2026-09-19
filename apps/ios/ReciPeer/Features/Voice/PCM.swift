import Foundation

/// Audio format glue between AVAudioEngine (float32 samples, −1..1) and the
/// Gemini Live API (16-bit PCM, little-endian: 16 kHz mono in, 24 kHz out).
/// Mirrors live/pcm.ts.

/// Float32 [-1,1] → little-endian int16 PCM bytes.
func floatTo16BitPCM(_ input: [Float]) -> [UInt8] {
    var out = [UInt8]()
    out.reserveCapacity(input.count * 2)
    for sample in input {
        let clamped = max(-1, min(1, sample))
        let value = Int16(clamped < 0 ? clamped * Float(Int16.max) : clamped * Float(Int16.max))
        withUnsafeBytes(of: value.littleEndian) { out.append(contentsOf: $0) }
    }
    return out
}

/// Little-endian int16 PCM bytes → Float32 [-1,1].
func pcm16ToFloat32(_ bytes: [UInt8]) -> [Float] {
    let frames = bytes.count / 2
    var out = [Float]()
    out.reserveCapacity(frames)
    var index = 0
    for _ in 0..<frames {
        let value = Int16(bytes[index]) | (Int16(bytes[index + 1]) << 8)
        out.append(Float(value) / Float(Int16.max))
        index += 2
    }
    return out
}

/// Linear-interpolation resample (pcm.ts resampleFloat32).
func resampleFloat32(_ input: [Float], fromRate: Double, toRate: Double) -> [Float] {
    guard fromRate != toRate, !input.isEmpty else { return input }
    let ratio = fromRate / toRate
    let outLength = Int(Double(input.count) / ratio)
    var out = [Float](repeating: 0, count: outLength)
    for i in 0..<outLength {
        let pos = Double(i) * ratio
        let i0 = Int(pos)
        let i1 = min(i0 + 1, input.count - 1)
        let frac = Float(pos - Double(i0))
        out[i] = input[i0] * (1 - frac) + input[i1] * frac
    }
    return out
}

func bytesToBase64(_ bytes: [UInt8]) -> String {
    Data(bytes).base64EncodedString()
}

func base64ToBytes(_ b64: String) -> [UInt8] {
    Data(base64Encoded: b64).map { Array($0) } ?? []
}

/// Parse "audio/pcm;rate=24000" → 24000 (live-playback.ts rateFromMime).
func rateFromMime(_ mime: String) -> Double {
    if let range = mime.range(of: #"rate=(\d+)"#, options: .regularExpression) {
        let digits = mime[range].dropFirst("rate=".count)
        return Double(digits) ?? 24000
    }
    return 24000
}
