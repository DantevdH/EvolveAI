//
//  WorkoutManager.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

//
//  WorkoutManager.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation

class WorkoutManager: ObservableObject {
    
    @Published var workoutPlan: WorkoutPlan?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let networkService: NetworkServiceProtocol

    // We can inject a mock service for testing, but default to the real one.
    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
    }
    
    /// Fetches the existing workout plan for the authenticated user from the server.
    /// In DEBUG mode, this will return a mock plan after a 5-second delay.
    func fetchWorkoutPlan(authToken: String) {
        // This is the primary fix for the "Publishing changes" warning.
        // We defer the state update to the next run loop.
        DispatchQueue.main.async { [weak self] in
            self?.isLoading = true
            self?.errorMessage = nil
        }
        
        // This block is ONLY compiled for Debug builds.
        #if DEBUG
        print("--- App is running in DEBUG mode ---")
        let useMockDataForDebug = true // Toggle this to test the real network call in debug.

        if useMockDataForDebug {
            print("--- Loading MOCK workout plan in 2 seconds... ---")
            // Simulate a network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                print("--- Mock plan loaded. ---")
                self?.isLoading = false
                self?.workoutPlan = mockWorkoutPlan // Assign mock data
            }
        } else {
            // This 'else' block allows you to test the real network call while still in debug mode.
            // It calls the same function defined in the #else block below.
            performRealNetworkCall(authToken: authToken)
        }

        // The #else provides a completely separate code path for Release builds.
        #else
        // This is the only code that will be included in your final App Store build.
        performRealNetworkCall(authToken: authToken)
        #endif
    }

    // Helper function to avoid duplicating the network logic.
    private func performRealNetworkCall(authToken: String) {
        print("--- Performing REAL network call to fetch workout plan... ---")
        
        networkService.getWorkoutPlan(authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let plan):
                    self?.workoutPlan = plan
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
}
