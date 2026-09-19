import SwiftUI

/// Shared header for the create-recipe flow: back button + optional title.
struct FlowHeader: View {
    var title: String? = nil

    var body: some View {
        HStack(spacing: Spacing.md) {
            BackButton()
            if let title {
                Text(title)
                    .textStyle(.heading)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.bottom, Spacing.lg)
    }
}

/// Method picker: upload, paste a link, YouTube connect; the rest come later.
/// Mirrors new-recipe/index.tsx.
struct NewRecipeView: View {
    @Environment(AppRouter.self) private var router
    @State private var comingSoon = false

    private struct Method: Identifiable {
        let icon: String
        let title: String
        let subtitle: String
        let route: AppRoute?
        var id: String { title }
    }

    private let methods: [Method] = [
        Method(icon: "icloud.and.arrow.up", title: "Upload a video", subtitle: "From your camera roll or files.", route: .uploadVideo),
        Method(icon: "link", title: "Paste a YouTube link", subtitle: "Import a single video by URL.", route: .youtubeImport),
        Method(icon: "video.fill", title: "Record a recipe", subtitle: "Film while you cook. We write it up.", route: nil),
        Method(icon: "mic.fill", title: "Talk it through", subtitle: "No camera — just describe it out loud.", route: nil),
        Method(icon: "play.rectangle.fill", title: "Connect YouTube", subtitle: "Pick several of your uploads at once.", route: .youtubeConnect),
        Method(icon: "square.and.pencil", title: "Write it manually", subtitle: "Type the ingredients and steps.", route: nil),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("How would you like to add it?").textStyle(.display)
                    Text("Every way ends the same: you review the written-up recipe before it goes anywhere.")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(.bottom, Spacing.xl)

                ForEach(methods) { method in
                    methodCard(method)
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxxl)
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .alert("Coming soon", isPresented: $comingSoon) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("This way to add a recipe isn't live yet.")
        }
    }

    private func methodCard(_ method: Method) -> some View {
        Button {
            if let route = method.route {
                router.recipesPath.append(route)
            } else {
                comingSoon = true
            }
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: method.icon)
                    .font(.system(size: 19))
                    .foregroundStyle(AppColors.primary)
                    .frame(width: 44, height: 44)
                    .background(AppColors.surfaceMuted)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(method.title).textStyle(.bodyStrong)
                    Text(method.subtitle)
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundStyle(AppColors.textSecondary)
            }
            .padding(Spacing.lg)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1)
            }
        }
        .buttonStyle(.pressScale)
    }
}
