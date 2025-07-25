import SwiftUI
import Combine

struct InitialiseView: View {
    
    @StateObject private var viewModel: InitialiseViewModel
    
    // These are still needed for views deeper in the hierarchy, like MainTabView.
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    
    // Your app uses this initializer. It takes the real UserManager
    // and creates the ContentViewModel internally.
    init(userManager: UserManager) {
        _viewModel = StateObject(wrappedValue: InitialiseViewModel(userManager: userManager))
    }
    
    #if DEBUG
    init(viewModel: InitialiseViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    #endif
    
    var body: some View {
        Group {
            switch viewModel.viewState {
            case .loading:
                ProgressView("Checking Status...")
            case .loggedOut:
                LoginView()
            case .needsOnboarding:
                OnboardingFlow(
                    userManager: userManager,
                    onComplete: {
                        // userManager.checkAuthenticationState()
                    }
                )
            case .loggedIn:
                MainTabView(userManager: userManager, workoutManager: workoutManager)
            }
        }
        .animation(.easeInOut, value: viewModel.viewState)
    }
}



#Preview("Loading State") {
    let viewModel = InitialiseViewModel(forPreviewing: .loading)
    InitialiseView(viewModel: viewModel)
        // Provide dummy managers for any child views that might need them.
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
}

#Preview("Logged Out State") {
    let viewModel = InitialiseViewModel(forPreviewing: .loggedOut)
    InitialiseView(viewModel: viewModel)
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
}

#Preview("Needs Onboarding State") {
    let viewModel = InitialiseViewModel(forPreviewing: .needsOnboarding)
    InitialiseView(viewModel: viewModel)
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
}

#Preview("Logged In State") {
    let viewModel = InitialiseViewModel(forPreviewing: .loggedIn)
    InitialiseView(viewModel: viewModel)
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
}
