import SwiftUI

/// A cook on the Cold-start screen with an inline Follow toggle.
/// Mirrors suggested-cook-row.tsx.
struct SuggestedCookRow: View {
    let cook: SuggestedCookDTO
    let pending: Bool
    let onToggleFollow: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            Avatar(url: cook.avatarUrl, name: cook.displayName, size: 48)

            VStack(alignment: .leading, spacing: 2) {
                Text(cook.displayName).textStyle(.bodyStrong).lineLimit(1)
                let flag = FeedUtils.countryToFlag(cook.region?.country)
                let place = FeedUtils.regionLabel(cook.region) ?? "—"
                Text("\(flag.isEmpty ? "" : flag + " ")\(place) · \(cook.recipeCount) \(cook.recipeCount == 1 ? "recipe" : "recipes")")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Button(action: onToggleFollow) {
                HStack(spacing: Spacing.xs) {
                    if cook.isFollowing {
                        Image(systemName: "checkmark").font(.system(size: 12))
                    }
                    Text(cook.isFollowing ? "Following" : "Follow").textStyle(.label)
                }
                .foregroundStyle(cook.isFollowing ? AppColors.textPrimary : AppColors.onPrimary)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(cook.isFollowing ? AppColors.surface : AppColors.primary)
                .clipShape(Capsule())
                .overlay {
                    if cook.isFollowing {
                        Capsule().stroke(AppColors.border, lineWidth: 1)
                    }
                }
                .opacity(pending ? 0.6 : 1)
            }
            .buttonStyle(.pressScale)
        }
        .padding(.vertical, Spacing.sm)
    }
}

/// Compact recipe card for the horizontal "most-loved" rail.
/// Mirrors most-loved-card.tsx.
struct MostLovedCard: View {
    let recipe: RecipeCardDTO

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
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
            .aspectRatio(3 / 2, contentMode: .fill)
            .clipped()

            VStack(alignment: .leading, spacing: 2) {
                Text(recipe.title).textStyle(.bodyStrong).lineLimit(1)
                if let region = recipe.region {
                    let flag = FeedUtils.countryToFlag(region.country)
                    Text("\(flag.isEmpty ? "" : flag + " ")\(region.name)")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineLimit(1)
                }
            }
            .padding(Spacing.md)
        }
        .frame(width: 200)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay { RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1) }
    }
}

/// "Follow chefs" rail at the bottom of the Activity tab.
/// Mirrors follow-chefs-section.tsx.
struct FollowChefsSection: View {
    @Environment(FeedStore.self) private var store

    private var cooks: [SuggestedCookDTO] {
        Array(store.suggestions.filter { !$0.isFollowing }.prefix(5))
    }

    var body: some View {
        if !cooks.isEmpty {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Hairline()
                Text("Follow chefs").textStyle(.heading)
                VStack(spacing: Spacing.sm) {
                    ForEach(cooks) { cook in
                        SuggestedCookRow(
                            cook: cook,
                            pending: store.pendingCookID == cook.id,
                            onToggleFollow: { Task { await store.toggleFollow(cook) } },
                        )
                        if cook.id != cooks.last?.id {
                            Hairline()
                        }
                    }
                }
            }
            .padding(.top, Spacing.lg)
        }
    }
}

/// Empty-feed onboarding state: hero nudge, cooks to follow, most-loved rail.
/// Mirrors cold-start.tsx.
struct ColdStart: View {
    @Environment(FeedStore.self) private var store

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xxl) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("🍲").textStyle(.display)
                    Text("Follow cooks to fill your feed").textStyle(.title)
                    Text("Based on your tastes, here are cooks you'll probably love.")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(.top, Spacing.lg)

                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Cooks to follow").textStyle(.heading)
                    VStack(spacing: Spacing.sm) {
                        ForEach(store.suggestions) { cook in
                            SuggestedCookRow(
                                cook: cook,
                                pending: store.pendingCookID == cook.id,
                                onToggleFollow: { Task { await store.toggleFollow(cook) } },
                            )
                        }
                        if store.suggestions.isEmpty {
                            Text("No suggestions right now — check back soon.")
                                .textStyle(.body)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                }

                if !store.mostLoved.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Our most-loved recipes").textStyle(.heading)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: Spacing.md) {
                                ForEach(store.mostLoved) { recipe in
                                    MostLovedCard(recipe: recipe)
                                }
                            }
                            .padding(.trailing, Spacing.xl)
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxxl)
        }
    }
}
