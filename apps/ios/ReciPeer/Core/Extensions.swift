import Foundation

extension Array {
    /// Safe index access — nil when out of bounds.
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
