import SwiftUI

enum ExploreTab: String, CaseIterable, Identifiable {
    case recipes, cooks, collections
    var id: String { rawValue }
    var label: String {
        switch self {
        case .recipes: "Recipes"
        case .cooks: "Cooks"
        case .collections: "Collections"
        }
    }
}

/// Recipes / Cooks / Collections segmented control. Mirrors explore-tabs.tsx.
struct ExploreTabs: View {
    let active: ExploreTab
    let onChange: (ExploreTab) -> Void

    var body: some View {
        HStack(spacing: Spacing.xl) {
            ForEach(ExploreTab.allCases) { tab in
                Button {
                    onChange(tab)
                } label: {
                    VStack(spacing: Spacing.xs) {
                        Text(tab.label)
                            .textStyle(.bodyStrong)
                            .foregroundStyle(tab == active ? AppColors.textPrimary : AppColors.textSecondary)
                        Capsule()
                            .fill(tab == active ? AppColors.accent : .clear)
                            .frame(width: 20, height: 2)
                    }
                }
                .buttonStyle(.pressScale)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

/// The tap-target search pill. Tapping opens the full-screen search overlay.
/// Mirrors search-bar.tsx.
struct ExploreSearchBar: View {
    let placeholder: String
    let onPress: () -> Void

    var body: some View {
        Button(action: onPress) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16))
                    .foregroundStyle(AppColors.textSecondary)
                Text(placeholder)
                    .textStyle(.body)
                    .foregroundStyle(AppColors.textPlaceholder)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "mic")
                    .font(.system(size: 16))
                    .foregroundStyle(AppColors.textSecondary)
            }
            .frame(height: 48)
            .padding(.horizontal, Spacing.lg)
            .background(AppColors.surface)
            .clipShape(Capsule())
            .overlay { Capsule().stroke(AppColors.border, lineWidth: 1) }
        }
        .buttonStyle(.pressScale)
    }
}

/// The Explore tab: logo + search pill + segmented control + sub-tab content.
/// Mirrors explore-screen.tsx.
struct ExploreView: View {
    @Environment(FeedStore.self) private var feed
    @State private var store = ExploreStore()
    @State private var tab: ExploreTab = .recipes
    @State private var searchOpen = false

    private var placeholder: String {
        switch tab {
        case .recipes: "Search recipes or cooks…"
        case .cooks: "Search cooks by name or region…"
        case .collections: "Search collections…"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Logo()
                ExploreSearchBar(placeholder: placeholder) { searchOpen = true }
                ExploreTabs(active: tab) { tab = $0 }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.sm)

            Group {
                switch tab {
                case .recipes: RecipesSubTab(store: store)
                case .cooks: CooksSubTab(store: store)
                case .collections: CollectionsSubTab(store: store)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .task { await store.loadFilters() }
        .fullScreenCover(isPresented: $searchOpen) {
            SearchOverlayView(store: store) { searchOpen = false }
        }
    }
}
