import SwiftUI

/// Two-column card grid, matching the Explore recipes grid spacing.
private func libraryGrid<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    LazyVGrid(
        columns: [GridItem(.flexible(), spacing: Spacing.lg), GridItem(.flexible(), spacing: Spacing.lg)],
        spacing: Spacing.lg
    ) {
        content()
    }
}

enum LibraryTab: String, CaseIterable, Identifiable {
    case saved, tried, mine
    var id: String { rawValue }
    var label: String {
        switch self {
        case .saved: "Saved"
        case .tried: "Tried"
        case .mine: "Mine"
        }
    }
}

/// Saved / Tried / Mine segmented control with an optional "Mine" count badge.
private struct LibraryTabs: View {
    let active: LibraryTab
    let onChange: (LibraryTab) -> Void
    let mineCount: Int

    var body: some View {
        HStack(spacing: Spacing.xl) {
            ForEach(LibraryTab.allCases) { tab in
                Button {
                    onChange(tab)
                } label: {
                    VStack(spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            Text(tab.label)
                                .textStyle(.bodyStrong)
                                .foregroundStyle(tab == active ? AppColors.textPrimary : AppColors.textSecondary)
                            if tab == .mine, mineCount > 0 {
                                Text("\(mineCount)")
                                    .textStyle(.micro)
                                    .foregroundStyle(AppColors.textSecondary)
                                    .padding(.horizontal, Spacing.xs)
                                    .padding(.vertical, Spacing.xxs)
                                    .background(AppColors.surfaceMuted)
                                    .clipShape(Capsule())
                            }
                        }
                        Capsule()
                            .fill(tab == active ? AppColors.accent : .clear)
                            .frame(width: 20, height: 2)
                    }
                }
                .buttonStyle(.pressScale)
            }
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.bottom, Spacing.sm)
    }
}

/// The My Recipes tab: Saved / Tried / Mine library with a New-recipe FAB.
/// Mirrors my-recipes-screen.tsx.
struct MyRecipesView: View {
    @Environment(SessionStore.self) private var session
    @State private var store = MyRecipesStore()
    @State private var tab: LibraryTab = .mine

    private var mineCount: Int {
        guard let data = store.data else { return 0 }
        return data.processing.count + data.needsReview.count + data.published.count + data.private.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("My Recipes")
                .textStyle(.display)
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.sm)
                .padding(.bottom, Spacing.md)

            LibraryTabs(active: tab, onChange: { tab = $0 }, mineCount: mineCount)
            Hairline()

            Group {
                switch tab {
                case .saved: savedEmpty
                case .tried: TriedTab(store: store)
                case .mine: MineSection(store: store)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            newRecipeFab
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .task { await store.load(force: true) }
    }

    private var savedEmpty: some View {
        VStack(spacing: Spacing.sm) {
            Spacer()
            Image(systemName: "bookmark")
                .font(.system(size: 30))
                .foregroundStyle(AppColors.textSecondary)
            Text("Nothing saved yet").textStyle(.heading)
            Text("Bookmark recipes from Explore to find them here.")
                .textStyle(.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(.horizontal, Spacing.xl)
    }

    private var newRecipeFab: some View {
        NavigationLink(value: AppRoute.newRecipe) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "plus").font(.system(size: 18, weight: .semibold))
                Text("New recipe").textStyle(.button)
            }
            .foregroundStyle(AppColors.onPrimary)
            .padding(.horizontal, Spacing.xxl)
            .padding(.vertical, Spacing.md)
            .background(AppColors.primary)
            .clipShape(Capsule())
            .shadow(color: AppColors.textPrimary.opacity(0.16), radius: 12, x: 0, y: 4)
        }
        .buttonStyle(.pressScale)
        .frame(maxWidth: .infinity)
        .padding(.bottom, Spacing.xl)
    }
}

/// The Tried tab — recipes the viewer has finished cooking.
private struct TriedTab: View {
    let store: MyRecipesStore

    var body: some View {
        Group {
            switch store.triedStatus {
            case .idle, .loading:
                VStack {
                    Spacer()
                    ProgressView().tint(AppColors.primary)
                    Spacer()
                }
            case .failed:
                VStack {
                    Spacer()
                    Text("Could not load your tried recipes.")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                    Spacer()
                }
            case .loaded:
                if store.tried.isEmpty {
                    VStack(spacing: Spacing.sm) {
                        Spacer()
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 30))
                            .foregroundStyle(AppColors.textSecondary)
                        Text("No tries yet").textStyle(.heading)
                        Text("Finish cooking a recipe to add it here.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        libraryGrid {
                            ForEach(store.tried) { tried in
                                TriedCard(tried: tried) {
                                    // TODO(phase-4): push recipe viewer
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                        .padding(.bottom, Spacing.xxxl)
                    }
                    .refreshable { await store.loadTried(force: true) }
                }
            }
        }
        .task { await store.loadTried() }
    }
}

/// The Mine tab — Processing / Needs review / Published / Private sections.
private struct MineSection: View {
    let store: MyRecipesStore
    @Environment(AppRouter.self) private var router

    var body: some View {
        Group {
            switch store.status {
            case .idle, .loading:
                VStack {
                    Spacer()
                    ProgressView().tint(AppColors.primary)
                    Spacer()
                }
            case .failed(let message):
                VStack {
                    Spacer()
                    Text(message).textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                    Spacer()
                }
            case .loaded:
                if sections.isEmpty {
                    VStack(spacing: Spacing.sm) {
                        Spacer()
                        Image(systemName: "book.closed")
                            .font(.system(size: 30))
                            .foregroundStyle(AppColors.textSecondary)
                        Text("Nothing here yet").textStyle(.heading)
                        Text("Tap \"New recipe\" to turn a video into a recipe.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                            .multilineTextAlignment(.center)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(sections) { section in
                                SectionHeading(title: section.title, count: section.items.count)
                                libraryGrid {
                                    ForEach(section.items) { item in
                                        row(item)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, Spacing.xl)
                        .padding(.bottom, Spacing.xxxl)
                    }
                    .refreshable { await store.refresh() }
                }
            }
        }
    }

    private struct Section: Identifiable {
        let title: String
        let items: [Item]
        var id: String { title }
    }

    private enum Item: Identifiable {
        case processing(ProcessingJobDTO)
        case failed(ProcessingJobDTO)
        case review(MyRecipeCardDTO)
        case published(MyRecipeCardDTO)
        case draft(MyRecipeCardDTO)

        var id: String {
            switch self {
            case .processing(let job), .failed(let job): "job:\(job.jobId)"
            case .review(let r), .published(let r), .draft(let r): "rec:\(r.id)"
            }
        }
    }

    private var sections: [Section] {
        guard let data = store.data else { return [] }
        var out: [Section] = []
        let activeJobs = data.processing.filter { $0.status != .failed }
        let failedJobs = data.processing.filter { $0.status == .failed }

        if !activeJobs.isEmpty {
            out.append(Section(title: "Processing", items: activeJobs.map { .processing($0) }))
        }
        if !data.needsReview.isEmpty {
            out.append(Section(title: "Needs your review", items: data.needsReview.map { .review($0) }))
        }
        if !data.published.isEmpty {
            out.append(Section(title: "Published", items: data.published.map { .published($0) }))
        }
        if !data.private.isEmpty {
            out.append(Section(title: "Private drafts", items: data.private.map { .draft($0) }))
        }
        if !failedJobs.isEmpty {
            out.append(Section(title: "Needs attention", items: failedJobs.map { .failed($0) }))
        }
        return out
    }

    @ViewBuilder
    private func row(_ item: Item) -> some View {
        switch item {
        case .processing(let job):
            ProcessingCard(job: job) {
                if let recipeId = job.recipeId {
                    router.recipesPath.append(AppRoute.review(id: recipeId))
                } else {
                    router.recipesPath.append(AppRoute.processing(jobID: job.jobId))
                }
            }
        case .failed(let job):
            FailedCard(job: job) {
                Task { await store.dismissJob(job.jobId) }
            }
        case .review(let recipe):
            NeedsReviewCard(recipe: recipe) {
                router.recipesPath.append(AppRoute.review(id: recipe.id))
            }
        case .published(let recipe):
            PublishedCard(recipe: recipe) {
                router.recipesPath.append(AppRoute.recipe(id: recipe.id))
            }
        case .draft(let recipe):
            PrivateDraftCard(recipe: recipe) {
                router.recipesPath.append(AppRoute.recipe(id: recipe.id))
            }
        }
    }
}
