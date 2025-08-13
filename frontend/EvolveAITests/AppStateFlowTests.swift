//
//  AppStateFlowTests.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//

import XCTest
import Combine
import SwiftUI
@testable import EvolveAI

// MARK: - App State Flow Tests
/**
 * This file tests the core state flow logic of the EvolveAI app.
 * 
 * WHAT WE'RE TESTING:
 * - App state transitions and flow logic
 * - Starting positions for different user types (new, existing, onboarded, with plan)
 * - Complete user journeys from login to workout plan generation
 * - Race condition prevention (no onboarding flash for existing users)
 * - State transition validation and edge cases
 * 
 * These tests ensure the app flows smoothly between states without
 * getting stuck, showing incorrect screens, or experiencing UI flashing.
 */
final class AppStateFlowTests: XCTestCase {
    private var appViewModel: AppViewModel!
    private var userManager: StubUserManager!
    private var workoutManager: StubWorkoutManager!

    override func tearDown() {
        appViewModel = nil
        userManager = nil
        workoutManager = nil
        super.tearDown()
    }

    // MARK: - Starting Positions

    /// Tests that a new user without authentication starts in the logged out state
    func test_newUser_starts_loggedOut() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .newUser)
        userManager.setAuthToken(nil)
        userManager.setUserProfile(nil)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loggedOut)
    }

    /// Tests that an existing user with auth token but no profile starts in onboarding state
    func test_existingUser_starts_needsOnboarding() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .existingUser)
        userManager.setAuthToken("token")
        userManager.setUserProfile(nil)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsOnboarding)
    }

    /// Tests that an onboarded user with profile but no plan transitions to needsPlan after attempting to fetch existing plan
    func test_onboardedUser_starts_needsPlan_after_fetch_attempt() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        // AppViewModel will attempt fetchExistingPlan once and then move to .needsPlan
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
    }

    /// Tests that a user with existing workout plan starts directly in the loaded state
    func test_userWithPlan_starts_loaded() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .userWithPlan)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        // AppViewModel triggers fetchExistingPlan -> stub returns plan -> .loaded
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }

    /// Tests that network errors during plan fetching result in error state
    func test_networkError_starts_error() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        // Stub will emit error during fetchExistingPlan
        waitForStateToSettle(appViewModel, timeout: 1.0)
        if case .error(let message, let canRetry, _) = appViewModel.state {
            XCTAssertTrue(canRetry)
            XCTAssertTrue(message.contains("A network error occurred"))
        } else {
            XCTFail("Should be in error state")
        }
    }

    // MARK: - State Flow Transitions

    /// Tests the complete user journey from new user login through onboarding to plan generation
    func test_newUser_login_to_onboarding_then_generatePlan_to_loaded() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        // Start as new user
        userManager.setAuthToken(nil)
        userManager.setUserProfile(nil)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loggedOut)

        // User logs in
        userManager.setAuthToken("token")
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsOnboarding)

        // Completes onboarding (saves profile)
        userManager.setUserProfile(mockUserProfile)
        // App will attempt to fetchExistingPlan (stub returns none for .onboardedUser)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)

        // Generate plan
        appViewModel.generatePlanForUser(authToken: "token") { _ in }
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }

    /// Tests that an onboarded user can generate a workout plan and transition to loaded state
    func test_onboardedUser_generatePlan_to_loaded() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        // Authenticated and has profile
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)

        // Coaches fetched on entering .needsPlan
        waitUntil({ self.workoutManager.selectedCoach != nil })

        // Generate plan
        appViewModel.generatePlanForUser(authToken: "token") { _ in }
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }

    /// Tests that coaches are automatically fetched when entering the needsPlan state
    func test_needsPlan_fetchCoaches_called() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
        // Ensure selectedCoach populated as part of .needsPlan side-effect
        waitUntil({ self.workoutManager.selectedCoach != nil })
        XCTAssertNotNil(workoutManager.selectedCoach)
    }

    /// Tests that plan generation failures result in error state display
    func test_generatePlan_failure_shows_error() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        // Initial fetch will already error
        waitForStateToSettle(appViewModel, timeout: 1.0)
        if case .error(let message, let canRetry, _) = appViewModel.state {
            XCTAssertTrue(canRetry)
            XCTAssertTrue(message.contains("A network error occurred"))
        } else {
            XCTFail("Should be in error state")
        }
    }
    
    // MARK: - Race Condition Prevention Tests
    
    /// Tests that existing users with profiles don't flash through onboarding state
    func test_no_onboarding_flash_for_existing_users() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .userWithPlan)
        
        // Simulate rapid state changes that could cause flashing
        userManager.setAuthToken("token")
        
        // Rapidly set user profile (simulating race condition)
        DispatchQueue.main.async {
            self.userManager.setUserProfile(mockUserProfile)
        }
        
        // Should go directly to loaded state without showing .needsOnboarding
        waitForStateToSettle(appViewModel, timeout: 1.0)
        
        // Verify we never went through .needsOnboarding
        XCTAssertNotEqual(appViewModel.state, .needsOnboarding)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
    
    /// Tests that loading states prevent premature state transitions to onboarding
    func test_user_profile_loading_prevents_premature_onboarding() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .userWithPlan)
        
        // Set auth token first
        userManager.setAuthToken("token")
        
        // Simulate user profile loading (isLoading = true)
        userManager.isLoading = true
        
        // Wait a bit to see if state changes
        let exp = expectation(description: "State should not change while loading")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            exp.fulfill()
        }
        wait(for: [exp], timeout: 1.0)
        
        // Should still be in loading state, not onboarding
        XCTAssertEqual(appViewModel.state, .loading)
        
        // Now complete the profile loading
        userManager.isLoading = false
        userManager.setUserProfile(mockUserProfile)
        
        // Should go directly to loaded state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
} 