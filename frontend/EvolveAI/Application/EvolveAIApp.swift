import SwiftUI

// main atribute makes it the first file our app runs
// it creates the main window and injects your shared data managers

@main
struct EvolveAIApp: App {
    @StateObject private var userManager = UserManager()
    @StateObject private var workoutManager = WorkoutManager()
    @StateObject private var nutritionManager = NutritionManager()
    @StateObject private var appViewModel: AppViewModel
    
    init() {
        let userManager = UserManager()
        let workoutManager = WorkoutManager()
        _userManager = StateObject(wrappedValue: userManager)
        _workoutManager = StateObject(wrappedValue: workoutManager)
        _nutritionManager = StateObject(wrappedValue: NutritionManager())
        _appViewModel = StateObject(wrappedValue: AppViewModel(userManager: userManager, workoutManager: workoutManager))
    }
    
    var body: some Scene {
        WindowGroup {
            AppView(appViewModel: appViewModel)
                .environmentObject(nutritionManager)
                .preferredColorScheme(.dark)
        }
    }
}
