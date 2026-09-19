import SwiftUI

/// Routes pushed inside the protected app's navigation stacks.
enum AppRoute: Hashable {
    case recipe(id: String)
    case review(id: String)
    case processing(jobID: String)
    case newRecipe
    case uploadVideo
    case youtubeImport
    case youtubeConnect
    case youtubeUploads
    case comingSoon
}

/// Programmatic navigation for the tab stacks (card taps → review/processing).
@Observable
@MainActor
final class AppRouter {
    var recipesPath = NavigationPath()
    var selectedTab: Tab = .home

    enum Tab: Hashable {
        case home, explore, myRecipes, profile
    }
}

/// The protected app — native UITabBar with the four primary tabs.
/// Mirrors app/(protected)/(tabs)/_layout.tsx.
struct MainTabView: View {
    @Environment(SessionStore.self) private var session
    @State private var router = AppRouter()

    var body: some View {
        TabView(selection: $router.selectedTab) {
            NavigationStack {
                HomeView()
                    .navigationDestination(for: AppRoute.self) { route in
                        destination(for: route)
                    }
            }
            .tabItem { Label("Home", systemImage: "house") }
            .tag(AppRouter.Tab.home)

            NavigationStack {
                ExploreView()
                    .navigationDestination(for: AppRoute.self) { route in
                        destination(for: route)
                    }
            }
            .tabItem { Label("Explore", systemImage: "safari") }
            .tag(AppRouter.Tab.explore)

            NavigationStack(path: $router.recipesPath) {
                MyRecipesView()
                    .navigationDestination(for: AppRoute.self) { route in
                        destination(for: route)
                    }
            }
            .tabItem { Label("My Recipes", systemImage: "book.closed") }
            .tag(AppRouter.Tab.myRecipes)

            NavigationStack {
                ProfileView()
            }
            .tabItem { Label("Profile", systemImage: "person.crop.circle") }
            .tag(AppRouter.Tab.profile)
        }
        .environment(router)
        .task { registerGlobalVoiceActions() }
    }

    @ViewBuilder
    private func destination(for route: AppRoute) -> some View {
        switch route {
        case .recipe(let id):
            RecipeDetailView(recipeId: id)
        case .review(let id):
            ReviewView(recipeId: id)
        case .processing(let jobID):
            ProcessingView(jobId: jobID)
        case .newRecipe:
            NewRecipeView()
        case .uploadVideo:
            UploadRecipeView()
        case .youtubeImport:
            YouTubeImportView()
        case .youtubeConnect:
            YouTubeConnectView()
        case .youtubeUploads:
            YouTubeUploadsView()
        case .comingSoon:
            ComingSoonView()
        }
    }

    /// App-wide actions available on every screen (global-actions.ts). Screens add
    /// richer, context-specific actions on top via their own registrations.
    private func registerGlobalVoiceActions() {
        let assistant = VoiceAssistant.shared
        assistant.store.registerActions("__global__", [
            VoiceAction(
                name: "go_back",
                description: "Go back to the previous screen.",
            ) { _ in
                if !router.recipesPath.isEmpty {
                    router.recipesPath.removeLast()
                }
                return nil
            },
            VoiceAction(
                name: "navigate_home",
                description: "Go to the Home feed of recipes.",
            ) { _ in
                router.recipesPath = NavigationPath()
                router.selectedTab = .home
                return nil
            },
            VoiceAction(
                name: "navigate_explore",
                description: "Open Explore to search for recipes and cooks.",
            ) { _ in
                router.selectedTab = .explore
                return nil
            },
            VoiceAction(
                name: "navigate_my_recipes",
                description: "Open the user's own and saved recipes.",
            ) { _ in
                router.selectedTab = .myRecipes
                return nil
            },
        ])
    }
}
