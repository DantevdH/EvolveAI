import SwiftUI

// main atribute makes it the first file our app runs
// it creates the main window and injects your shared data managers

protocol NetworkServiceFactory {
    func makeNetworkService() -> NetworkServiceProtocol
}

struct ProductionNetworkServiceFactory: NetworkServiceFactory {
    func makeNetworkService() -> NetworkServiceProtocol {
        NetworkService(baseURL: AppEnvironment.apiBaseURL)
    }
}

@main
struct EvolveAIApp: App {
    @StateObject private var userManager: UserManager
    @StateObject private var workoutManager: WorkoutManager
    @StateObject private var nutritionManager: NutritionManager
    @StateObject private var appViewModel: AppViewModel
    
    // No-argument initializer for SwiftUI
    init() {
        self.init(factory: ProductionNetworkServiceFactory())
    }

    // Dependency injection via factory
    init(factory: NetworkServiceFactory) {
        #if DEBUG
        AppEnvironment.printConfiguration()
        AppEnvironment.initializeDevelopmentScenario()
        #endif
        let service = factory.makeNetworkService()
        let userManager = UserManager(networkService: service)
        let workoutManager = WorkoutManager(networkService: service)
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
