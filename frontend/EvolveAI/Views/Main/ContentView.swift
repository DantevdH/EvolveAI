import SwiftUI
import Combine

// The ViewModel orchestrates the view's state.
class ContentViewModel: ObservableObject {
    
    // 1. A single, clear enum to represent all possible UI states.
    enum ViewState: Equatable {
        case loading
        case loggedOut
        case needsOnboarding
        case loggedIn
    }
    
    // 2. A single @Published property for the View to observe.
    @Published private(set) var viewState: ViewState = .loading
    
    private var cancellables = Set<AnyCancellable>()
    
    // 3. UserManager is injected for better testability and clear dependencies.
    init(userManager: UserManager) {
        setupSubscriptions(userManager: userManager)
        
        // 4. The ViewModel, not the View, triggers the initial data fetch.
        userManager.checkAuthenticationState()
    }
    
    private func setupSubscriptions(userManager: UserManager) {
        // 5. Use Combine to react to changes from the UserManager.
        // This pipeline transforms the raw state into our clean ViewState enum.
        userManager.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self = self else { return }
                
                // The presentation logic now lives entirely within the ViewModel.
                if userManager.isLoading {
                    self.viewState = .loading
                } else if userManager.authToken == nil {
                    self.viewState = .loggedOut
                } else if !userManager.isOnboardingComplete {
                    self.viewState = .needsOnboarding
                } else {
                    self.viewState = .loggedIn
                }
            }
            .store(in: &cancellables)
    }
}

// The View is now "dumb" and only reflects the ViewModel's state.
struct ContentView: View {
    
    @StateObject private var viewModel: ContentViewModel
    
    // FIX: Fetch the managers from the environment to pass them to MainTabView.
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    
    // Initialize the View with its ViewModel.
    // In a real app, the UserManager would be passed from a higher-level coordinator or SceneDelegate.
    init(userManager: UserManager) {
        _viewModel = StateObject(wrappedValue: ContentViewModel(userManager: userManager))
    }
    
    var body: some View {
        Group {
            // 6. A switch statement is cleaner and less error-prone than if/else chains.
            switch viewModel.viewState {
            case .loading:
                ProgressView("Checking Status...")
            case .loggedOut:
                LoginView()
            case .needsOnboarding:
                OnboardingFlow()
            case .loggedIn:
                // FIX: Inject the required dependencies into MainTabView.
                MainTabView(userManager: userManager, workoutManager: workoutManager)
            }
        }
        // 7. A single animation modifier tied to the single source of truth.
        .animation(.easeInOut, value: viewModel.viewState)
    }
}

#Preview {
    // The preview setup now mirrors the app's dependency injection.
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    
    return ContentView(userManager: userManager)
        // EnvironmentObjects are still provided for any nested views that need them.
        .environmentObject(userManager)
        .environmentObject(workoutManager)
        .environmentObject(NutritionManager())
}
