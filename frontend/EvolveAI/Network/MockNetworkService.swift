import Foundation

class MockNetworkService: NetworkServiceProtocol {


    init() {
        print("[MOCK] MockNetworkService init")
        print("[MOCK] Scenario: \(AppEnvironment.mockScenario)")
    }
    deinit {
        print("[DEINIT] MockNetworkService deinitialized: \(Unmanaged.passUnretained(self).toOpaque())")
    }

    
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
        print("[MOCK] login called with credentials: \(credentials)")
        
        // Login should always succeed in mock mode
        DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
            completion(.success("mock-token"))
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        print("[MOCK] getUserProfile called with token: \(authToken)")
        
        switch AppEnvironment.mockScenario {
        case .newUser, .existingUserNotOnboarded:
            print("[MOCK] New user scenario - returning 404 (no profile)")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.failure(NSError(domain: "MockNetworkService", code: 404, userInfo: [NSLocalizedDescriptionKey: "User not found - new user"])))
            }
        case .onboardedUser, .userWithPlan:
            print("[MOCK] Existing user scenario - returning profile")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.success(mockUserProfile))
            }
        case .networkError:
            print("[MOCK] Network error scenario - returning error")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.failure(NSError(domain: "MockNetworkService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Network error simulation"])))
            }
        }
    }
    
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] saveUserProfile called with token: \(authToken)")
        
        // Save profile should always succeed in mock mode
        DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
            completion(.success(()))
        }
    }
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        print("[MOCK] getAllCoaches called")
        print("[MOCK] Returning mockCoaches: \(mockCoaches.count) items")
        DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
            print("[MOCK] getAllCoaches delay completed, calling completion on main queue")
            completion(.success(mockCoaches))
            print("[MOCK] getAllCoaches completed [main queue]")
        }
        print("[MOCK] This should print immediately after scheduling asyncAfter")
    }

    
    /// Creates a new workout plan and returns it immediately
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        print("[MOCK] createAndProvidePlan called")
        
        switch AppEnvironment.mockScenario {
        case .newUser, .existingUserNotOnboarded, .onboardedUser:
            print("[MOCK] Creating new plan for user")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            }
        case .userWithPlan:
            print("[MOCK] User already has plan - returning existing plan")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            }
        case .networkError:
            print("[MOCK] Network error scenario - returning error")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.failure(NSError(domain: "MockNetworkService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Network error simulation"])))
            }
        }
    }
    
    /// Fetches an existing workout plan
    func fetchExistingPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        print("[MOCK] fetchExistingPlan called with token: \(authToken)")
        
        switch AppEnvironment.mockScenario {
        case .newUser, .existingUserNotOnboarded, .onboardedUser:
            print("[MOCK] No existing plan - returning 404")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.failure(NSError(domain: "MockNetworkService", code: 404, userInfo: [NSLocalizedDescriptionKey: "No workout plan found"])))
            }
        case .userWithPlan:
            print("[MOCK] User has existing plan - returning plan")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
            }
        case .networkError:
            print("[MOCK] Network error scenario - returning error")
            DispatchQueue.main.asyncAfter(deadline: .now() + AppEnvironment.delayTime) {
                completion(.failure(NSError(domain: "MockNetworkService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Network error simulation"])))
            }
        }
    }
    
    func updateProgress(updates: [ExerciseProgressUpdate], authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] updateProgress called with updates: \(updates)")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            completion(.success(()))
        }
    }
}