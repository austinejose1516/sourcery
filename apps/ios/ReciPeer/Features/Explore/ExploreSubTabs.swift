import SwiftUI

/// Recipes sub-tab: filter chips above a personalised 2-column grid.
private enum GridSpacerID {
    static let value = "__spacer__"
}

private struct GridEntry: Identifiable {
    let id: String
    let recipe: RecipeCardDTO?
}

private func padGrid(_ recipes: [RecipeCardDTO]) -> [GridEntry] {
    var entries = recipes.map { GridEntry(id: $0.id, recipe: $0) }
    if entries.count % 2 == 1 {
        entries.append(GridEntry(id: GridSpacerID.value, recipe: nil))
    }
    return entries
}

/// Recipes / Cooks / Collections sub-tab content for Explore.
struct RecipesSubTab: View {
    @Bindable var store: ExploreStore

    var body: some View {
        Group {
            switch store.recipesStatus {
            case .loading:
                ScrollView { FeedSkeleton() }
            case .failed(let message):
                FeedError(message: message) { Task { await store.loadRecipes() } }
            default:
                ScrollView {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.lg), GridItem(.flexible(), spacing: Spacing.lg)], spacing: Spacing.lg) {
                        ForEach(padGrid(store.recipes)) { entry in
                            if let recipe = entry.recipe {
                                NavigationLink(value: AppRoute.recipe(id: recipe.id)) {
                                    RecipeGridCard(recipe: recipe) {
                                        Task { await store.toggleSave(recipe) }
                                    }
                                }
                                .buttonStyle(.pressScale)
                            } else {
                                Color.clear
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xxxl)
                }
                .overlay {
                    if store.recipes.isEmpty {
                        Text("No recipes match these filters yet.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(.top, Spacing.xxl)
                    }
                }
            }
        }
        .safeAreaInset(edge: .top, spacing: Spacing.sm) {
            FilterChips(
                filters: store.currentQuery,
                onChange: { store.currentQuery = $0 },
                dietary: store.filters?.dietary ?? [],
            )
        }
        .task(id: store.currentQuery) {
            await store.loadRecipes()
        }
    }
}

struct CooksSubTab: View {
    let store: ExploreStore

    var body: some View {
        Group {
            switch store.cooksStatus {
            case .loading:
                ScrollView { FeedSkeleton() }
            case .failed(let message):
                FeedError(message: message) { Task { await store.loadCooks() } }
            default:
                ScrollView {
                    LazyVStack(spacing: Spacing.md) {
                        Text("Cooks who specialise in the food you love.")
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.bottom, Spacing.xs)

                        ForEach(store.cooks) { cook in
                            ExploreCookCard(
                                cook: cook,
                                pending: store.pendingCookID == cook.id,
                                onToggleFollow: { Task { await store.toggleFollow(cook) } },
                            )
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xxxl)
                }
                .overlay {
                    if store.cooks.isEmpty {
                        Text("No cooks to show yet.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(.top, Spacing.xxl)
                    }
                }
            }
        }
        .task { await store.loadCooks() }
    }
}

struct CollectionsSubTab: View {
    let store: ExploreStore

    var body: some View {
        Group {
            switch store.collectionsStatus {
            case .loading:
                ScrollView { FeedSkeleton() }
            case .failed(let message):
                FeedError(message: message) { Task { await store.loadCollections() } }
            default:
                ScrollView {
                    LazyVStack(spacing: Spacing.lg) {
                        Text("Curated by Sourcery")
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.bottom, Spacing.xs)

                        ForEach(store.collections) { collection in
                            CollectionCard(collection: collection)
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xxxl)
                }
                .overlay {
                    if store.collections.isEmpty {
                        Text("No collections yet.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(.top, Spacing.xxl)
                    }
                }
            }
        }
        .task { await store.loadCollections() }
    }
}

/// Full-screen search that floats over the blurred page; searches recipes, cooks
/// and collections at once. Mirrors search-overlay.tsx.
struct SearchOverlayView: View {
    @Bindable var store: ExploreStore
    let onClose: () -> Void
    @FocusState private var focused: Bool

    private var hasQuery: Bool {
        store.searchQuery.trimmingCharacters(in: .whitespaces).count >= 2
    }

    private var isEmpty: Bool {
        guard hasQuery, store.searchStatus == .loaded, let results = store.searchResults else { return false }
        return results.recipes.isEmpty && results.cooks.isEmpty && results.collections.isEmpty
    }

    var body: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial)
            Palette.cream.opacity(0.55).ignoresSafeArea()

            VStack(spacing: Spacing.lg) {
                HStack(spacing: Spacing.sm) {
                    AppTextField(text: $store.searchQuery, placeholder: "Search recipes, cooks, collections…")
                        .focused($focused)
                        .submitLabel(.search)
                        .autocorrectionDisabled()
                        .onSubmit { Task { await store.search() } }

                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 17))
                            .foregroundStyle(AppColors.textPrimary)
                            .frame(width: Sizing.iconButton, height: Sizing.iconButton)
                            .background(AppColors.surface)
                            .clipShape(Circle())
                            .overlay { Circle().stroke(AppColors.border, lineWidth: 1) }
                    }
                    .buttonStyle(.pressScale)
                }

                if !hasQuery {
                    Spacer()
                    Text("Search across every recipe, cook and collection.")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                    Spacer()
                } else if isEmpty {
                    Spacer()
                    Text("Nothing found for “\(store.searchQuery.trimmingCharacters(in: .whitespaces))”.")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                    Spacer()
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: Spacing.xl) {
                            if let results = store.searchResults, !results.recipes.isEmpty {
                                section("Recipes") {
                                    LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.lg), GridItem(.flexible(), spacing: Spacing.lg)], spacing: Spacing.lg) {
                                        ForEach(results.recipes) { recipe in
                                            NavigationLink(value: AppRoute.recipe(id: recipe.id)) {
                                                RecipeGridCard(recipe: recipe) {
                                                    Task { await store.toggleSave(recipe) }
                                                }
                                            }
                                            .buttonStyle(.pressScale)
                                        }
                                    }
                                }
                            }

                            if let results = store.searchResults, !results.cooks.isEmpty {
                                section("Cooks") {
                                    VStack(spacing: Spacing.md) {
                                        ForEach(results.cooks) { cook in
                                            ExploreCookCard(
                                                cook: cook,
                                                pending: store.pendingCookID == cook.id,
                                                onToggleFollow: { Task { await store.toggleFollow(cook) } },
                                            )
                                        }
                                    }
                                }
                            }

                            if let results = store.searchResults, !results.collections.isEmpty {
                                section("Collections") {
                                    VStack(spacing: Spacing.lg) {
                                        ForEach(results.collections) { collection in
                                            CollectionCard(collection: collection)
                                        }
                                    }
                                }
                            }

                            if store.searchStatus == .loading {
                                ProgressView().tint(AppColors.textSecondary)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                        .padding(.bottom, Spacing.xxxl)
                    }
                }
            }
            .padding(.top, Spacing.sm)
            .padding(.horizontal, Spacing.xl)
        }
        .task(id: store.searchQuery) {
            try? await Task.sleep(for: .milliseconds(350))
            guard !Task.isCancelled else { return }
            await store.search()
        }
        .onAppear { focused = true }
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(title).textStyle(.label).foregroundStyle(AppColors.textSecondary)
            content()
        }
    }
}
