import SwiftUI

/// Bottom-sheet style modal listing a post's comments with an input to add one.
/// Mirrors comment-modal.tsx.
struct CommentSheet: View {
    let postID: String
    @Environment(FeedStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var comments: [PostCommentDTO] = []
    @State private var draft = ""
    @State private var loading = true
    @State private var sending = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if loading {
                    VStack {
                        Spacer()
                        ProgressView().tint(AppColors.textSecondary)
                        Spacer()
                    }
                } else if comments.isEmpty {
                    VStack {
                        Spacer()
                        Text("No comments yet — be the first.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: Spacing.lg) {
                            ForEach(comments) { comment in
                                CommentRow(comment: comment)
                            }
                        }
                        .padding(Spacing.xl)
                    }
                }

                composer
            }
            .background(AppColors.background)
            .navigationTitle("Comments")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .task {
            comments = (try? await SocialService.fetchComments(postID)) ?? []
            loading = false
        }
    }

    private var composer: some View {
        HStack(spacing: Spacing.sm) {
            AppTextField(text: $draft, placeholder: "Add a comment…", submitLabel: .send, onSubmit: submit)

            Button(action: submit) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppColors.onPrimary)
                    .frame(width: Sizing.iconButton, height: Sizing.iconButton)
                    .background(AppColors.primary)
                    .clipShape(Circle())
            }
            .opacity(draft.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
            .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || sending)
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.vertical, Spacing.sm)
    }

    private func submit() {
        let body = draft.trimmingCharacters(in: .whitespaces)
        guard !body.isEmpty, !sending else { return }
        sending = true
        Task {
            defer { sending = false }
            try? await store.addComment(postID: postID, body: body)
            comments = (try? await SocialService.fetchComments(postID)) ?? []
            draft = ""
        }
    }
}

private struct CommentRow: View {
    let comment: PostCommentDTO

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Avatar(url: comment.user.avatarUrl, name: comment.user.displayName, size: 32)
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(comment.user.displayName).textStyle(.label)
                    Text("· \(FeedUtils.timeAgo(comment.createdAt))")
                        .font(.custom(AppFont.body, size: 12))
                        .foregroundStyle(AppColors.textSecondary)
                }
                Text(comment.body).textStyle(.body)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Compose a new "tried this" post: pick a cooked recipe + note.
/// Mirrors new-post-modal.tsx.
struct NewPostSheet: View {
    @Environment(FeedStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var recipeID: String?
    @State private var note = ""
    @State private var sending = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Which recipe did you cook?")
                            .textStyle(.label)
                            .foregroundStyle(AppColors.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        if store.mostLovedStatus.isLoading {
                            ProgressView().tint(AppColors.textSecondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.xl)
                        } else {
                            VStack(spacing: Spacing.sm) {
                                ForEach(store.mostLoved) { recipe in
                                    RecipeOption(
                                        recipe: recipe,
                                        selected: recipeID == recipe.id,
                                    ) {
                                        recipeID = recipe.id
                                    }
                                }
                            }
                        }

                        AppTextField(
                            label: "Note",
                            text: $note,
                            placeholder: "How did it go? (optional)",
                        )
                    }
                    .padding(Spacing.xl)
                }

                VStack {
                    AppButton(label: "Share post", loading: sending, disabled: recipeID == nil) {
                        submit()
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.vertical, Spacing.sm)
            }
            .background(AppColors.background)
            .navigationTitle("New post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .task { await store.loadMostLoved() }
    }

    private func submit() {
        guard let recipeID, !sending else { return }
        sending = true
        Task {
            defer { sending = false }
            try? await store.createPost(recipeID: recipeID, note: note.trimmingCharacters(in: .whitespaces))
            dismiss()
        }
    }
}

private struct RecipeOption: View {
    let recipe: RecipeCardDTO
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.md) {
                Group {
                    if let url = recipe.coverImageUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image): image.resizable().scaledToFill()
                            default: Rectangle().fill(AppColors.surfaceMuted)
                            }
                        }
                    } else {
                        Rectangle().fill(AppColors.surfaceMuted)
                    }
                }
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: Radius.sm))

                VStack(alignment: .leading, spacing: 2) {
                    Text(recipe.title).textStyle(.label).lineLimit(1)
                    Text(recipe.author.displayName).textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary).lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(AppColors.primary)
                }
            }
            .padding(Spacing.sm)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.md)
                    .stroke(selected ? AppColors.primary : AppColors.border, lineWidth: 1)
            }
        }
        .buttonStyle(.pressScale)
    }
}
