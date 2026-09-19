import SwiftUI

/// Compact recipe card for the 2-column Explore grid. Mirrors recipe-grid-card.tsx.
struct RecipeGridCard: View {
    let recipe: RecipeCardDTO
    let onToggleSave: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
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
                .aspectRatio(1, contentMode: .fill)
                .clipped()

                if let region = recipe.region {
                    FlagChip(country: region.country, label: FeedUtils.regionLabel(region) ?? region.name)
                        .padding(Spacing.sm)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                SaveButton(saved: recipe.isSaved, action: onToggleSave)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(Spacing.sm)
            }

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text(recipe.title).textStyle(.bodyStrong).lineLimit(2)
                HStack(spacing: Spacing.xs) {
                    Avatar(url: recipe.author.avatarUrl, name: recipe.author.displayName, size: 20)
                    Text(recipe.author.displayName)
                        .textStyle(.micro)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineLimit(1)
                }
            }
            .padding(Spacing.md)
        }
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay { RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1) }
    }
}

/// A cook card for Explore › Cooks. Mirrors explore-cook-card.tsx.
struct ExploreCookCard: View {
    let cook: ExploreCookDTO
    let pending: Bool
    let onToggleFollow: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Group {
                    if let url = cook.avatarUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image): image.resizable().scaledToFill()
                            default: initial
                            }
                        }
                    } else {
                        initial
                    }
                }
                .frame(width: 88)
                .frame(minHeight: 88, maxHeight: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(cook.displayName).textStyle(.heading).lineLimit(1)
                    let flag = FeedUtils.countryToFlag(cook.region?.country)
                    if let place = FeedUtils.regionLabel(cook.region) {
                        Text("\(flag.isEmpty ? "" : flag + " ")\(place)")
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                            .lineLimit(1)
                    }
                    Text("\(cook.recipeCount) \(cook.recipeCount == 1 ? "recipe" : "recipes") · \(compactFollowers) followers")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Hairline()

            HStack(spacing: Spacing.sm) {
                Button(action: onToggleFollow) {
                    HStack(spacing: Spacing.xs) {
                        if cook.isFollowing {
                            Image(systemName: "checkmark").font(.system(size: 12))
                        }
                        Text(cook.isFollowing ? "Following" : "Follow").textStyle(.label)
                    }
                    .foregroundStyle(cook.isFollowing ? AppColors.textPrimary : AppColors.onPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                    .background(cook.isFollowing ? AppColors.surface : AppColors.primary)
                    .clipShape(Capsule())
                    .overlay {
                        if cook.isFollowing {
                            Capsule().stroke(AppColors.border, lineWidth: 1)
                        }
                    }
                }
                .buttonStyle(.pressScale)

                ShareLink(item: "Check out \(cook.displayName) on Sourcery") {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "square.and.arrow.up").font(.system(size: 15))
                        Text("Share").textStyle(.label)
                    }
                    .foregroundStyle(AppColors.textSecondary)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .clipShape(Capsule())
                    .overlay { Capsule().stroke(AppColors.border, lineWidth: 1) }
                }
            }
        }
        .padding(Spacing.lg)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay { RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1) }
        .opacity(pending ? 0.9 : 1)
    }

    private var initial: some View {
        ZStack {
            AppColors.surfaceMuted
            Text(cook.displayName.trimmingCharacters(in: .whitespaces).first.map { String($0).uppercased() } ?? "?")
                .textStyle(.title)
                .foregroundStyle(AppColors.textSecondary)
        }
    }

    /// 5400 → "5.4k".
    private var compactFollowers: String {
        let n = cook.followerCount
        guard n >= 1000 else { return String(n) }
        let k = Double(n) / 1000
        if k >= 10 { return "\(Int(k.rounded()))k" }
        return String(format: "%.1fk", k).replacingOccurrences(of: ".0k", with: "k")
    }
}

/// Full-width collection card with title + meta overlaid on the cover.
/// Mirrors collection-card.tsx.
struct CollectionCard: View {
    let collection: CollectionCardDTO

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Group {
                if let cover = (collection.coverImageUrl ?? collection.previewCovers.first).flatMap(URL.init) {
                    AsyncImage(url: cover) { phase in
                        switch phase {
                        case .success(let image): image.resizable().scaledToFill()
                        default: Rectangle().fill(AppColors.surfaceMuted)
                        }
                    }
                } else {
                    Rectangle().fill(AppColors.surfaceMuted)
                }
            }
            .aspectRatio(16 / 9, contentMode: .fill)
            .clipped()

            LinearGradient(
                colors: [.clear, .black.opacity(0.65)],
                startPoint: UnitPoint(x: 0.5, y: 0.3),
                endPoint: .bottom,
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(collection.title)
                    .textStyle(.heading)
                    .foregroundStyle(AppColors.textInverse)
                    .lineLimit(1)
                Text("\(collection.curatedBy ?? "Curated by Sourcery") · \(collection.recipeCount) \(collection.recipeCount == 1 ? "recipe" : "recipes")")
                    .textStyle(.micro)
                    .foregroundStyle(AppColors.textInverse.opacity(0.9))
                    .lineLimit(1)
            }
            .padding(Spacing.lg)
        }
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
    }
}

/// Horizontal row of recipe filter chips. Each dimension is single-select and
/// toggles off when its active chip is tapped again. Mirrors filter-chips.tsx.
struct FilterChips: View {
    let filters: ExploreRecipeQuery
    let onChange: (ExploreRecipeQuery) -> Void
    let dietary: [ExploreFilterTag]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                chip("Under 30 min", active: filters.maxMinutes == 30) {
                    toggle { var f = filters; f.maxMinutes = filters.maxMinutes == 30 ? nil : 30; return f }
                }
                ForEach(ExploreDifficulty.allCases, id: \.self) { d in
                    chip(d.label, active: filters.difficulty == d) {
                        toggle { var f = filters; f.difficulty = filters.difficulty == d ? nil : d; return f }
                    }
                }
                ForEach(dietary) { tag in
                    chip(tag.name, active: filters.diet == tag.slug) {
                        toggle { var f = filters; f.diet = filters.diet == tag.slug ? nil : tag.slug; return f }
                    }
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.xs)
        }
    }

    private func toggle(_ next: () -> ExploreRecipeQuery) {
        onChange(next())
    }

    private func chip(_ label: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .textStyle(.label)
                .foregroundStyle(active ? AppColors.onPrimary : AppColors.textPrimary)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(active ? AppColors.primary : AppColors.surface)
                .clipShape(Capsule())
                .overlay {
                    Capsule().stroke(active ? AppColors.primary : AppColors.border, lineWidth: 1)
                }
        }
        .buttonStyle(.pressScale)
    }
}
