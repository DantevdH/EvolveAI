//
//  WorkoutManager.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation
import Combine

class WorkoutManager: ObservableObject {
    
    @Published var workoutPlanResponse: WorkoutPlanResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Progress tracking
    @Published var pendingUpdates: [ExerciseProgressUpdate] = []
    private var updateTimer: Timer?
    private let updateDelay: TimeInterval = 2.0 // 2 seconds delay for batch updates
    
    @Published var coaches: [Coach] = []
    @Published var selectedCoach: Coach? = nil
    @Published var isCoachesLoading = false
    @Published var coachesErrorMessage: String? = nil
    
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // Computed properties for easier access
    var workoutPlan: WorkoutPlan? {
        workoutPlanResponse?.workoutPlan
    }
    
    
    var canModifyWeek: Bool {
        // Can only modify current week or future weeks
        return true
    }

    init(networkService: NetworkServiceProtocol = AppEnvironment.networkService) {
        self.networkService = networkService
    }
    
    deinit {
        print("[DEINIT] WorkoutManager deinitialized: \(Unmanaged.passUnretained(self).toOpaque())")
    }
    
    /// Fetches the existing workout plan for the authenticated user from the server.
    /// This method corresponds to the fetchPlan() in the flow diagram.
    func fetchPlan(authToken: String) {
        DispatchQueue.main.async { [weak self] in
            self?.isLoading = true
            self?.errorMessage = nil
        }
        
        networkService.getWorkoutPlan(authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.workoutPlanResponse = response
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    /// Creates a new workout plan for the user.
    /// This method corresponds to the createPlan() in the flow diagram.
    func createPlan(for profile: UserProfile, authToken: String, completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.isLoading = true
            self?.errorMessage = nil
        }
        
        networkService.generateWorkoutPlan(for: profile, authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success:
                    // After successful creation, fetch the plan
                    self?.fetchPlan(authToken: authToken)
                    completion(true)
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    completion(false)
                }
            }
        }
    }
    
    /// Updates exercise completion status with batch processing
    func updateExerciseCompletion(exerciseId: Int, isCompleted: Bool, weekNumber: Int, authToken: String) {
        // Only allow updates for current week or future weeks
        // guard weekNumber >= currentWeek else {
        //     print("Cannot modify past weeks")
        //     return
        // }
        
        let update = ExerciseProgressUpdate(
            exerciseId: exerciseId,
            isCompleted: isCompleted,
            weekNumber: weekNumber
        )
        
        // Add to pending updates
        if let existingIndex = pendingUpdates.firstIndex(where: { $0.exerciseId == exerciseId && $0.weekNumber == weekNumber }) {
            pendingUpdates[existingIndex] = update
        } else {
            pendingUpdates.append(update)
        }
        
        // Reset timer for batch processing
        updateTimer?.invalidate()
        updateTimer = Timer.scheduledTimer(withTimeInterval: updateDelay, repeats: false) { [weak self] _ in
            self?.flushPendingUpdates(authToken: authToken)
        }
    }

    /// Legacy method name for backward compatibility
    func fetchWorkoutPlan(authToken: String) {
        fetchPlan(authToken: authToken)
    }
    
    /// Fetches the list of coaches and selects the one matching the user's goal.
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] fetchCoaches called with userGoal: \(userGoal)")
        print("[WorkoutManager] Using networkService: \(type(of: networkService))")

        DispatchQueue.main.async { [weak self] in
            self?.isCoachesLoading = true
            self?.coachesErrorMessage = nil
        }
        
        print("[WorkoutManager] About to call networkService.getAllCoaches")
        networkService.getAllCoaches { [weak self] result in
            print("[WorkoutManager] getAllCoaches completion called")
            print("[WorkoutManager] Self is nil: \(self == nil)")
            
            DispatchQueue.main.async {
                print("[WorkoutManager] getAllCoaches completion - on main queue")
                guard let self = self else {
                    print("[WorkoutManager] Self is nil in main queue, cannot proceed")
                    return
                }
                
                self.isCoachesLoading = false
                switch result {
                case .success(let coaches):
                    print("[WorkoutManager] Fetched coaches: \(coaches.count)")
                    print("[WorkoutManager] First coach (if any): \(coaches.first)")

                    print("[WorkoutManager] getAllCoaches success with \(coaches.count) coaches")
                    self.coaches = coaches
                    self.selectedCoach = mockCoaches[0]  // This line might be problematic
                    print("[WorkoutManager] selectedCoach set, calling completion(true)")
                    completion(self.selectedCoach != nil)
                case .failure(let error):
                    print("[WorkoutManager] getAllCoaches failure: \(error)")
                    self.coaches = []
                    self.selectedCoach = nil
                    self.coachesErrorMessage = error.localizedDescription
                    completion(false)
                }
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func flushPendingUpdates(authToken: String) {
        guard !pendingUpdates.isEmpty else { return }
        
        let updates = pendingUpdates
        pendingUpdates.removeAll()
        
        networkService.updateProgress(updates: updates, authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    print("Successfully updated \(updates.count) exercise progress items")
                    // Optionally refresh data
                    self?.fetchPlan(authToken: authToken)
                case .failure(let error):
                    print("Failed to update progress: \(error.localizedDescription)")
                    // Add failed updates back to pending
                    self?.pendingUpdates.append(contentsOf: updates)
                }
            }
        }
    }
}
