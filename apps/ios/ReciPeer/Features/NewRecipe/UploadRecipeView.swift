import SwiftUI

/// Pick a cooking video from the library → presign → PUT → ingest → processing.
/// Mirrors new-recipe/upload.tsx.
struct UploadRecipeView: View {
    @Environment(AppRouter.self) private var router

    @State private var phase: Phase = .idle
    @State private var progress: Double = 0
    @State private var errorText: String?
    @State private var pickerOpen = false
    @State private var uploadTask: Task<Void, Never>?

    enum Phase {
        case idle, uploading, error
    }

    var body: some View {
        VStack(spacing: 0) {
            FlowHeader(title: "Upload a video")

            Group {
                switch phase {
                case .uploading:
                    uploadingState
                case .idle, .error:
                    idleState
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $pickerOpen) {
            VideoPicker { fileURL in
                if let fileURL {
                    pickAndUpload(fileURL)
                } else {
                    phase = .idle
                }
            }
        }
    }

    private var idleState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "film")
                .font(.system(size: 25))
                .foregroundStyle(AppColors.primary)
                .frame(width: 72, height: 72)
                .background(AppColors.surfaceMuted)
                .clipShape(Circle())
                .padding(.bottom, Spacing.sm)

            Text("Bring a video you already have")
                .textStyle(.heading)
                .multilineTextAlignment(.center)

            Text("Pick a cooking video from your camera roll. We'll watch it and write up the ingredients and steps.")
                .textStyle(.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)

            if let errorText {
                Text(errorText)
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.danger)
                    .multilineTextAlignment(.center)
            }

            AppButton(label: "Choose a video", systemImage: "photo.on.rectangle.angled") {
                pickerOpen = true
            }
            .padding(.horizontal, Spacing.xl)
            .frame(maxWidth: Sizing.maxContentWidth)
        }
    }

    private var uploadingState: some View {
        let pct = Int((progress * 100).rounded())
        return VStack(spacing: Spacing.md) {
            Image(systemName: "icloud.and.arrow.up")
                .font(.system(size: 25))
                .foregroundStyle(AppColors.primary)
                .frame(width: 72, height: 72)
                .background(AppColors.surfaceMuted)
                .clipShape(Circle())
                .padding(.bottom, Spacing.sm)

            Text("Uploading your video…").textStyle(.heading)

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppColors.surfaceMuted)
                    Capsule().fill(AppColors.primary).frame(width: proxy.size.width * progress)
                }
            }
            .frame(height: 8)
            .frame(width: 280)

            Text("\(pct)%")
                .textStyle(.caption)
                .foregroundStyle(AppColors.textSecondary)

            Text("Once it's uploaded we'll write up the recipe in the background and notify you when it's ready. You don't have to wait here.")
                .textStyle(.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)

            AppButton(label: "Cancel upload", variant: .secondary) {
                uploadTask?.cancel()
                phase = .idle
                progress = 0
            }
        }
    }

    private func pickAndUpload(_ tempCopy: URL) {
        phase = .uploading
        progress = 0
        errorText = nil

        uploadTask = Task {
            do {
                guard !Task.isCancelled else { return }

                let ext = tempCopy.pathExtension
                let presign = try await UploadService.presign(ext: ext)
                try await UploadService.putWithProgress(
                    url: URL(string: presign.url)!,
                    fileURL: tempCopy,
                    contentType: "video/\(ext)",
                ) { fraction in
                    progress = fraction
                }
                defer { try? FileManager.default.removeItem(at: tempCopy) }

                struct IngestResponse: Decodable { let jobId: String }
                let ingest: IngestResponse = try await APIClient.post(
                    "/recipes/ingest",
                    body: IngestBody(key: presign.key),
                )
                guard !Task.isCancelled else { return }
                router.recipesPath.append(AppRoute.processing(jobID: ingest.jobId))
            } catch {
                guard !Task.isCancelled else { return }
                errorText = (error as? ApiError)?.message ?? "Upload failed."
                phase = .error
            }
        }
    }
}

private struct IngestBody: Encodable {
    let key: String
}
