//
//  TestUtilities.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//

import XCTest
import Combine
import SwiftUI
@testable import EvolveAI

/**
 * This file contains shared test utilities, mock data, and helper classes
 * that are used across all test files in the EvolveAI test suite.
 * 
 * WHAT THIS FILE CONTAINS:
 * - Mock scenario definitions for different test scenarios
 * - Stub manager classes that simulate real manager behavior
 * - Common test helper methods and utilities
 * - Shared setup and teardown logic
 * - Reusable test infrastructure components
 * 
 * This file serves as the foundation for all tests, providing
 * consistent mocking, setup, and utility functions to ensure
 * tests are reliable, maintainable, and easy to write.
 */

// MARK: - Mock Data
public let mockUserProfile = UserProfile(
    userId: UUID(),
    username: "TestUser",
    primaryGoal: "Increase Strength",
    primaryGoalDescription: "Build muscle and strength",
    coachId: 1,
    experienceLevel: "intermediate",
    daysPerWeek: 4,
    minutesPerSession: 60,
    equipment: "Full Gym",
    age: 25,
    weight: 75.0,
    weightUnit: "kg",
    height: 180.0,
    heightUnit: "cm",
    gender: "Male",
    hasLimitations: false,
    limitationsDescription: "",
    finalChatNotes: "Ready to start training!"
)

public let mockWorkoutPlan = WorkoutPlan(
    id: 1,
    userProfileId: 1,
    title: "Test Strength Plan",
    summary: "A comprehensive strength training program",
    createdAt: Date(),
    updatedAt: Date()
)

public let mockCompleteWorkoutPlan = CompleteWorkoutPlan(
    workoutPlan: mockWorkoutPlan,
    weeklySchedules: [],
    dailyWorkouts: [],
    workoutExercises: [],
    exercises: []
)

public let mockCoaches = [
    Coach(
        id: 1,
        name: "Coach Mike",
        goal: "Increase Strength",
        iconName: "dumbbell.fill",
        tagline: "Strength is the foundation of everything",
        primaryColorHex: "#FF6B35",
        createdAt: Date(),
        updatedAt: Date()
    ),
    Coach(
        id: 2,
        name: "Coach Sarah",
        goal: "Weight Loss",
        iconName: "heart.fill",
        tagline: "Transform your body, transform your life",
        primaryColorHex: "#4ECDC4",
        createdAt: Date(),
        updatedAt: Date()
    )
]

// MARK: - Mock Scenario Enum
public enum MockScenario: String {
    case newUser = "new-user"
    case existingUser = "existing-user"
    case onboardedUser = "onboarded-user"
    case userWithPlan = "user-with-plan"
    case networkError = "network-error"
}

// MARK: - Stub Managers
public final class StubWorkoutManager: WorkoutManager {
    public var scenario: MockScenario // Make scenario mutable for testing
    private let delay: TimeInterval

    public init(scenario: MockScenario, delay: TimeInterval = 0.01) {
        self.scenario = scenario
        self.delay = delay
        super.init()
    }

    public override func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            self.isCoachesLoading = false
            self.coaches = mockCoaches
            self.selectedCoach = mockCoaches.first { $0.goal == userGoal } ?? mockCoaches.first
            completion(self.selectedCoach != nil)
        }
    }

    public override func fetchExistingPlan(userProfileId: Int?, completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            switch self.scenario {
            case .userWithPlan:
                self.workoutPlan = mockWorkoutPlan
                self.completeWorkoutPlan = mockCompleteWorkoutPlan
                self.isLoading = false
                completion(true)
            case .networkError:
                self.isLoading = false
                self.errorMessage = "A network error occurred. Please try again."
                completion(false)
            default:
                self.isLoading = false
                self.workoutPlan = nil
                completion(false)
            }
        }
    }

    public override func createAndProvidePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            switch self.scenario {
            case .networkError:
                self.isLoading = false
                self.errorMessage = "A network error occurred. Please try again."
                completion(false)
            default:
                self.workoutPlan = mockWorkoutPlan
                self.completeWorkoutPlan = mockCompleteWorkoutPlan
                self.isLoading = false
                completion(true)
            }
        }
    }
}

public final class StubUserManager: UserManager {
    public override init() {
        super.init()
    }

    public func setAuthToken(_ token: String?) {
        self.authToken = token
    }

    public func setUserProfile(_ profile: UserProfile?) {
        self.userProfile = profile
    }
}

// MARK: - Test Helpers
public extension XCTestCase {
    /// Waits for the app state to settle (no changes for 0.1 seconds) and returns the final state
    func waitForStateToSettle(_ appViewModel: AppViewModel, timeout: TimeInterval = 2.0, file: StaticString = #filePath, line: UInt = #line) -> AppViewModel.AppState {
        let exp = expectation(description: "State should settle")
        var cancellables = Set<AnyCancellable>()
        var lastState = appViewModel.state
        var stateChangeCount = 0
        
        print("🔍 [TEST] Starting state: \(lastState)")
        
        appViewModel.$state
            .sink { state in
                if state != lastState {
                    print("🔍 [TEST] State changed from \(lastState) to \(state)")
                    lastState = state
                    stateChangeCount += 1
                }
            }
            .store(in: &cancellables)
        
        // Wait for state to settle (no changes for 0.1 seconds)
        let settleTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            if stateChangeCount == 0 {
                exp.fulfill()
            }
            stateChangeCount = 0
        }
        
        wait(for: [exp], timeout: timeout)
        settleTimer.invalidate()
        
        print("🔍 [TEST] Final settled state: \(lastState)")
        return lastState
    }

    /// Waits until a condition is satisfied, checking every 0.02 seconds
    func waitUntil(_ condition: @escaping () -> Bool, timeout: TimeInterval = 2.0, file: StaticString = #filePath, line: UInt = #line) {
        let exp = expectation(description: "Condition satisfied")
        let check = {
            if condition() { exp.fulfill() }
        }
        check()
        let timer = Timer.scheduledTimer(withTimeInterval: 0.02, repeats: true) { _ in check() }
        wait(for: [exp], timeout: timeout)
        timer.invalidate()
    }
    
    /// Sets up a test app with the specified scenario and returns all necessary components
    func setupApp(scenario: MockScenario) -> (AppViewModel, StubUserManager, StubWorkoutManager) {
        let userManager = StubUserManager()
        let workoutManager = StubWorkoutManager(scenario: scenario)
        let appViewModel = AppViewModel(userManager: userManager, workoutManager: workoutManager)
        
        // Wait a bit for initial state to settle
        let initialExp = expectation(description: "Initial state settled")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            initialExp.fulfill()
        }
        wait(for: [initialExp], timeout: 1.0)
        
        return (appViewModel, userManager, workoutManager)
    }
} 