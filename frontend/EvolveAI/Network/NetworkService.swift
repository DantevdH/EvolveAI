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
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void)
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void)
    func generateWorkoutPlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void)
    func getWorkoutPlan(authToken: String, completion: @escaping (Result<WorkoutPlan, Error>) -> Void)
}


// MARK: - Simplified Network Service
class NetworkService: NetworkServiceProtocol {
    
    private let baseURL = "http://127.0.0.1:8000/api"
    private let jsonDecoder = JSONDecoder()
    private let jsonEncoder = JSONEncoder()
    
    // MARK: - Public API Methods
    
    /// A response structure specific to the login endpoint.
    private struct AuthResponse: Codable {
        let token: String
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
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
        performRequest(endpoint: "/coaches/", method: "GET", completion: completion)
    }

    func generateWorkoutPlan(for profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let body = try? jsonEncoder.encode(profile) else {
            completion(.failure(NetworkError.decodingError(NSError())))
            return
        }
        
        // This request expects a 201 status code and no JSON body in the response,
        // so we use the generic function but ignore the decodable result.
        performRequest(endpoint: "/workoutplan/", method: "POST", body: body, authToken: authToken, expectedStatusCode: 201) { (result: Result<Data?, Error>) in
            switch result {
            case .success:
                completion(.success(())) // Return a Void success
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func getWorkoutPlan(authToken: String, completion: @escaping (Result<WorkoutPlan, Error>) -> Void) {
        performRequest(endpoint: "/workoutplan/detail/", method: "GET", authToken: authToken, completion: completion)
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