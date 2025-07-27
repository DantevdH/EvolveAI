import SwiftUI

enum AppEnvironment {
    // MARK: - Configuration
    static let delayTime: TimeInterval = 3
    
    // MARK: - Environment Configuration
    #if DEBUG
    // Use environment variables or launch arguments for different scenarios
    static let mockScenario: MockScenario = {
        // Check for launch arguments first
        if ProcessInfo.processInfo.arguments.contains("--mock-new-user") {
            return .newUser
        } else if ProcessInfo.processInfo.arguments.contains("--mock-existing-user") {
            return .existingUserNotOnboarded
        } else if ProcessInfo.processInfo.arguments.contains("--mock-onboarded-user") {
            return .onboardedUser
        } else if ProcessInfo.processInfo.arguments.contains("--mock-user-with-plan") {
            return .userWithPlan
        } else if ProcessInfo.processInfo.arguments.contains("--mock-network-error") {
            return .networkError
        }
        
        // Default scenario
        return .userWithPlan
    }()
    #else
    static let mockScenario: MockScenario = .newUser
    #endif
    
    // MARK: - Network Service
    static let networkService: NetworkServiceProtocol = {
        #if DEBUG
        return MockNetworkService()
        #else
        return NetworkService()
        #endif
    }()
    
    // MARK: - Debug Helpers
    static func printConfiguration() {
        print("=== App Configuration ===")
        print("Mock Scenario: \(mockScenario)")
        print("Delay Time: \(delayTime)s")
        print("Available scenarios: --mock-new-user, --mock-existing-user, --mock-onboarded-user, --mock-user-with-plan, --mock-network-error")
        print("=========================")
    }
}

// MARK: - Mock Scenarios
enum MockScenario: String, CaseIterable {
    case newUser = "new-user"
    case existingUserNotOnboarded = "existing-user" 
    case onboardedUser = "onboarded-user"
    case userWithPlan = "user-with-plan"
    case networkError = "network-error"
    
    var description: String {
        switch self {
        case .newUser:
            return "New user (no profile, needs onboarding)"
        case .existingUserNotOnboarded:
            return "Existing user (has profile, needs plan)"
        case .onboardedUser:
            return "Onboarded user (has profile, no plan)"
        case .userWithPlan:
            return "User with plan (complete flow)"
        case .networkError:
            return "Network error simulation"
        }
    }
}
