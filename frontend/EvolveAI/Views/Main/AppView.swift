import SwiftUI

struct AppView: View {
    @StateObject var appViewModel: AppViewModel
    
    var body: some View {
        content
            .environmentObject(appViewModel)
            .environmentObject(appViewModel.userManager)
            .environmentObject(appViewModel.workoutManager)
    }

    @ViewBuilder
    private var content: some View {
        switch appViewModel.state {
        case .loading:
            StartLoadingView()
        case .loggedOut:
            LoginView()
        case .needsOnboarding:
            OnboardingFlow(
                userManager: appViewModel.userManager,
                onComplete: {
                    appViewModel.userManager.checkAuthenticationState()
                }
            )
        case .loaded(let plan):
            MainTabView(plan: plan)
        case .needsPlan:
            Text("No plan found")
        case .error(let message):
            ErrorView(message: message, retryAction: { appViewModel.fetchCoachesAndPlanIfNeeded() })
        }
    }
}

