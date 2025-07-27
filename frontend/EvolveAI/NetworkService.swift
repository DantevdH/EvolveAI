//
//  NetworkService.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation

// MARK: - Custom Network Error
/// A custom error enum to provide more specific details about network failures.
enum NetworkError: LocalizedError {
    case invalidURL
    case requestFailed(Error)
    case invalidResponse
    case serverError(statusCode: Int)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The provided URL was invalid."
        case .requestFailed(let error):
            return "The network request failed: \(error.localizedDescription)"
        case .invalidResponse:
            return "Received an invalid response from the server."
        case .serverError(let statusCode):
            return "The server returned an error with status code: \(statusCode)."
        case .decodingError(let error):
            return "Failed to decode the response: \(error.localizedDescription)"
        }
    }
}


// MARK: - Network Service Protocol
/// A protocol for the network service to allow for mocking in tests.
/// The public-facing API remains unchanged.
protocol NetworkServiceProtocol {
    func getAuthToken() -> String?
    func getCurrentScenario() -> String
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void)
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void)
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void)
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void)
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void)
    func fetchExistingPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void)
    func updateProgress(updates: [ExerciseProgressUpdate], authToken: String, completion: @escaping (Result<Void, Error>) -> Void)
    /// Set the scenario on the backend before any other API calls (no-op in production)
    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void)
}


// MARK: - Simplified Network Service
class NetworkService: NetworkServiceProtocol {
    
    private let baseURL: String
    private let jsonDecoder = JSONDecoder()
    private let jsonEncoder = JSONEncoder()
    
    init(baseURL: String = "http://127.0.0.1:8000/api") {
        self.baseURL = baseURL
    }
    
    // MARK: - Public API Methods
    
    /// A response structure specific to the login endpoint.
    private struct AuthResponse: Codable {
        let token: String
    }
    
    func getAuthToken() -> String? {
        // Get scenario from launch arguments
        let arguments = ProcessInfo.processInfo.arguments
        let scenario = arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "new-user"
        
        switch scenario {
        case "new-user":
            return nil
        case "existing-user", "onboarded-user", "user-with-plan":
            return "mock-token" // Return mock token for these scenarios
        default:
            return UserDefaults.standard.string(forKey: "authToken")
        }
    }
    
    /// Get the current scenario for debugging/testing purposes
    func getCurrentScenario() -> String {
        let arguments = ProcessInfo.processInfo.arguments
        return arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "new-user"
    }
    
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
        // The body for this request is simple JSON, so we can use JSONSerialization.
        guard let body = try? JSONSerialization.data(withJSONObject: credentials) else {
            completion(.failure(NetworkError.decodingError(NSError()))) // Or a more specific encoding error
            return
        }
        
        // Call the generic request function.
        performRequest(endpoint: "/users/login/", method: "POST", body: body) { (result: Result<AuthResponse, Error>) in
            // Map the Result<AuthResponse, Error> to Result<String, Error> for the caller.
            switch result {
            case .success(let authResponse):
                completion(.success(authResponse.token))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        performRequest(endpoint: "/users/profile/", method: "GET", authToken: authToken, completion: completion)
    }
    
    func saveUserProfile(_ profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let body = try? jsonEncoder.encode(profile) else {
            completion(.failure(NetworkError.decodingError(NSError())))
            return
        }
        
        performRequest(endpoint: "/users/profile/", method: "PUT", body: body, authToken: authToken) { (result: Result<Data?, Error>) in
            switch result {
            case .success:
                completion(.success(())) // Return a Void success
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        performRequest(endpoint: "/coaches/", method: "GET", completion: completion)
    }

    /// Creates a new workout plan and returns it immediately
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        guard let body = try? jsonEncoder.encode(profile) else {
            completion(.failure(NetworkError.decodingError(NSError())))
            return
        }
        
        // This request creates a plan and returns it in the response
        performRequest(endpoint: "/workoutplan/create/", method: "POST", body: body, authToken: authToken, expectedStatusCode: 201, completion: completion)
    }
    
    /// Fetches an existing workout plan
    func fetchExistingPlan(authToken: String, completion: @escaping (Result<WorkoutPlanResponse, Error>) -> Void) {
        performRequest(endpoint: "/workoutplan/detail/", method: "GET", authToken: authToken, completion: completion)
    }
    
    func updateProgress(updates: [ExerciseProgressUpdate], authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let requestBody = ProgressUpdateRequest(updates: updates)
        
        guard let body = try? jsonEncoder.encode(requestBody) else {
            completion(.failure(NetworkError.decodingError(NSError())))
            return
        }
        
        performRequest(endpoint: "/workoutplan/progress/", method: "POST", body: body, authToken: authToken) { (result: Result<Data?, Error>) in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    // MARK: - Scenario Setup for Backend
    /// Call this before any other API calls to ensure the backend uses the correct scenario.
    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void) {
        let scenario = getCurrentScenario()
        guard !scenario.isEmpty else {
            completion(true) // No scenario to set, continue
            return
        }
        guard let url = URL(string: "http://localhost:8000/api/scenarios/set/") else {
            completion(false)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = ["scenario": scenario]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Failed to set scenario: \(error)")
                completion(false)
                return
            }
            completion(true)
        }
        task.resume()
    }
    
    
    // MARK: - Private Generic Request Handler
    
    /// The single, reusable function that handles all network requests.
    /// - Parameters:
    ///   - T: The `Decodable` type that the response JSON is expected to be.
    ///   - endpoint: The path for the API endpoint (e.g., "/users/login/").
    ///   - method: The HTTP method ("GET", "POST", etc.).
    ///   - body: The request body data, optional.
    ///   - authToken: The authentication token, optional.
    ///   - expectedStatusCode: The status code expected on success. Defaults to 200.
    ///   - completion: The completion handler to call with the result.
    private func performRequest<T: Decodable>(
        endpoint: String,
        method: String,
        body: Data? = nil,
        authToken: String? = nil,
        expectedStatusCode: Int = 200,
        completion: @escaping (Result<T, Error>) -> Void
    ) {
        // 1. Construct the URL
        guard let url = URL(string: baseURL + endpoint) else {
            completion(.failure(NetworkError.invalidURL))
            return
        }
        
        // 2. Create the URLRequest
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = authToken {
            request.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        // 3. Perform the Data Task
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            // Ensure completion handler is run on the main thread
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(NetworkError.requestFailed(error)))
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    completion(.failure(NetworkError.invalidResponse))
                    return
                }
                
                // Suppress 404 for workout plan detail endpoint
                if httpResponse.statusCode == 404 && endpoint.contains("/workoutplan/detail") {
                    // If T is optional, you could do: completion(.success(nil as! T))
                    // Otherwise, propagate a custom error or handle in manager
                    completion(.failure(NSError(domain: "WorkoutPlan", code: 404, userInfo: [NSLocalizedDescriptionKey: "No workout plan found"])))
                    return
                }
                // // Suppress 404 for user profile endpoint
                // if httpResponse.statusCode == 404 && endpoint.contains("/users/profile") {
                //     completion(.failure(NSError(domain: "UserProfile", code: 404, userInfo: [NSLocalizedDescriptionKey: "User profile not found"])))
                //     return
                // }
                
                guard httpResponse.statusCode == expectedStatusCode else {
                    completion(.failure(NetworkError.serverError(statusCode: httpResponse.statusCode)))
                    return
                }
                
                // For requests that return no data on success (like generateWorkoutPlan)
                if T.self == Data?.self {
                    completion(.success(data as! T))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(NetworkError.invalidResponse))
                    return
                }
                
                // 4. Decode the response
                do {
                    let decodedObject = try self.jsonDecoder.decode(T.self, from: data)
                    completion(.success(decodedObject))
                } catch {
                    completion(.failure(NetworkError.decodingError(error)))
                }
            }
        }
        task.resume()
    }
}

