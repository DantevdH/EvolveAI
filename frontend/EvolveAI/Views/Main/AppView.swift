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
                workoutManager: appViewModel.workoutManager,
                onComplete: {
                }
            )
        case .loaded(let plan):
            MainTabView(plan: plan)
        case .needsPlan:
            GeneratePlanView(
                userProfile: appViewModel.userManager.userProfile ?? UserProfile(),
                coach: appViewModel.workoutManager.selectedCoach,
                generatePlan: { completion in
                    appViewModel.generatePlanForUser(authToken: appViewModel.userManager.authToken ?? "") { success in
                        completion(success)
                    }
                }
            )
        case .error(let message, let canRetry, _):
            ErrorView(
                message: message, 
                canRetry: canRetry,
                retryAction: { 
                    if canRetry {
                        appViewModel.retryFromError()
                    } else {
                        // Force restart the app flow
                        appViewModel.logout()
                    }
                }
            )
        }
    }
}

