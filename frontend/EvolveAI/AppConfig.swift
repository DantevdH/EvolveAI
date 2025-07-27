import SwiftUI

enum AppEnvironment {
    // MARK: - Configuration
    static let delayTime: TimeInterval = 3
    
    // MARK: - API Configuration
    static let apiBaseURL: String = {
        #if DEBUG
        return "http://localhost:8000/api"  // Local Django backend
        #else
        return "https://api.evolveai.com/api"  // Production
        #endif
    }()
    
    // MARK: - Network Service
    static let networkService: NetworkServiceProtocol = NetworkService(baseURL: apiBaseURL)
    
    // MARK: - Development Scenario Management
    #if DEBUG
    /// Call this at app launch to set the scenario on the backend before any other API calls.
    static func initializeDevelopmentScenario(completion: @escaping (Bool) -> Void = { _ in }) {
        let arguments = ProcessInfo.processInfo.arguments
        let scenario = arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "new-user"
        print("LAUNCH ARGUMENTS: \(arguments)")
        print("DETECTED SCENARIO: \(scenario)")
        print("Development scenario detected: \(scenario)")
        print("Setting backend scenario to: \(scenario)")
        networkService.setScenarioIfNeeded { success in
            if success {
                print("[AppConfig] Scenario set successfully on backend.")
            } else {
                print("[AppConfig] Failed to set scenario on backend.")
            }
            completion(success)
        }
    }
    #endif
    
    // MARK: - Debug Helpers
    static func printConfiguration() {
        let arguments = ProcessInfo.processInfo.arguments
        let chosenScenario = arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "none"
        
        print("=== App Configuration ===")
        print("API Base URL: \(apiBaseURL)")
        print("Available scenarios: --scenario-new-user, --scenario-existing-user, --scenario-onboarded-user, --scenario-user-with-plan, --scenario-network-error")
        print("Chosen scenario: \(chosenScenario)")
        print("=========================")
    }
}
