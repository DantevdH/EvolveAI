import Foundation

let delayTime: TimeInterval = 3

class MockNetworkService: NetworkServiceProtocol {

    init() {
        print("[MOCK] MockNetworkService init")
    }
    deinit {
        print("[DEINIT] MockNetworkService deinitialized: \(Unmanaged.passUnretained(self).toOpaque())")
    }

    
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
        print("[MOCK] login called with credentials: \(credentials)")
        DispatchQueue.main.asyncAfter(deadline: .now() + delayTime) {
            completion(.success("mock-token"))
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        print("[MOCK] getUserProfile called with token: \(authToken)")
        print("[MOCK] Starting delayTime second delay...")
        DispatchQueue.main.asyncAfter(deadline: .now() + delayTime) {
            print("[MOCK] Delay completed, returning mockUserProfile")
            completion(.success(mockUserProfile))
        }
    }
    
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] saveUserProfile called with token: \(authToken)")
        DispatchQueue.main.asyncAfter(deadline: .now() + delayTime) {
            
        }
    }
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        print("[MOCK] getAllCoaches called")
        print("[MOCK] Returning mockCoaches: \(mockCoaches.count) items")
        DispatchQueue.main.asyncAfter(deadline: .now() + delayTime) {
            print("[MOCK] getAllCoaches delay completed, calling completion on main queue")
            completion(.success(mockCoaches))
            print("[MOCK] getAllCoaches completed [main queue]")
        }
        print("[MOCK] This should print immediately after scheduling asyncAfter")
    }

    
    func generateWorkoutPlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] generateWorkoutPlan returning success in mock")
        // completion(.failure(NSError(domain: "MockNetworkService", code: 999, userInfo: [NSLocalizedDescriptionKey: "OpenAI call not supported in mock mode."])))
        DispatchQueue.main.asyncAfter(deadline: .now() + delayTime) {
            completion(.success(()))
        }
    }
    
    func getWorkoutPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        print("[MOCK] getWorkoutPlan called with token: \(authToken)")
        let weekNumbers = mockWorkoutPlan.weekly_schedules.map { $0.week_number }
        print("[MOCK] mockWorkoutPlan contains weeks: \(weekNumbers)")
        DispatchQueue.main.asyncAfter(deadline: .now() + delayTime) {
            print("[MOCK] getWorkoutPlan: Delay completed, returning mockWorkoutPlan")
            completion(.success(WorkoutPlanResponse(workoutPlan: mockWorkoutPlan)))
        }
    }
    
    func updateProgress(updates: [ExerciseProgressUpdate], authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] updateProgress called with updates: \(updates)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            completion(.success(()))
        }
    }
    
    // func updateCurrentWeek(week: Int, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
    //     print("[MOCK] updateCurrentWeek called with week: \(week)")
    //     DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
    //         print("[MOCK] updateCurrentWeek completed (no progress returned)")
    //         completion(.success(()))
    //     }
    // }
} 