import SwiftUI
import GoogleSignIn
import FBSDKLoginKit

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
     @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
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
        
        // Initialize Google Sign-In
        guard let clientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String else {
            fatalError("GIDClientID not found in Info.plist")
        }
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        // Restore previous sign-in state
        GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
            if let error = error {
                print("Google Sign-In restore error: \(error)")
            }
        }
        
        let service = factory.makeNetworkService()
        let userManager = UserManager()
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
