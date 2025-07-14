import SwiftUI

struct ContentView: View {
    // Get the UserManager from the environment to check the user's state.
    @EnvironmentObject var userManager: UserManager

    var body: some View {
        Group {
            // While the app is checking the user's status, show a loading spinner.
            if userManager.isLoading {
                ProgressView("Checking Status...")
            
            // If there is no auth token, the user is not logged in. Show the LoginView.
            } else if userManager.authToken == nil {
                LoginView()
            
            // If the user is logged in AND has completed onboarding, show the main app.
            } else if userManager.isOnboardingComplete {
                MainTabView()
            
            // Otherwise, the user is logged in but needs to complete onboarding.
            } else {
                OnboardingFlow()
            }
        }.onAppear {
            userManager.checkAuthenticationState()
        }
        // Use animation to make the transitions between views smooth.
        .animation(.easeInOut, value: userManager.isLoading)
        .animation(.easeInOut, value: userManager.authToken)
        .animation(.easeInOut, value: userManager.isOnboardingComplete)
    }
}

#Preview {
    ContentView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .environmentObject(NutritionManager())
}
