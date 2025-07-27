//
//  WorkoutManager.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation
import Combine

// MARK: - WorkoutManager Protocol
protocol WorkoutManagerProtocol: AnyObject {
    var workoutPlanResponse: WorkoutPlanResponse? { get }
    var isLoading: Bool { get }
    var errorMessage: String? { get }
    var coaches: [Coach] { get }
    var selectedCoach: Coach? { get }
    var isCoachesLoading: Bool { get }
    var coachesErrorMessage: String? { get }
    var workoutPlan: WorkoutPlan? { get }
    
    func fetchExistingPlan(authToken: String, showLoading: Bool, completion: @escaping (Bool) -> Void)
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Bool) -> Void)
    func updateExerciseCompletion(exerciseId: Int, isCompleted: Bool, weekNumber: Int, authToken: String)
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void)
}

class WorkoutManager: ObservableObject, WorkoutManagerProtocol {
    
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
    func fetchExistingPlan(authToken: String, showLoading: Bool = true, completion: @escaping (Bool) -> Void) {
        if showLoading {
            DispatchQueue.main.async { [weak self] in
                self?.isLoading = true
                self?.errorMessage = nil
            }
        }
        
        networkService.fetchExistingPlan(authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                if showLoading {
                    self?.isLoading = false
                }
                switch result {
                case .success(let response):
                    self?.workoutPlanResponse = response
                    completion(true)
                case .failure(let error):
                    // Don't set error message for 404 - it's expected when no plan exists
                    if let networkError = error as NSError?, networkError.code == 404 {
                        // 404 is expected when no plan exists, not an error
                        completion(false)
                    } else {
                        // Only set error message for actual errors
                        self?.errorMessage = error.localizedDescription
                        completion(false)
                    }
                }
            }
        }
    }
    
    /// Creates a new workout plan for the user.
    func createAndProvidePlan(for profile: UserProfile, authToken: String, completion: @escaping (Bool) -> Void) {
        // Don't set global loading state - this should happen in background
        // while user sees the GeneratePlanView
        self.errorMessage = nil
        
        networkService.createAndProvidePlan(for: profile, authToken: authToken) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    self?.workoutPlanResponse = response
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

    
    /// Fetches the list of coaches and selects the one matching the user's goal.
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void) {

        print("[WorkoutManager] fetchCoaches called with userGoal: \(userGoal)")

        DispatchQueue.main.async { [weak self] in
            self?.isCoachesLoading = true
            self?.coachesErrorMessage = nil
        }
        
        networkService.getAllCoaches { [weak self] result in
            print("[WorkoutManager] getAllCoaches completion called")
            
            DispatchQueue.main.async {
                print("[WorkoutManager] getAllCoaches completion - on main queue")
                guard let self = self else {
                    print("[WorkoutManager] Self is nil in main queue, cannot proceed")
                    return
                }
                
                self.isCoachesLoading = false
                switch result {
                case .success(let coaches):
                    self.coaches = coaches
                    self.selectedCoach = coaches.first(where: { $0.goal == userGoal })
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
                    self?.fetchExistingPlan(authToken: authToken) { _ in }
                case .failure(let error):
                    print("Failed to update progress: \(error.localizedDescription)")
                    // Add failed updates back to pending
                    self?.pendingUpdates.append(contentsOf: updates)
                }
            }
        }
    }
}
