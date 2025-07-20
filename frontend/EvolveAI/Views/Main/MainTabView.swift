import SwiftUI
import Combine

struct MainTabView: View {
    
    // The View holds the ViewModel as its single source of truth for state.
    @StateObject private var viewModel: MainTabViewModel
    
    // The selected tab is pure UI state, so @State is appropriate here.
    @State private var selectedTab = 0
    
    // 6. The View's initializer is now responsible for dependency injection.
    init(userManager: UserManager, workoutManager: WorkoutManager) {
        _viewModel = StateObject(wrappedValue: MainTabViewModel(
            userManager: userManager,
            workoutManager: workoutManager
        ))
    }
    
    var body: some View {
        Group {
            // 7. The View is now a simple "renderer" for the ViewModel's state.
            switch viewModel.viewState {
            case .loading:
                ProgressView("Loading Your Plan...")
                
            case .loaded(let plan):
                // The TabView is now the top-level view in the loaded state.
                // The problematic NavigationView has been removed.
                TabView(selection: $selectedTab) {
                    DashboardView()
                        .tabItem {
                            Label("Dashboard", systemImage: "house.fill")
                        }
                        .tag(0)
                    
                    WorkoutView(plan: plan)
                        .tabItem {
                            Label("Workout", systemImage: "figure.strengthtraining.functional")
                        }
                        .tag(1)
                    
                    NutritionView()
                        .tabItem {
                            Label("Nutrition", systemImage: "leaf.fill")
                        }
                        .tag(2)
                }
                .accentColor(Color.evolvePrimary) // Use your app's color
                
            case .error(let message):
                ErrorView(message: message, retryAction: {
                    viewModel.fetchWorkoutPlan()
                })
            }
        }
        .animation(.easeInOut, value: viewModel.viewState)
    }
}


#Preview("Loaded State") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    workoutManager.workoutPlan = mockWorkoutPlan
    workoutManager.isLoading = false
    
    return MainTabView(userManager: userManager, workoutManager: workoutManager)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
}

#Preview("Error State") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    workoutManager.isLoading = false
    workoutManager.errorMessage = "Network connection timed out."
    
    return MainTabView(userManager: userManager, workoutManager: workoutManager)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
}

#Preview("Loading State") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    workoutManager.isLoading = true
    
    return MainTabView(userManager: userManager, workoutManager: workoutManager)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
}
