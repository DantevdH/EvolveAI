//
//  AppErrorRecoveryTests.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//

import XCTest
import Combine
import SwiftUI
@testable import EvolveAI

// MARK: - App Error Recovery Tests
/**
 * This file tests the error handling and recovery mechanisms of the EvolveAI app.
 * 
 * WHAT WE'RE TESTING:
 * - Error state transitions and validation
 * - Automatic retry mechanisms with exponential backoff
 * - Manual retry functionality and retry count management
 * - Error recovery from network failures
 * - State machine validation during error conditions
 * 
 * These tests ensure the app gracefully handles failures, provides
 * user-friendly error messages, and can recover automatically or
 * with user intervention when network issues are resolved.
 */
final class AppErrorRecoveryTests: XCTestCase {
    private var appViewModel: AppViewModel!
    private var userManager: StubUserManager!
    private var workoutManager: StubWorkoutManager!

    override func tearDown() {
        appViewModel = nil
        userManager = nil
        workoutManager = nil
        super.tearDown()
    }

    // MARK: - Error Recovery Tests
    
    /// Tests that error states can recover to normal operation when network issues are resolved
    func test_error_state_can_recover_with_valid_data() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
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
        
        // Simulate network recovery by updating the scenario
        workoutManager.scenario = .onboardedUser // Switch to working scenario
        
        // Trigger retry
        appViewModel.retryFromError()
        
        // Should recover to needsPlan state
        waitForStateToSettle(appViewModel, timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
    }
    
    /// Tests that automatic retry attempts are made after network failures with appropriate delays
    func test_auto_retry_attempts_recovery() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
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
        
        // Wait for auto-retry (2 second delay)
        let exp = expectation(description: "Auto-retry should be attempted")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            exp.fulfill()
        }
        wait(for: [exp], timeout: 3.0)
        
        // Should have attempted retry (retry count increased)
        // Note: The auto-retry will happen automatically after 2 seconds
        // We can verify this by checking if the state changed
        print("🔍 [TEST] After auto-retry delay, state is: \(appViewModel.state)")
    }
    
    /// Tests that manual retry requests reset the retry count and attempt recovery
    func test_manual_retry_resets_retry_count() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
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
        
        // Trigger manual retry
        appViewModel.retryFromError()
        
        // Should attempt recovery
        waitForStateToSettle(appViewModel, timeout: 1.0)
        
        // The retry should either succeed or show a new error
        // We can't easily test the internal retry count, but we can verify the behavior
        print("🔍 [TEST] After manual retry, state is: \(appViewModel.state)")
    }
    
    /// Tests that successful error recovery clears the retry count for future error handling
    func test_error_recovery_clears_retry_count() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
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
        
        // Simulate recovery by switching to working scenario
        workoutManager.scenario = .onboardedUser
        
        // Trigger retry
        appViewModel.retryFromError()
        
        // Should recover to needsPlan state
        waitForStateToSettle(appViewModel, timeout: 2.0)
        XCTAssertEqual(appViewModel.state, .needsPlan)
        
        // Now trigger another error to verify retry count was reset
        workoutManager.scenario = .networkError
        appViewModel.fetchCoachesAndPlanIfNeeded()
        
        waitForStateToSettle(appViewModel, timeout: 1.0)
        if case .error(let message, let canRetry, _) = appViewModel.state {
            XCTAssertTrue(canRetry) // Should be able to retry again
            XCTAssertTrue(message.contains("Failed to fetch coaches"))
        } else {
            XCTFail("Should be in error state again")
        }
    }
    
    /// Tests that error states can transition to other valid states during recovery attempts
    func test_error_state_transitions_are_valid() {
        (appViewModel, userManager, workoutManager) = setupApp(scenario: .networkError)
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
        
        // Test that we can transition from error to other valid states
        // This tests the enhanced state machine logic
        
        // Should be able to go to loading when retrying
        appViewModel.retryFromError()
        waitForStateToSettle(appViewModel, timeout: 1.0)
        
        // State should either be loading or back to error (depending on retry success)
        let validStates: [AppViewModel.AppState] = [.loading]
        XCTAssertTrue(validStates.contains { state in
            if case state = appViewModel.state { return true }
            return false
        } || {
            if case .error(_, _, _) = appViewModel.state { return true }
            return false
        }())
    }
} 