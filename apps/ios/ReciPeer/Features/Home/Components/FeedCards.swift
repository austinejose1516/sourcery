import SwiftUI

// MARK: - RecipeFeedCard (home/components/recipe-feed-card.tsx)

struct RecipeFeedCard: View {
    let recipe: RecipeCardDTO
    let onToggleSave: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            cover
            cardBody
        }
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1)
        }
    }

    private var cover: some View {
        ZStack(alignment: .topLeading) {
            AsyncImage(url: recipe.coverImageUrl.flatMap(URL.init)) { phase in
                switch phase {
                case .success(let image): image.resizable().scaledToFill()
                default: Rectangle().fill(AppColors.surfaceMuted)
                }
            }
            .aspectRatio(4 / 3, contentMode: .fill)
            .clipped()

            if let region = recipe.region {
                FlagChip(country: region.country, label: FeedUtils.regionLabel(region) ?? region.name)
                    .padding(Spacing.md)
            }

            SaveButton(saved: recipe.isSaved, action: onToggleSave)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(Spacing.md)
        }
    }

    private var cardBody: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(recipe.title).textStyle(.heading).lineLimit(2)
                if let original = recipe.titleOriginal, original != recipe.title {
                    Text(original).textStyle(.caption).foregroundStyle(AppColors.textSecondary)
                }
            }

            if let description = recipe.description {
                Text(description).textStyle(.body)
                    .foregroundStyle(AppColors.textSecondary).lineLimit(2)
            }

            HStack(spacing: Spacing.sm) {
                Avatar(url: recipe.author.avatarUrl, name: recipe.author.displayName, size: 28)
                Text(recipe.author.displayName).textStyle(.label).lineLimit(1)
                Spacer()
                EndorsementBadge(count: recipe.endorsementCount, region: recipe.region?.name)
            }
            .padding(.top, Spacing.xs)
        }
        .padding(Spacing.lg)
    }
}

// MARK: - TriedThisCard (home/components/tried-this-card.tsx)

struct TriedThisCard: View {
    let post: TriedThisCardDTO
    let actions: FeedActions
    let onComments: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            header

            if let note = post.note {
                Text(note).textStyle(.body)
            }

            if let photo = post.photoUrl, let url = URL(string: photo) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFill()
                    default: Rectangle().fill(AppColors.surfaceMuted)
                    }
                }
                .aspectRatio(4 / 3, contentMode: .fill)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            }

            HStack(spacing: Spacing.xs) {
                Image(systemName: "arrow.triangle.branch")
                    .font(.system(size: 12))
                Text("from \(post.recipe.title) · \(post.recipe.author.displayName)")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
                    .lineLimit(1)
            }

            Divider().background(AppColors.border)

            HStack(spacing: Spacing.xl) {
                ActionButton(
                    icon: post.isLiked ? "heart.fill" : "heart",
                    label: post.likeCount > 0 ? "\(post.likeCount)" : "Like",
                    color: post.isLiked ? AppColors.danger : AppColors.textSecondary,
                ) { actions.toggleLike(post) }

                ActionButton(
                    icon: "bubble.left",
                    label: post.commentCount > 0 ? "\(post.commentCount)" : "Comment",
                    color: AppColors.textSecondary,
                ) { onComments() }

                ActionButton(
                    icon: "square.and.arrow.up",
                    label: "Share",
                    color: AppColors.textSecondary,
                ) { actions.share(post) }
            }
        }
        .padding(Spacing.lg)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1)
        }
    }

    private var header: some View {
        HStack(spacing: Spacing.sm) {
            Avatar(url: post.user.avatarUrl, name: post.user.displayName, size: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text(post.user.displayName + flagSuffix).textStyle(.label).lineLimit(1)
                Text("tried a recipe · \(FeedUtils.timeAgo(post.createdAt))")
                    .textStyle(.micro)
                    .foregroundStyle(AppColors.textSecondary)
            }
            Spacer()
            Image(systemName: "fork.knife")
                .font(.system(size: 14))
                .foregroundStyle(AppColors.textSecondary)
        }
    }

    private var flagSuffix: String {
        let flag = FeedUtils.countryToFlag(post.user.country)
        return flag.isEmpty ? "" : "  \(flag)"
    }
}

private struct ActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon).font(.system(size: 16))
                Text(label).textStyle(.caption)
            }
            .foregroundStyle(color)
        }
        .buttonStyle(.pressScale)
    }
}
