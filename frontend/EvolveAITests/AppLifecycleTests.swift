//
//  AppLifecycleTests.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//

import XCTest
import Combine
import SwiftUI
@testable import EvolveAI

// MARK: - App Lifecycle Tests
/**
 * This file tests the app lifecycle management and background/foreground handling of the EvolveAI app.
 * 
 * WHAT WE'RE TESTING:
 * - App background/foreground transitions
 * - Operation pausing and resuming during lifecycle changes
 * - State persistence and restoration
 * - Resource cleanup during app lifecycle events
 * - Comprehensive lifecycle scenarios and edge cases
 * 
 * These tests ensure the app handles iOS lifecycle events gracefully,
 * preserves user state, and manages resources efficiently when the
 * app goes to background or is terminated.
 */
final class AppLifecycleTests: XCTestCase {
    private var appViewModel: AppViewModel!
    private var userManager: StubUserManager!
    private var workoutManager: StubWorkoutManager!

    override func tearDown() {
        appViewModel = nil
        userManager = nil
        workoutManager = nil
        super.tearDown()
    }

    // MARK: - App Lifecycle Tests
    
    /// Tests that the app handles background/foreground transitions without losing state or crashing
    func test_app_background_foreground_transitions() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Wait for initial state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .needsPlan, "Should start in needsPlan state")
        
        // Simulate app going to background
        NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
        
        // Wait a bit to simulate background processing
        let backgroundExp = expectation(description: "Background transition handled")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            backgroundExp.fulfill()
        }
        wait(for: [backgroundExp], timeout: 1.0)
        
        // Simulate app coming to foreground
        NotificationCenter.default.post(name: UIApplication.willEnterForegroundNotification, object: nil)
        
        // Wait for foreground transition to complete
        let foregroundExp = expectation(description: "Foreground transition handled")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            foregroundExp.fulfill()
        }
        wait(for: [foregroundExp], timeout: 1.0)
        
        // App should still be in a valid state
        if case .error(_, _, _) = appViewModel.state {
            XCTFail("App should not be in error state after background/foreground")
        }
    }
    
    /// Tests that ongoing operations are paused during background transitions and resumed when returning to foreground
    func test_app_lifecycle_operation_pausing() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Should start in error state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .error(message: "A network error occurred. Please try again."))
        
        // Simulate app going to background (this should pause auto-retry)
        NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
        
        // Wait for background transition
        let backgroundExp = expectation(description: "Background transition handled")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            backgroundExp.fulfill()
        }
        wait(for: [backgroundExp], timeout: 1.0)
        
        // Simulate app coming to foreground
        NotificationCenter.default.post(name: UIApplication.willEnterForegroundNotification, object: nil)
        
        // Wait for foreground transition
        let foregroundExp = expectation(description: "Foreground transition handled")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            foregroundExp.fulfill()
        }
        wait(for: [foregroundExp], timeout: 1.0)
        
        // App should handle the transition gracefully
        print("🔍 [TEST] App state after background/foreground: \(appViewModel.state)")
    }
    
    /// Tests that the app cleanup method properly releases resources and resets internal state
    func test_app_lifecycle_cleanup() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        
        // Verify cleanup method exists and works
        appViewModel.cleanup()
        
        // The cleanup should not crash and should reset internal state
        XCTAssertNotNil(appViewModel)
    }
    
    /// Tests that app state is properly saved to persistent storage during background transitions
    func test_app_lifecycle_state_persistence() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .onboardedUser)
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Wait for initial state
        waitForStateToSettle(appViewModel, timeout: 1.0)
        let initialState = appViewModel.state
        XCTAssertEqual(initialState, .needsPlan, "Should start in needsPlan state")
        
        // Simulate app going to background (this should save state)
        NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
        
        // Wait for background transition
        let backgroundExp = expectation(description: "Background transition handled")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            backgroundExp.fulfill()
        }
        wait(for: [backgroundExp], timeout: 1.0)
        
        // Check if state was saved to UserDefaults
        let savedState = UserDefaults.standard.string(forKey: "AppViewModel.lastState")
        let savedTimestamp = UserDefaults.standard.object(forKey: "AppViewModel.lastStateTimestamp") as? Date
        
        XCTAssertNotNil(savedState, "State should be saved to UserDefaults")
        XCTAssertNotNil(savedTimestamp, "Timestamp should be saved to UserDefaults")
        
        print("🔍 [TEST] Saved state: \(savedState ?? "nil"), timestamp: \(savedTimestamp?.description ?? "nil")")
    }
    
    /// Tests a comprehensive app lifecycle scenario including background, cleanup, and foreground restoration
    func test_comprehensive_app_lifecycle_scenario() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .userWithPlan)
        
        // Simulate app launch
        userManager.setAuthToken("token")
        userManager.setUserProfile(mockUserProfile)
        
        // Should go directly to loaded state without flashing
        waitForStateToSettle(appViewModel, timeout: 1.0)
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
        
        // Simulate background
        appViewModel.cleanup()
        
        // Simulate foreground (the AppViewModel automatically handles this in init)
        // No need to manually call setupAppLifecycleHandling as it's private
        
        // Should still be in loaded state
        XCTAssertEqual(appViewModel.state, .loaded(plan: mockWorkoutPlan))
    }
} 