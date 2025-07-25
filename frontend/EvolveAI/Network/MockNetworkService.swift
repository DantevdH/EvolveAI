import Foundation

class MockNetworkService: NetworkServiceProtocol {

    
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
        print("[MOCK] login called with credentials: \(credentials)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success("mock-token"))
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        print("[MOCK] getUserProfile called with token: \(authToken)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(mockUserProfile))
        }
    }
    
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] saveUserProfile called with token: \(authToken)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(()))
        }
    }
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        print("[MOCK] getAllCoaches called")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(mockCoaches))
        }
    }
    
    func generateWorkoutPlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        print("[MOCK] generateWorkoutPlan should NOT be called in mock mode!")
        completion(.failure(NSError(domain: "MockNetworkService", code: 999, userInfo: [NSLocalizedDescriptionKey: "OpenAI call not supported in mock mode."])))
    }
    
    func getWorkoutPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        print("[MOCK] getWorkoutPlan called with token: \(authToken)")
        let weekNumbers = mockWorkoutPlan.weekly_schedules.map { $0.week_number }
        print("[MOCK] mockWorkoutPlan contains weeks: \(weekNumbers)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
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