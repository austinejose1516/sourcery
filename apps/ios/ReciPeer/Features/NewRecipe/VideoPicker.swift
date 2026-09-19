import SwiftUI
import PhotosUI

/// PHPicker wrapper that hands back a stable temp copy of the picked video.
/// (PhotosPickerItem doesn't expose its item provider, so this wraps PHPicker
/// directly — the same engine expo-image-picker uses.)
struct VideoPicker: UIViewControllerRepresentable {
    /// Called with a copied temp file URL (stable across the callback), or nil
    /// when the user cancelled.
    let onPick: (URL?) -> Void

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration(photoLibrary: .shared())
        config.filter = .videos
        config.selectionLimit = 1
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ picker: PHPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onPick: onPick)
    }

    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let onPick: (URL?) -> Void

        init(onPick: @escaping (URL?) -> Void) {
            self.onPick = onPick
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            guard let provider = results.first?.itemProvider else {
                onPick(nil)
                return
            }
            // The provider's file URL dies with the callback — copy it out first.
            let typeIdentifiers = [
                UTType.movie.identifier,
                UTType.mpeg4Movie.identifier,
                UTType.quickTimeMovie.identifier,
            ]
            let identifier = typeIdentifiers.first { provider.hasItemConformingToTypeIdentifier($0) }
                ?? UTType.movie.identifier

            provider.loadFileRepresentation(forTypeIdentifier: identifier) { url, error in
                guard let url, error == nil else {
                    DispatchQueue.main.async { self.onPick(nil) }
                    return
                }
                let ext = url.pathExtension.lowercased().isEmpty ? "mp4" : url.pathExtension.lowercased()
                let dest = FileManager.default.temporaryDirectory
                    .appendingPathComponent(UUID().uuidString)
                    .appendingPathExtension(ext)
                do {
                    try FileManager.default.copyItem(at: url, to: dest)
                    DispatchQueue.main.async { self.onPick(dest) }
                } catch {
                    DispatchQueue.main.async { self.onPick(nil) }
                }
            }
        }
    }
}
