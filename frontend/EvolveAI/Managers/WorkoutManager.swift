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

/// Manages the state of the user's workout plan for the main application views.
class WorkoutManager: ObservableObject {
    
    // MARK: - Published Properties
    
    /// The user's workout plan. The UI will update whenever this changes.
    @Published var workoutPlan: WorkoutPlan?
    
    /// A flag to indicate when a network operation is in progress.
    @Published var isLoading = false
    
    /// An optional string to hold error messages for the UI to display.
    @Published var errorMessage: String?
    
    // MARK: - Dependencies
    
    private let networkService: NetworkServiceProtocol
    
    // MARK: - Initializer
    
    // We can inject a mock service for testing, but default to the real one.
    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
    }
    
    // MARK: - Public Methods
    
    /// Fetches the existing workout plan for the authenticated user from the server.
    /// This is the primary function of the WorkoutManager.
    func fetchWorkoutPlan(authToken: String) {
        isLoading = true
        errorMessage = nil
        
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
