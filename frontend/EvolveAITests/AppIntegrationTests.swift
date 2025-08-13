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

// MARK: - App Integration Tests
/**
 * This file tests the core integration and end-to-end workflows of the EvolveAI app.
 * 
 * WHAT WE'RE TESTING:
 * - App initialization and component setup
 * - Complete user journeys from start to finish
 * - Integration between UserManager, WorkoutManager, and AppViewModel
 * - End-to-end workflows and user scenarios
 * - Cross-component communication and data flow
 * 
 * These tests ensure that all app components work together seamlessly,
 * user journeys are complete and smooth, and the app provides a
 * cohesive experience from login to workout plan generation.
 */
final class AppIntegrationTests: XCTestCase {
    private var appViewModel: AppViewModel!
    private var userManager: StubUserManager!
    private var workoutManager: StubWorkoutManager!

    override func tearDown() {
        appViewModel = nil
        userManager = nil
        workoutManager = nil
        super.tearDown()
    }

    // MARK: - Core Integration Tests
    
    /// Tests that the app properly initializes all components and starts in the correct initial state
    func test_app_initialization_and_setup() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .newUser)
        
        // Verify all components are properly initialized
        XCTAssertNotNil(appViewModel)
        XCTAssertNotNil(userManager)
        XCTAssertNotNil(workoutManager)
        
        // Verify initial state
        XCTAssertEqual(appViewModel.state, .loading)
    }
    
    /// Tests the complete user journey from new user login through onboarding to workout plan generation
    func test_complete_user_journey_from_login_to_plan() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        
        // 1. Start logged out
        userManager.setAuthToken(nil)
        userManager.setUserProfile(nil)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loggedOut)
        
        // 2. User logs in
        userManager.setAuthToken("token")
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsOnboarding)
        
        // 3. User completes onboarding
        userManager.setUserProfile(mockUserProfile)
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
        
        // 4. User generates plan
        appViewModel.generatePlanForUser(authToken: "token") { _ in }
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
    
    /// Tests that existing users with workout plans flow directly to the loaded state without intermediate steps
    func test_existing_user_with_plan_flows_correctly() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .userWithPlan)
        
        // User already has everything
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Should go directly to loaded state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
        
        // Verify workout plan is properly loaded
        XCTAssertNotNil(workoutManager.workoutPlan)
        XCTAssertNotNil(workoutManager.completeWorkoutPlan)
    }
    
    /// Tests that network errors are properly handled and the app can recover when network issues are resolved
    func test_network_error_handling_and_recovery() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
        
        // Set up user
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Should start in error state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        if case .error(let message, let canRetry, _) = appViewModel.state {
            XCTAssertTrue(canRetry)
            XCTAssertTrue(message.contains("A network error occurred"))
        } else {
            XCTFail("Should be in error state")
        }
        
        // Switch to working scenario
        workoutManager.scenario = .onboardedUser
        
        // Should recover
        appViewModel.retryFromError()
        waitForStateToSettle(appViewModel, timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
    }
    
    /// Tests the integration between coach selection and workout plan generation workflows
    func test_coach_selection_and_plan_generation_integration() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        
        // Set up user
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Wait for needsPlan state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
        
        // Verify coaches are fetched automatically
        waitUntil({ self.workoutManager.selectedCoach != nil })
        XCTAssertNotNil(workoutManager.selectedCoach)
        
        // Generate plan
        appViewModel.generatePlanForUser(authToken: "token") { _ in }
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
} 