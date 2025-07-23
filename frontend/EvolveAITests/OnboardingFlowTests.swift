import XCTest
import SwiftUI
@testable import EvolveAI // Make sure this matches your app's name

// MARK: - Mocks

/// A mock version of the NetworkService for testing purposes.
/// This allows us to control the outcome of the network call (e.g., force a success or failure)
/// without actually hitting the network.
class MockNetworkService: NetworkServiceProtocol {
    var result: Result<[Coach], Error>

    // We initialize the mock service with mock data.
    // This uses the 'Coach' struct from your main app, not a duplicate one.
    init() {
        self.result = .success(mockCoaches)
    }

    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        completion(result)
    }
}

class OnboardingViewModelTests: XCTestCase {

    // The System Under Test (SUT) is now the ViewModel.
    var viewModel: OnboardingViewModel!
    var mockNetworkService: MockNetworkService!

    // This method is called before each test function in this class is called.
    override func setUp() {
        super.setUp()
        // We initialize our mock network service and inject it into the ViewModel.
        mockNetworkService = MockNetworkService()
        viewModel = OnboardingViewModel(networkService: mockNetworkService)
    }

    // This method is called after each test function in this class is called.
    override func tearDown() {
        // Release the objects to ensure tests are isolated.
        viewModel = nil
        mockNetworkService = nil
        super.tearDown()
    }

    // MARK: - Tests

    /// Test that the ViewModel starts in the correct initial state.
    func test_initialState_isCorrect() {
        // Assert: Check the initial values of the @Published properties.
        XCTAssertEqual(viewModel.currentStep, 0, "The flow should start at step 0.")
        XCTAssertFalse(viewModel.isGenerating, "isGenerating should be false initially.")
        XCTAssertTrue(viewModel.availableCoaches.isEmpty, "Coaches should not be loaded yet.")
    }

    /// Test the forward navigation logic.
    func test_navigation_nextStep_incrementsCurrentStep() {
        // Act: Call the method on the ViewModel.
        viewModel.nextStep()
        // Assert: Check the property on the ViewModel.
        XCTAssertEqual(viewModel.currentStep, 1, "Should have moved to step 1.")

        // Act: Call it again.
        viewModel.nextStep()
        // Assert
        XCTAssertEqual(viewModel.currentStep, 2, "Should have moved to step 2.")
    }
    
    /// Test the backward navigation logic.
    func test_navigation_previousStep_decrementsCurrentStep() {
        // Arrange: Start at a later step.
        viewModel.currentStep = 3

        // Act: Call the method on the ViewModel.
        viewModel.previousStep() // Assuming you add this method to your ViewModel

        // Assert: Check the property on the ViewModel.
        XCTAssertEqual(viewModel.currentStep, 2, "Should have moved back to step 2.")
    }

    /// Test the logic for the "Next" button being disabled on the Experience step (step 1).
    func test_isNextButtonDisabled_onExperienceStep() {
        // Arrange: Go to the experience step.
        viewModel.currentStep = 1
        // Assert: The button should be disabled because no experience level is selected.
        XCTAssertTrue(viewModel.isNextButtonDisabled, "Next button should be disabled when experience level is empty.")

        // Act: Set an experience level on the ViewModel's profile.
        viewModel.userProfile.experienceLevel = "Beginner"

        // Assert: The button should now be enabled.
        XCTAssertFalse(viewModel.isNextButtonDisabled, "Next button should be enabled once an experience level is selected.")
    }

    /// Test the logic for the "Next" button being disabled on the Limitations step (step 6).
    func test_isNextButtonDisabled_onLimitationsStep() {
        // Arrange: Go to the limitations step.
        viewModel.currentStep = 6
        
        // Act: Set that the user has limitations.
        viewModel.userProfile.hasLimitations = true
        // Assert: The button should be disabled because the description is empty.
        XCTAssertTrue(viewModel.isNextButtonDisabled, "Next button should be disabled if user has limitations but no description.")

        // Act: Provide a description.
        viewModel.userProfile.limitationsDescription = "Knee injury"
        // Assert: The button should now be enabled.
        XCTAssertFalse(viewModel.isNextButtonDisabled, "Next button should be enabled once limitations are described.")
    }

    /// Test the successful fetching of coaches.
    func test_fetchCoaches_success_populatesAvailableCoaches() {
        // Arrange: Configure the mock service to return a successful result.
        mockNetworkService.result = .success(mockCoaches)
        
        // Act: Call the fetch function on the ViewModel.
        viewModel.fetchCoaches()

        // Assert: The ViewModel's `availableCoaches` property should be populated.
        XCTAssertEqual(viewModel.availableCoaches.count, mockCoaches.count, "availableCoaches should be populated on successful fetch.")
    }

    /// Test the failure case when fetching coaches.
    func test_fetchCoaches_failure_doesNotPopulateCoaches() {
        // Arrange: Configure the mock service to return a failure.
        enum TestError: Error { case networkFailure }
        mockNetworkService.result = .failure(TestError.networkFailure)
        
        // Act: Call the fetch function on the ViewModel.
        viewModel.fetchCoaches()

        // Assert: The `availableCoaches` property should remain empty.
        XCTAssertTrue(viewModel.availableCoaches.isEmpty, "availableCoaches should be empty on a failed fetch.")
    }
}
