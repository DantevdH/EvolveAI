import SwiftUI
import Combine

// MARK: - View Model

class MainTabViewModel: ObservableObject {
    
    // 1. A single, robust enum to represent all possible UI states.
    enum ViewState: Equatable {
        // We need Equatable for the animation modifier and for easier testing.
        static func == (lhs: MainTabViewModel.ViewState, rhs: MainTabViewModel.ViewState) -> Bool {
            switch (lhs, rhs) {
            case (.loading, .loading):
                return true
            case (.loaded(let lhsPlan), .loaded(let rhsPlan)):
                return lhsPlan.id == rhsPlan.id // Assuming WorkoutPlan is identifiable
            case (.error(let lhsMessage), .error(let rhsMessage)):
                return lhsMessage == rhsMessage
            default:
                return false
            }
        }
        
        case loading
        case loaded(plan: WorkoutPlan)
        case error(message: String)
    }
    
    @Published private(set) var viewState: ViewState = .loading
    
    // 2. Dependencies are injected for testability and clear ownership.
    private let userManager: UserManager
    private let workoutManager: WorkoutManager
    private var cancellables = Set<AnyCancellable>()
    
    init(userManager: UserManager, workoutManager: WorkoutManager) {
        self.userManager = userManager
        self.workoutManager = workoutManager
        
        // 3. The ViewModel subscribes to changes from the manager.
        setupSubscriptions()
        
        // 4. The ViewModel, not the View, triggers the initial data fetch.
        fetchWorkoutPlan()
    }
    
    // The public interface for the View to trigger a refresh.
    func fetchWorkoutPlan() {
        // Prevent redundant fetches.
        guard viewState != .loading else { return }
        
        guard let authToken = userManager.authToken else {
            self.viewState = .error(message: "Authentication token not found.")
            return
        }
        
        // The ViewModel now controls the loading state.
        self.viewState = .loading
        workoutManager.fetchWorkoutPlan(authToken: authToken)
    }
    
    private func setupSubscriptions() {
        workoutManager.$workoutPlan
            .combineLatest(workoutManager.$isLoading, workoutManager.$errorMessage)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] (plan, isLoading, errorMessage) in
                guard let self = self else { return }
                
                // 5. All presentation logic is now cleanly contained in the ViewModel.
                if isLoading {
                    self.viewState = .loading
                    return
                }
                
                if let errorMessage = errorMessage {
                    self.viewState = .error(message: errorMessage)
                    return
                }
                
                if let plan = plan {
                    self.viewState = .loaded(plan: plan)
                } else {
                    // This case handles when loading is false but there's no plan and no error.
                    self.viewState = .error(message: "Could not load your workout plan.")
                }
            }
            .store(in: &cancellables)
    }
}


// MARK: - View

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
