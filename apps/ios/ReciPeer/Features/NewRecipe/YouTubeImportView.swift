import SwiftUI

/// Paste a YouTube URL → import → review (deduped) or processing.
/// Mirrors new-recipe/youtube.tsx.
struct YouTubeImportView: View {
    @Environment(AppRouter.self) private var router

    @State private var url = ""
    @State private var errorText: String?
    @State private var busy = false

    private var valid: Bool {
        url.trimmingCharacters(in: .whitespaces).range(of: "(?:youtube\\.com|youtu\\.be)", options: .regularExpression, range: nil, locale: nil) != nil
    }

    var body: some View {
        VStack(spacing: 0) {
            FlowHeader(title: "Paste a YouTube link")

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: 25))
                        .foregroundStyle(AppColors.primary)
                        .frame(width: 72, height: 72)
                        .background(AppColors.surfaceMuted)
                        .clipShape(Circle())

                    Text("Import a single video by URL. It's saved privately to your account — imported videos can't be published as your own recipe.")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)

                    AppTextField(
                        label: "YouTube URL",
                        text: $url,
                        placeholder: "https://youtube.com/watch?v=…",
                        keyboardType: .URL,
                        autocapitalization: .never,
                    )
                    .autocorrectionDisabled()

                    Text("Please only import videos you own or have permission to use.")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)

                    if let errorText {
                        Text(errorText)
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.danger)
                    }

                    AppButton(label: "Import this recipe", loading: busy, disabled: !valid) {
                        importLink()
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xxxl)
            }
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
    }

    private func importLink() {
        errorText = nil
        busy = true
        Task {
            defer { busy = false }
            do {
                struct Response: Decodable {
                    let jobId: String?
                    let recipeId: String?
                    let deduped: Bool
                }
                let response: Response = try await APIClient.post(
                    "/recipes/import-link",
                    body: ImportLinkBody(url: url.trimmingCharacters(in: .whitespaces)),
                )
                if response.deduped, let recipeId = response.recipeId {
                    router.recipesPath.append(AppRoute.review(id: recipeId))
                } else if let jobId = response.jobId {
                    router.recipesPath.append(AppRoute.processing(jobID: jobId))
                }
            } catch {
                errorText = (error as? ApiError)?.message ?? "Could not import that link."
            }
        }
    }
}

private struct ImportLinkBody: Encodable {
    let url: String
}
