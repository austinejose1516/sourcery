import Foundation

/// Voice assistant session states (Phase 6 wires the real engine; cook mode
/// renders against this enum from Phase 4 onward).
enum VoiceStatus: Equatable {
    case idle
    case wake
    case connecting
    case listening
    case thinking
    case speaking
    case error
}
