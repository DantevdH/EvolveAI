//
//  NetworkService.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation
import Supabase

// MARK: - Custom Network Error
/// A custom error enum to provide more specific details about network failures.
enum NetworkError: LocalizedError {
    case invalidURL
    case requestFailed(Error)
    case invalidResponse
    case serverError(statusCode: Int)
    case decodingError(Error)
    case noAuthToken

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
        case .noAuthToken:
            return "No authentication token available."
        }
    }
}

// MARK: - Network Service Protocol
/// A protocol for the network service to allow for mocking in tests.
/// The public-facing API remains unchanged.
protocol NetworkServiceProtocol {
    func getAuthToken() -> String?
    func getCurrentScenario() -> String
    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void)
}

// MARK: - Simplified Network Service for Supabase
class NetworkService: NetworkServiceProtocol {
    
    private let jsonDecoder = JSONDecoder()
    private let jsonEncoder = JSONEncoder()
    
    init() {
        // Configure JSON decoder for date handling
        jsonDecoder.dateDecodingStrategy = .iso8601
        jsonEncoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - Public API Methods
    
    /// Gets the current Supabase auth token
    /// This checks if the user is already logged in and returns the Supabase access token
    func getAuthToken() -> String? {
        // For testing scenarios, check launch arguments first
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
            // In production, check if we have a valid Supabase session
            // Note: This is a synchronous check, but Supabase session is async
            // In practice, the UserManager should handle session checking
            return UserDefaults.standard.string(forKey: "supabase_access_token")
        }
    }
    
    /// Get the current scenario for debugging/testing purposes
    func getCurrentScenario() -> String {
        let arguments = ProcessInfo.processInfo.arguments
        return arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "new-user"
    }
    
    // MARK: - Scenario Setup for Backend (Testing Only)
    /// Call this before any other API calls to ensure the backend uses the correct scenario.
    /// This is only used for testing with mock data.
    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void) {
        let scenario = getCurrentScenario()
        guard !scenario.isEmpty else {
            completion(true) // No scenario to set, continue
            return
        }
        
        // Only set scenario if we're in a testing environment
        guard scenario != "new-user" else {
            completion(true) // Production mode, no scenario needed
            return
        }
        
        // For testing, we might want to set up mock data
        // This could involve setting up local test data or calling a test endpoint
        print("Setting up test scenario: \(scenario)")
        
        // For now, just simulate success
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            completion(true)
        }
    }
    
    // MARK: - Helper Methods for Supabase Integration
    
    /// Saves the Supabase access token to UserDefaults
    /// This is called by UserManager when a user successfully logs in
    func saveAuthToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: "supabase_access_token")
    }
    
    /// Clears the stored auth token
    /// This is called by UserManager when a user logs out
    func clearAuthToken() {
        UserDefaults.standard.removeObject(forKey: "supabase_access_token")
    }
    
    /// Checks if we have a valid stored auth token
    func hasStoredAuthToken() -> Bool {
        return UserDefaults.standard.string(forKey: "supabase_access_token") != nil
    }
}

