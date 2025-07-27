//
//  AppIntegrationTests.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//

import XCTest
import Combine
import SwiftUI
@testable import EvolveAI

// MARK: - Mock App Environment
class MockAppEnvironment {
    static var currentScenario: MockScenario = .newUser
    
    static func setScenario(_ scenario: MockScenario) {
        currentScenario = scenario
    }
}

// MARK: - Mock Network Service for Testing
class TestNetworkService: NetworkServiceProtocol {
    let scenario: String
    
    init(scenario: String) {
        self.scenario = scenario
    }
    
    func getAuthToken() -> String? {
        switch scenario {
        case "new-user":
            // New user starts with no token
            return nil
        case "existing-user", "onboarded-user", "user-with-plan", "network-error":
            // All other scenarios start with a token
            return "test-token"
        default:
            return "test-token"
        }
    }
    
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success("test-token"))
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        DispatchQueue.main.async {
            switch self.scenario {
            case "new-user", "existing-user":
                completion(.failure(NSError(domain: "TestNetworkService", code: 404, userInfo: [NSLocalizedDescriptionKey: "User not found"])))
            case "onboarded-user", "user-with-plan":
                completion(.success(mockUserProfile))
            case "network-error":
                completion(.failure(NSError(domain: "TestNetworkService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Network error"])))
            default:
                completion(.success(mockUserProfile))
            }
        }
    }
    
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(()))
        }
    }
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(mockCoaches))
        }
    }
    
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            switch self.scenario {
            case "new-user", "existing-user", "onboarded-user":
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            case "user-with-plan":
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            case "network-error":
                completion(.failure(NSError(domain: "TestNetworkService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Network error"])))
            default:
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            }
        }
    }
    
    func fetchExistingPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            switch self.scenario {
            case "new-user", "existing-user", "onboarded-user":
                completion(.failure(NSError(domain: "TestNetworkService", code: 404, userInfo: [NSLocalizedDescriptionKey: "No workout plan found"])))
            case "user-with-plan":
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            case "network-error":
                completion(.failure(NSError(domain: "TestNetworkService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Network error"])))
            default:
                completion(.failure(NSError(domain: "TestNetworkService", code: 404, userInfo: [NSLocalizedDescriptionKey: "No workout plan found"])))
            }
        }
    }
    
    func updateProgress(updates: [ExerciseProgressUpdate], authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(()))
        }
    }
    
    func setScenario(_ scenario: String, completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(()))
        }
    }
}

// MARK: - App Integration Tests
final class AppIntegrationTests: XCTestCase {
    
    private var appViewModel: AppViewModel!
    private var userManager: UserManager!
    private var workoutManager: WorkoutManager!
    private var networkService: TestNetworkService!
    private var cancellables: Set<AnyCancellable>!
    
    override func setUp() {
        super.setUp()
        cancellables = []
    }
    
    override func tearDown() {
        appViewModel = nil
        userManager = nil
        workoutManager = nil
        networkService = nil
        cancellables = nil
        super.tearDown()
    }
    
    // MARK: - Helper Methods
    
    private func setupAppWithScenario(_ scenario: String) {
        networkService = TestNetworkService(scenario: scenario)
        userManager = UserManager(networkService: networkService)
        workoutManager = WorkoutManager(networkService: networkService)
        appViewModel = AppViewModel(userManager: userManager, workoutManager: workoutManager)
    }
    
    private func waitForState(_ expectedState: AppViewModel.AppState, timeout: TimeInterval = 2.0) -> XCTestExpectation {
        let expectation = XCTestExpectation(description: "App should reach state: \(expectedState)")
        
        appViewModel.$state
            .dropFirst() // Skip initial state
            .sink { state in
                if state == expectedState {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        return expectation
    }
    
    // MARK: - Scenario Tests
    
    func test_newUserScenario_landsOnLoginView() {
        // Given: New user scenario
        setupAppWithScenario("new-user")
        
        // When: App initializes
        let expectation = waitForState(.loggedOut)
        
        // Then: Should land on login view
        wait(for: [expectation], timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .loggedOut)
    }
    
    func test_existingUserNotOnboardedScenario_landsOnOnboarding() {
        // Given: Existing user not onboarded scenario
        setupAppWithScenario("existing-user")
        
        // When: App initializes
        let expectation = waitForState(.needsOnboarding)
        
        // Then: Should land on onboarding
        wait(for: [expectation], timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .needsOnboarding)
    }
    
    func test_onboardedUserScenario_landsOnGeneratePlanView() {
        // Given: Onboarded user scenario (has profile, no plan)
        setupAppWithScenario("onboarded-user")
        
        // When: App initializes
        let expectation = waitForState(.needsPlan)
        
        // Then: Should land on generate plan view
        wait(for: [expectation], timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
    }
    
    func test_userWithPlanScenario_landsOnMainApp() {
        // Given: User with plan scenario
        setupAppWithScenario("user-with-plan")
        
        // When: App initializes
        let expectation = waitForState(.loaded(plan: mockWorkoutPlan))
        
        // Then: Should land on main app with plan
        wait(for: [expectation], timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
    
    func test_networkErrorScenario_landsOnErrorView() {
        // Given: Network error scenario
        setupAppWithScenario("network-error")
        
        // When: App initializes
        let expectation = waitForState(.error(message: "Network error"))
        
        // Then: Should land on error view
        wait(for: [expectation], timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .error(message: "Network error"))
    }
    
    // MARK: - State Transition Tests
    
    func test_newUserToOnboardingTransition() {
        // Given: New user scenario
        setupAppWithScenario(.newUser)
        
        // When: User logs in successfully
        let loginExpectation = XCTestExpectation(description: "Should show redirect delay")
        let onboardingExpectation = XCTestExpectation(description: "Should transition to onboarding")
        
        appViewModel.$showRedirectDelay
            .dropFirst()
            .sink { showDelay in
                if showDelay {
                    loginExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        appViewModel.$state
            .dropFirst()
            .sink { state in
                if state == .needsOnboarding {
                    onboardingExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // Simulate login
        userManager.login(username: "test", password: "test")
        
        // Then: Should show redirect delay then onboarding
        wait(for: [loginExpectation, onboardingExpectation], timeout: 3.0)
    }
    
    func test_onboardingToMainAppTransition() {
        // Given: Onboarded user scenario
        setupAppWithScenario(.onboardedUser)
        
        // When: Plan is generated
        let planGenerationExpectation = XCTestExpectation(description: "Should generate plan")
        let mainAppExpectation = XCTestExpectation(description: "Should transition to main app")
        
        workoutManager.$workoutPlanResponse
            .dropFirst()
            .sink { response in
                if response != nil {
                    planGenerationExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        appViewModel.$state
            .dropFirst()
            .sink { state in
                if case .loaded = state {
                    mainAppExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // Simulate plan generation
        appViewModel.generatePlanForUser(authToken: "test-token") { _ in }
        
        // Then: Should generate plan and go to main app
        wait(for: [planGenerationExpectation, mainAppExpectation], timeout: 3.0)
    }
    
    // MARK: - Error Handling Tests
    
    func test_planGenerationFailure_showsError() {
        // Given: Network error scenario
        setupAppWithScenario(.networkError)
        
        // When: Trying to generate plan
        let errorExpectation = XCTestExpectation(description: "Should show error")
        
        appViewModel.$state
            .dropFirst()
            .sink { state in
                if case .error = state {
                    errorExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        appViewModel.generatePlanForUser(authToken: "test-token") { _ in }
        
        // Then: Should show error
        wait(for: [errorExpectation], timeout: 2.0)
    }
    
    // MARK: - User Manager Integration Tests
    
    func test_userManagerStateReflectsInAppViewModel() {
        // Given: New user scenario
        setupAppWithScenario(.newUser)
        
        // When: User manager state changes
        let stateChangeExpectation = XCTestExpectation(description: "App state should reflect user manager state")
        
        appViewModel.$state
            .dropFirst()
            .sink { state in
                if state == .loggedOut {
                    stateChangeExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // Then: App state should reflect user manager state
        wait(for: [stateChangeExpectation], timeout: 2.0)
        XCTAssertEqual(userManager.authToken, nil)
        XCTAssertEqual(appViewModel.state, .loggedOut)
    }
    
    // MARK: - Workout Manager Integration Tests
    
    func test_workoutManagerPlanReflectsInAppViewModel() {
        // Given: User with plan scenario
        setupAppWithScenario(.userWithPlan)
        
        // When: Workout manager has plan
        let planLoadedExpectation = XCTestExpectation(description: "App should load with plan")
        
        appViewModel.$state
            .dropFirst()
            .sink { state in
                if case .loaded = state {
                    planLoadedExpectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // Then: App should be in loaded state with plan
        wait(for: [planLoadedExpectation], timeout: 2.0)
        XCTAssertNotNil(workoutManager.workoutPlan)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
} 