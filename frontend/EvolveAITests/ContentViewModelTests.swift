//
//  ContentViewModelTests.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//
import XCTest
import Combine
@testable import EvolveAI

// --- Mock Dependency ---
// A mock version of UserManager that allows us to control its state for testing.
class MockUserManager: UserManager {
    var checkAuthenticationStateCallCount = 0

    // We override the method to track if it was called and to prevent the original
    // implementation (with its delays or network calls) from running during tests.
    override func checkAuthenticationState() {
        checkAuthenticationStateCallCount += 1
    }
    
    // Helper to simulate a state change. By setting these properties, the
    // @Published property wrappers in the base class will automatically trigger
    // an `objectWillChange` notification for the ViewModel to receive.
    func updateUserState(isLoading: Bool, authToken: String?, isOnboardingComplete: Bool) {
        self.isLoading = isLoading
        self.authToken = authToken
        self.isOnboardingComplete = isOnboardingComplete
    }
}


// --- Test Class ---
final class ContentViewModelTests: XCTestCase {

    private var viewModel: ContentViewModel!
    private var mockUserManager: MockUserManager!
    private var cancellables: Set<AnyCancellable>!

    // This method is called before each test.
    override func setUp() {
        super.setUp()
        mockUserManager = MockUserManager()
        // The ViewModel (System Under Test) is initialized with our mock.
        viewModel = ContentViewModel(userManager: mockUserManager)
        cancellables = []
    }

    // This method is called after each test.
    override func tearDown() {
        viewModel = nil
        mockUserManager = nil
        cancellables = nil
        super.tearDown()
    }

    // MARK: - Tests

    func test_initialization_triggersCheckAuthenticationState() {
        // Assert: Verify that creating the ViewModel calls the required method on its dependency.
        XCTAssertEqual(mockUserManager.checkAuthenticationStateCallCount, 1, "checkAuthenticationState() should be called exactly once on init.")
    }

    func test_initialState_isLoading() {
        // Assert: The ViewModel's initial state should be .loading, as set by the mock's default.
        XCTAssertEqual(viewModel.viewState, .loading, "The initial viewState should be .loading.")
    }

    func test_viewState_transitionsTo_loggedOut() {
        // Arrange: Set up an expectation for an asynchronous state change.
        let expectation = XCTestExpectation(description: "ViewModel should transition to loggedOut state")
        
        // Act & Assert: Subscribe to state changes and fulfill the expectation when the correct state is reached.
        viewModel.$viewState
            .dropFirst() // Ignore the initial .loading state.
            .sink { state in
                XCTAssertEqual(state, .loggedOut)
                expectation.fulfill()
            }
            .store(in: &cancellables)

        // Trigger the state change in the mock.
        mockUserManager.updateUserState(isLoading: false, authToken: nil, isOnboardingComplete: false)
        
        // Wait for the expectation to be fulfilled, with a timeout.
        wait(for: [expectation], timeout: 1.0)
    }

    func test_viewState_transitionsTo_needsOnboarding() {
        // Arrange
        let expectation = XCTestExpectation(description: "ViewModel should transition to needsOnboarding state")
        
        // Act & Assert
        viewModel.$viewState
            .dropFirst()
            .sink { state in
                XCTAssertEqual(state, .needsOnboarding)
                expectation.fulfill()
            }
            .store(in: &cancellables)

        mockUserManager.updateUserState(isLoading: false, authToken: "fake-token", isOnboardingComplete: false)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func test_viewState_transitionsTo_loggedIn() {
        // Arrange
        let expectation = XCTestExpectation(description: "ViewModel should transition to loggedIn state")
        
        // Act & Assert
        viewModel.$viewState
            .dropFirst()
            .sink { state in
                XCTAssertEqual(state, .loggedIn)
                expectation.fulfill()
            }
            .store(in: &cancellables)

        mockUserManager.updateUserState(isLoading: false, authToken: "fake-token", isOnboardingComplete: true)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func test_viewState_transitionsBackTo_loading() {
        // Arrange
        let expectation = XCTestExpectation(description: "ViewModel should transition back to loading state")
        
        // Set an initial non-loading state first.
        mockUserManager.updateUserState(isLoading: false, authToken: "fake-token", isOnboardingComplete: true)

        // Act & Assert
        viewModel.$viewState
            .dropFirst(2) // Ignore initial .loading and the .loggedIn we just set.
            .sink { state in
                // We expect the state to become .loading again.
                if state == .loading {
                    XCTAssertEqual(state, .loading)
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)

        // Trigger the change back to a loading state.
        mockUserManager.updateUserState(isLoading: true, authToken: "fake-token", isOnboardingComplete: true)
        
        wait(for: [expectation], timeout: 1.0)
    }
}
