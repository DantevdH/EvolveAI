import SwiftUI

// pages are shown in ContectView. This is the route or a traffic controller

struct ContentView: View {
    @EnvironmentObject var userManager: UserManager
    
    var body: some View {
        Group {
            if userManager.isOnboardingComplete {
                MainTabView()
            } else {
                OnboardingFlow()
            }
        }
        .animation(.easeInOut(duration: 0.5), value: userManager.isOnboardingComplete)
    }
}

#Preview {
    ContentView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .environmentObject(NutritionManager())
}
