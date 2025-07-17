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
    @Published var errorMessage: String? // Added to match ViewModel's expectation

    private var networkService = NetworkService()

    func fetchWorkoutPlan(authToken: String) {
        isLoading = true
        errorMessage = nil // Clear previous errors
        
        networkService.getWorkoutPlan(authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let plan):
                    self?.workoutPlan = plan
                case .failure(let error):
                    // Set the error message for the ViewModel to consume
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
}
