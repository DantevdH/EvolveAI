import Foundation

enum AppEnvironment {
    /// Set this to true to use mock network service, false for real backend
    static var useMockNetwork: Bool {
        #if DEBUG
        // You can also use UserDefaults or a launch argument for runtime toggling
        return true // Change to false to use real backend in debug
        #else
        return false
        #endif
    }
    
    static var networkService: NetworkServiceProtocol {
        useMockNetwork ? MockNetworkService() : NetworkService()
    }
} 