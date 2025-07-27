import XCTest
import SwiftUI
@testable import EvolveAI // Make sure this matches your app's name

// MARK: - Mocks

/// A mock version of the NetworkService for testing purposes.
/// This allows us to control the outcome of the network call (e.g., force a success or failure)
/// without actually hitting the network.
class TestNetworkServiceOnboarding: NetworkServiceProtocol {
    var result: Result<[Coach], Error>
    private var currentScenario: String = "new-user"

    // We initialize the mock service with mock data.
    // This uses the 'Coach' struct from your main app, not a duplicate one.
    init() {
        self.result = .success(mockCoaches)
    }

    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        completion(result)
    }
    
    // MARK: - Required Protocol Methods
    
    func getAuthToken() -> String? {
        switch currentScenario {
        case "new-user":
            return nil
        case "existing-user", "onboarded-user", "user-with-plan":
            return "mock-token"
        default:
            return "mock-token"
        }
    }
    
    func getCurrentScenario() -> String {
        return currentScenario
    }
    
    func setScenario(_ scenario: String, completion: @escaping (Result<Void, Error>) -> Void) {
        self.currentScenario = scenario
        DispatchQueue.main.async {
            completion(.success(()))
        }
    }

    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success("mock-token"))
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(mockUserProfile))
        }
    }
    
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(()))
        }
    }
    
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
        }
    }
    
    func fetchExistingPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.failure(NSError(domain: "TestNetworkServiceOnboarding", code: 404, userInfo: [NSLocalizedDescriptionKey: "No workout plan found"])))
        }
    }
    
    func updateProgress(updates: [ExerciseProgressUpdate], authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            completion(.success(()))
        }
    }

    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void) {
        completion(true)
    }
}

class OnboardingFlowTests: XCTestCase {

    // The System Under Test (SUT) is now the ViewModel.
    var viewModel: OnboardingViewModel!
    var mockNetworkService: TestNetworkServiceOnboarding!

    // This method is called before each test function in this class is called.
    override func setUp() {
        super.setUp()
        // We initialize our mock network service and inject it into the ViewModel.
        mockNetworkService = TestNetworkServiceOnboarding()
        
        // Create mock managers for testing
        let mockUserManager = UserManager(networkService: mockNetworkService)
        let mockWorkoutManager = WorkoutManager(networkService: mockNetworkService)
        
        viewModel = OnboardingViewModel(
            networkService: mockNetworkService,
            userManager: mockUserManager,
            workoutManager: mockWorkoutManager
        )
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
}
