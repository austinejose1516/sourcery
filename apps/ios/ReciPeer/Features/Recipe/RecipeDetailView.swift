import SwiftUI

/// Round icon button used in the viewer's top chrome.
private struct RoundButton: View {
    let icon: String
    var iconColor: Color = AppColors.textPrimary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 17))
                .foregroundStyle(iconColor)
                .frame(width: 40, height: 40)
                .background(AppColors.surface)
                .clipShape(Circle())
                .overlay { Circle().stroke(AppColors.border, lineWidth: 0.5) }
        }
        .buttonStyle(.pressScale)
    }
}

/// The recipe viewer — a type-led overview that leads into hands-free cook mode.
/// Mirrors recipe-view/components/overview-screen.tsx.
struct RecipeDetailView: View {
    let recipeId: String
    @Environment(\.dismiss) private var dismiss
    @State private var store = RecipeViewStore()
    @State private var profile: UserProfileDTO?
    @State private var cookModeOpen = false

    var body: some View {
        Group {
            switch store.status {
            case .idle, .loading:
                VStack {
                    Spacer()
                    ProgressView().tint(AppColors.primary)
                    Spacer()
                }
                .background(AppColors.background)
            case .failed(let message):
                VStack(spacing: Spacing.lg) {
                    HStack {
                        BackButton()
                        Spacer()
                    }
                    .padding(.horizontal, Spacing.md)
                    Spacer()
                    AppText(message, variant: .body, color: AppColors.textSecondary)
                    Spacer()
                }
                .background(AppColors.background)
            case .loaded:
                if let recipe = store.recipe {
                    overview(recipe)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await store.load(recipeId)
            profile = try? await ProfileService.fetchProfile()
        }
        .fullScreenCover(isPresented: $cookModeOpen) {
            if let recipe = store.recipe {
                CookFlow(recipe: recipe) { cookModeOpen = false }
            }
        }
    }

    private func overview(_ recipe: RecipeViewDTO) -> some View {
        VStack(spacing: 0) {
            // Top chrome
            HStack {
                RoundButton(icon: "chevron.left") { dismiss() }
                Spacer()
                RoundButton(
                    icon: recipe.isSaved ? "bookmark.fill" : "bookmark",
                    iconColor: recipe.isSaved ? AppColors.primary : AppColors.textPrimary,
                ) {
                    Task { await store.toggleSave() }
                }
                RoundButton(icon: "square.and.arrow.up") { shareRecipe(recipe) }
            }
            .padding(.horizontal, Spacing.md)
            .frame(height: 48)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    trustRow(recipe)
                    titles(recipe)
                    ContributorRow(recipe: recipe) {
                        Task { await store.toggleFollow() }
                    }
                    QuickFacts(recipe: recipe)

                    sectionLabel("What you'll do")
                    StepOutline(recipe: recipe)

                    sectionLabel("Ingredients · \(recipe.baseServings) servings")
                    IngredientRows(recipe: recipe)

                    NutritionSection(recipe: recipe, profile: profile)

                    VoiceHint()
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.xs)
                .padding(.bottom, Spacing.xxl)
            }

            footer(recipe)
        }
        .background(AppColors.background)
    }

    private func shareRecipe(_ recipe: RecipeViewDTO) {
        let text = "\(recipe.title) — on Sourcery"
        Task { @MainActor in
            UIPasteboard.general.string = text
        }
    }

    private func trustRow(_ recipe: RecipeViewDTO) -> some View {
        HStack(spacing: Spacing.sm) {
            if let region = recipe.region {
                FlagChip(country: region.country, label: FeedUtils.regionLabel(region) ?? region.name)
            }
            EndorsementBadge(count: recipe.endorsementCount, region: recipe.region?.name)
        }
        .padding(.bottom, Spacing.md)
    }

    @ViewBuilder
    private func titles(_ recipe: RecipeViewDTO) -> some View {
        if let original = recipe.titleOriginal {
            Text(original)
                .font(.custom(AppFont.display, size: 14))
                .italic()
                .foregroundStyle(Palette.burgundyInk)
                .padding(.bottom, Spacing.xs)
        }
        Text(recipe.title)
            .font(.custom(AppFont.display, size: 34))
            .tracking(-0.5)
            .foregroundStyle(AppColors.textPrimary)
        if let description = recipe.description {
            Text(description)
                .font(.custom(AppFont.display, size: 16))
                .foregroundStyle(AppColors.textSecondary)
                .padding(.top, Spacing.md)
        }
    }

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .textStyle(.heading)
            .padding(.top, Spacing.xxl)
            .padding(.bottom, Spacing.md)
    }

    private func footer(_ recipe: RecipeViewDTO) -> some View {
        VStack(spacing: Spacing.sm) {
            AppButton(label: "Start cooking", systemImage: "flame.fill") {
                cookModeOpen = true
            }
            Text("Step-by-step · hands-free\(recipe.handsOnMinutes.map { " · ~\($0) min hands-on" } ?? "")")
                .textStyle(.micro)
                .foregroundStyle(AppColors.textSecondary)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.lg)
        .background(AppColors.background)
        .overlay(alignment: .top) {
            Hairline()
        }
    }
}

/// Contributor strip with follow toggle.
private struct ContributorRow: View {
    let recipe: RecipeViewDTO
    let onToggleFollow: () -> Void

    var body: some View {
        let c = recipe.contributor
        HStack(spacing: Spacing.md) {
            Avatar(url: c.avatarUrl, name: c.displayName, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(c.displayName + (c.flagEmoji.map { " \($0)" } ?? ""))
                    .textStyle(.bodyStrong).lineLimit(1)
                Text([c.region, "\(c.recipeCount) recipes shared"].compactMap { $0 }.joined(separator: " · "))
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Button(action: onToggleFollow) {
                Text(c.isFollowing ? "Following" : "Follow")
                    .textStyle(.label)
                    .foregroundStyle(c.isFollowing ? AppColors.textPrimary : AppColors.textInverse)
                    .padding(.horizontal, Spacing.lg)
                    .frame(height: 34)
                    .background {
                        if c.isFollowing {
                            Capsule().stroke(AppColors.borderStrong, lineWidth: 1)
                        } else {
                            Capsule().fill(AppColors.textPrimary)
                        }
                    }
            }
            .buttonStyle(.pressScale)
        }
        .padding(.top, Spacing.lg)
        .overlay(alignment: .top) {
            Hairline()
        }
    }
}

/// Total / hands-on / serves / steps strip.
private struct QuickFacts: View {
    let recipe: RecipeViewDTO

    private var facts: [(String, String)] {
        [
            (recipe.totalTimeMinutes.map { "\($0) min" } ?? "—", "TOTAL"),
            (recipe.handsOnMinutes.map { "~\($0) min" } ?? "—", "HANDS-ON"),
            ("\(recipe.baseServings)", "SERVES"),
            ("\(recipe.steps.count)", "STEPS"),
        ]
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(facts.enumerated()), id: \.offset) { index, fact in
                VStack(spacing: 3) {
                    Text(fact.0).textStyle(.bodyStrong)
                    Text(fact.1)
                        .font(.custom(AppFont.body, size: 9.5))
                        .tracking(0.6)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .overlay(alignment: .trailing) {
                    if index < facts.count - 1 {
                        Rectangle().fill(AppColors.border).frame(width: 0.5)
                    }
                }
            }
        }
        .padding(.vertical, Spacing.md)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 0.5)
        }
        .padding(.top, Spacing.lg)
    }
}

/// Numbered step outline with per-step timer + caution hints.
private struct StepOutline: View {
    let recipe: RecipeViewDTO

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(recipe.steps.enumerated()), id: \.element.id) { index, step in
                HStack(spacing: Spacing.md) {
                    Text("\(index + 1)")
                        .textStyle(.micro)
                        .foregroundStyle(AppColors.textPrimary)
                        .frame(width: 26, height: 26)
                        .background(AppColors.surfaceMuted)
                        .clipShape(Circle())

                    Text(step.summary ?? step.instruction)
                        .textStyle(.bodyStrong)
                        .lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if let timerSeconds = step.timerSeconds {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "clock")
                                .font(.system(size: 11))
                            Text("\(Int((Double(timerSeconds) / 60).rounded()))m")
                                .textStyle(.micro)
                        }
                        .foregroundStyle(AppColors.textSecondary)
                    }

                    if step.caution != nil {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(AppColors.accent)
                    }
                }
                .padding(.vertical, Spacing.md)
                .overlay(alignment: .bottom) {
                    if index < recipe.steps.count - 1 {
                        Hairline()
                    }
                }
            }
        }
    }
}

/// Ingredients at a glance with show-all toggle.
private struct IngredientRows: View {
    let recipe: RecipeViewDTO
    @State private var showAll = false

    private static let previewCount = 6

    var body: some View {
        let rows = showAll ? recipe.ingredients : Array(recipe.ingredients.prefix(Self.previewCount))
        let hasMore = recipe.ingredients.count > Self.previewCount

        VStack(spacing: 0) {
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, ingredient in
                    HStack {
                        Text(ingredient.name)
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.textPrimary)
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        if let qty = ingredient.qty {
                            Text(qty)
                                .textStyle(.caption)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                    .overlay(alignment: .bottom) {
                        if index < rows.count - 1 {
                            Hairline()
                        }
                    }
                }
            }
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 0.5)
            }

            if hasMore {
                Button {
                    showAll.toggle()
                } label: {
                    Text(showAll ? "Show fewer" : "Show all \(recipe.ingredients.count)")
                        .textStyle(.label)
                        .foregroundStyle(AppColors.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                        .overlay {
                            RoundedRectangle(cornerRadius: Radius.md).stroke(AppColors.border, lineWidth: 0.5)
                        }
                }
                .buttonStyle(.pressScale)
                .padding(.top, Spacing.sm)
            }
        }
    }
}

/// The "cook hands-free" teaser card.
private struct VoiceHint: View {
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: "mic.fill")
                .font(.system(size: 13))
                .foregroundStyle(Palette.bleuInk)
                .frame(width: 28, height: 28)
                .background(AppColors.surface)
                .clipShape(Circle())

            (Text("Cook hands-free. ").font(.custom(AppFont.bodySemibold, size: 14))
                + Text("Once you start, just say “next”, “how long?”, or “repeat” — no need to touch the screen.")
                .font(.custom(AppFont.body, size: 14)))
                .foregroundStyle(Palette.bleuInk)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(Palette.bleu)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        .padding(.top, Spacing.xl)
    }
}
