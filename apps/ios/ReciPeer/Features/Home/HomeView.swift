import SwiftUI

/// Meal-based label + icon for the time-dynamic "tonight" tab.
private func currentMeal() -> (label: String, icon: String) {
    let hour = Calendar.current.component(.hour, from: Date())
    switch hour {
    case 5..<11: return ("Breakfast", "cup.and.saucer")
    case 11..<16: return ("Lunch", "sun.max")
    case 16..<22: return ("Dinner", "moon.stars")
    default: return ("Late bites", "moon")
    }
}

/// The Activity / Trending / <meal> segmented control under the wordmark.
/// Mirrors feed-tabs.tsx.
struct FeedTabs: View {
    let active: FeedTab
    let onChange: (FeedTab) -> Void

    var body: some View {
        let meal = currentMeal()
        let tabs: [(tab: FeedTab, label: String, icon: String?)] = [
            (.following, "Activity", nil),
            (.trending, "Trending", nil),
            (.tonight, meal.label, meal.icon),
        ]

        HStack(spacing: Spacing.xl) {
            ForEach(tabs, id: \.tab) { tab in
                Button {
                    onChange(tab.tab)
                } label: {
                    VStack(spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            if let icon = tab.icon {
                                Image(systemName: icon)
                                    .font(.system(size: 12))
                                    .foregroundStyle(
                                        tab.tab == active ? AppColors.textPrimary : AppColors.textSecondary,
                                    )
                            }
                            Text(tab.label)
                                .textStyle(.bodyStrong)
                                .foregroundStyle(
                                    tab.tab == active ? AppColors.textPrimary : AppColors.textSecondary,
                                )
                        }
                        Capsule()
                            .fill(tab.tab == active ? AppColors.accent : .clear)
                            .frame(width: 20, height: 2)
                    }
                }
                .buttonStyle(.pressScale)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

/// The Home tab: wordmark + segmented control, then Activity (posts) or a mixed
/// recipe feed. Mirrors home-screen.tsx.
struct HomeView: View {
    @Environment(FeedStore.self) private var store
    @State private var selectedTab: FeedTab = .following
    @State private var composing = false
    @State private var commentsPostID: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Logo()
                FeedTabs(active: selectedTab) { tab in
                    selectedTab = tab
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.sm)
            .padding(.bottom, Spacing.md)

            switch selectedTab {
            case .following:
                ActivityFeedView(onComments: { commentsPostID = $0 }, onCompose: { composing = true })
            case .tonight, .trending:
                RecipeFeedView(tab: selectedTab)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .task(id: selectedTab) {
            await store.load(selectedTab)
        }
        .sheet(isPresented: $composing) {
            NewPostSheet()
                .environment(store)
        }
        .sheet(item: $commentsPostID) { postID in
            CommentSheet(postID: postID)
                .environment(store)
        }
    }
}

extension String: @retroactive Identifiable {
    public var id: String { self }
}

/// The Activity tab: social timeline of "tried this" posts, follow-chefs footer,
/// and a floating compose button. Mirrors activity-feed.tsx.
private struct ActivityFeedView: View {
    @Environment(FeedStore.self) private var store
    let onComments: (String) -> Void
    let onCompose: () -> Void

    private var posts: [TriedThisCardDTO] {
        store.items(for: .following).compactMap { item in
            if case .tried(let post) = item { return post }
            return nil
        }
    }

    var body: some View {
        Group {
            switch store.status(for: .following) {
            case .loading:
                ScrollView { FeedSkeleton() }
            case .failed(let message):
                FeedError(message: message) { Task { await store.refresh(.following) } }
            default:
                List {
                    Section {
                        ForEach(posts) { post in
                            TriedThisCard(
                                post: post,
                                actions: FeedActions(store: store),
                                onComments: { onComments(post.id) },
                            )
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }
                    } footer: {
                        FollowChefsSection()
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .refreshable { await store.refresh(.following) }
                .overlay {
                    if posts.isEmpty {
                        Text("No activity yet — follow some chefs and check back.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.top, Spacing.xxl)
                    }
                }
            }

            composeFab
        }
    }

    private var composeFab: some View {
        HStack {
            Spacer()
            Button(action: onCompose) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "plus").font(.system(size: 20, weight: .semibold))
                    Text("New Post").textStyle(.button)
                }
                .foregroundStyle(AppColors.textInverse)
                .padding(.horizontal, Spacing.xl)
                .padding(.vertical, Spacing.md)
                .background(AppColors.primaryPressed)
                .clipShape(Capsule())
                .shadow(color: AppColors.textPrimary.opacity(0.5), radius: 32, x: 0, y: 8)
            }
            .buttonStyle(.pressScale)
            .padding(.trailing, Spacing.xl)
        }
        .frame(maxHeight: .infinity, alignment: .bottom)
        .padding(.bottom, Spacing.md)
        .allowsHitTesting(true)
    }
}

/// Recipe-card timeline for the Trending and Tonight tabs.
private struct RecipeFeedView: View {
    @Environment(FeedStore.self) private var store
    let tab: FeedTab

    private static let emptyCopy: [FeedTab: String] = [
        .tonight: "Nothing to cook here yet — check back soon.",
        .trending: "Nothing trending yet.",
    ]

    var body: some View {
        Group {
            switch store.status(for: tab) {
            case .loading:
                ScrollView { FeedSkeleton() }
            case .failed(let message):
                FeedError(message: message) { Task { await store.refresh(tab) } }
            default:
                List {
                    ForEach(store.items(for: tab)) { item in
                        row(item)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .refreshable { await store.refresh(tab) }
                .overlay {
                    if store.items(for: tab).isEmpty {
                        Text(Self.emptyCopy[tab] ?? "")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)
                            .padding(.top, Spacing.xxl)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func row(_ item: FeedItem) -> some View {
        switch item {
        case .recipe(let recipe):
            NavigationLink(value: AppRoute.recipe(id: recipe.id)) {
                RecipeFeedCard(recipe: recipe) {
                    Task { await store.toggleSave(recipe) }
                }
                .padding(.horizontal, Spacing.xl)
            }
            .buttonStyle(.pressScale)
        case .tried(let post):
            TriedThisCard(post: post, actions: FeedActions(store: store), onComments: {})
                .padding(.horizontal, Spacing.xl)
        }
    }
}
