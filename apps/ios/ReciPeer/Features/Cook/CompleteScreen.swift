import SwiftUI

/// Celebration + the "did you cook this?" prompt that buckets it into Tried.
/// Mirrors complete-screen.tsx.
struct CompleteScreen: View {
    let recipe: RecipeViewDTO
    let onMarkTried: () async throws -> Void
    let onClose: () -> Void

    @State private var phase: Phase

    enum Phase {
        case ask, saving, done
    }

    init(recipe: RecipeViewDTO, onMarkTried: @escaping () async throws -> Void, onClose: @escaping () -> Void) {
        self.recipe = recipe
        self.onMarkTried = onMarkTried
        self.onClose = onClose
        _phase = State(initialValue: recipe.triedByMe ? .done : .ask)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppColors.textPrimary)
                        .frame(width: 40, height: 40)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                        .overlay { Circle().stroke(AppColors.border, lineWidth: 0.5) }
                }
                .buttonStyle(.pressScale)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.sm)

            VStack(spacing: Spacing.sm) {
                Spacer()
                Image(systemName: "checkmark")
                    .font(.system(size: 38, weight: .semibold))
                    .foregroundStyle(AppColors.textInverse)
                    .frame(width: 96, height: 96)
                    .background(AppColors.herb)
                    .clipShape(Circle())

                Text("You did it.")
                    .textStyle(.title)
                    .multilineTextAlignment(.center)
                    .padding(.top, Spacing.lg)

                Text("\(recipe.title), all \(recipe.steps.count) steps.")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 260)
                Spacer()
            }

            Group {
                if phase == .done {
                    doneCard
                } else {
                    askCard
                }
            }
            .padding(.horizontal, Spacing.xl)

            AppButton(label: "Back to recipe", variant: .ghost, action: onClose)
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.lg)
        }
        .background(AppColors.background)
    }

    private var askCard: some View {
        VStack(spacing: Spacing.md) {
            Text("Did you cook this recipe?").textStyle(.bodyStrong)
            Text("We'll add it to your tried recipes.")
                .textStyle(.caption)
                .foregroundStyle(AppColors.textSecondary)

            if phase == .saving {
                ProgressView().tint(AppColors.primary).padding(.top, Spacing.lg)
            } else {
                HStack(spacing: Spacing.md) {
                    AppButton(label: "Not yet", variant: .secondary, action: onClose)
                    AppButton(label: "Yes, I did", systemImage: "checkmark") {
                        Task {
                            phase = .saving
                            do {
                                try await onMarkTried()
                                phase = .done
                            } catch {
                                phase = .ask
                            }
                        }
                    }
                }
                .padding(.top, Spacing.lg)
            }
        }
        .padding(Spacing.xl)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 0.5)
        }
    }

    private var doneCard: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "bookmark.fill")
                .font(.system(size: 15))
                .foregroundStyle(AppColors.herb)
                .frame(width: 44, height: 44)
                .background(AppColors.surfaceMuted)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))

            VStack(alignment: .leading, spacing: 2) {
                Text("Added to your tried recipes").textStyle(.bodyStrong)
                Text("Find it under My Recipes → Tried.")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.lg)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 0.5)
        }
    }
}
