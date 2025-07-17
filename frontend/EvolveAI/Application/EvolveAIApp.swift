import SwiftUI

// main atribute makes it the first file our app runs
// it creates the main window and injects your shared data managers

@main
struct EvolveAIApp: App {
    @StateObject private var userManager = UserManager()
    @StateObject private var workoutManager = WorkoutManager()
    @StateObject private var nutritionManager = NutritionManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView(userManager: userManager)
                .environmentObject(userManager)
                .environmentObject(workoutManager)
                .environmentObject(nutritionManager)
                .preferredColorScheme(.dark)
        }
    }
}
