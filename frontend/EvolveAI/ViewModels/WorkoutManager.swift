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

    private var networkService = NetworkService()

    func fetchWorkoutPlan(authToken: String) {
        isLoading = true
        networkService.getWorkoutPlan(authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                if case .success(let plan) = result {
                    self?.workoutPlan = plan
                }
            }
        }
    }
}
