//
//  WorkoutManager.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation
import Combine
import Supabase

// MARK: - WorkoutManager Protocol
protocol WorkoutManagerProtocol: AnyObject {
    var workoutPlan: WorkoutPlan? { get }
    var completeWorkoutPlan: CompleteWorkoutPlan? { get }
    var isLoading: Bool { get }
    var errorMessage: String? { get }
    var coaches: [Coach] { get }
    var selectedCoach: Coach? { get }
    var isCoachesLoading: Bool { get }
    var coachesErrorMessage: String? { get }
    
    func fetchExistingPlan(completion: @escaping (Bool) -> Void)
    func fetchCompleteWorkoutPlan(completion: @escaping (Bool) -> Void)
    func createAndProvidePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void)
    func updateExerciseCompletion(exerciseId: Int, isCompleted: Bool, weekNumber: Int)
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void)
}

class WorkoutManager: ObservableObject, WorkoutManagerProtocol {
    
    @Published var workoutPlan: WorkoutPlan?
    @Published var completeWorkoutPlan: CompleteWorkoutPlan?
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
    
    private var cancellables = Set<AnyCancellable>()
    private let workoutPlanService = WorkoutPlanService()

    init() {
        // No need for network service dependency
    }
    
    deinit {
        print("[DEINIT] WorkoutManager deinitialized: \(Unmanaged.passUnretained(self).toOpaque())")
    }
    
    /// Fetches the existing workout plan for the authenticated user from Supabase
    func fetchExistingPlan(completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.isLoading = true
            self?.errorMessage = nil
        }
        
        Task {
            do {
                // Get current session to get user ID
                let session = try await supabase.auth.session
                let userId = session.user.id
                
                // First, get the user's profile to get the profile ID
                let userProfiles: [UserProfile] = try await supabase.database
                    .from("user_profiles")
                    .select()
                    .eq("user_id", value: userId)
                    .execute()
                    .value
                
                guard let userProfile = userProfiles.first else {
                    await MainActor.run {
                        self.isLoading = false
                        self.errorMessage = "User profile not found"
                        completion(false)
                    }
                    return
                }
                
                // Get the workout plan for this user
                let workoutPlans: [WorkoutPlan] = try await supabase.database
                    .from("workout_plans")
                    .select()
                    .eq("user_profile_id", value: userProfile.id!)
                    .execute()
                    .value
                
                await MainActor.run {
                    self.isLoading = false
                    if let plan = workoutPlans.first {
                        self.workoutPlan = plan
                        completion(true)
                    } else {
                        // No plan exists yet
                        self.workoutPlan = nil
                        completion(false)
                    }
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = "Failed to fetch workout plan: \(error.localizedDescription)"
                    completion(false)
                }
            }
        }
    }
    
    /// Fetches the complete workout plan structure including all related data
    func fetchCompleteWorkoutPlan(completion: @escaping (Bool) -> Void) {
        guard let workoutPlan = workoutPlan else {
            completion(false)
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.isLoading = true
            self?.errorMessage = nil
        }
        
        Task {
            do {
                // Step 1: Fetch weekly schedules
                let weeklySchedules: [WeeklySchedule] = try await supabase.database
                    .from("weekly_schedules")
                    .select()
                    .eq("workout_plan_id", value: workoutPlan.id)
                    .execute()
                    .value
                
                // Step 2: Fetch daily workouts for all weekly schedules
                let weeklyScheduleIds = weeklySchedules.map { $0.id }
                let dailyWorkouts: [DailyWorkout] = try await supabase.database
                    .from("daily_workouts")
                    .select()
                    .in("weekly_schedule_id", values: weeklyScheduleIds)
                    .execute()
                    .value
                
                // Step 3: Fetch workout exercises for all daily workouts
                let dailyWorkoutIds = dailyWorkouts.map { $0.id }
                let workoutExercises: [WorkoutExercise] = try await supabase.database
                    .from("workout_exercises")
                    .select()
                    .in("daily_workout_id", values: dailyWorkoutIds)
                    .execute()
                    .value
                
                // Step 4: Fetch exercises referenced by workout exercises
                let exerciseIds = workoutExercises.map { $0.exerciseId }
                let exercises: [Exercise] = try await supabase.database
                    .from("exercises")
                    .select()
                    .in("id", values: exerciseIds)
                    .execute()
                    .value
                
                // Step 5: Create complete workout plan structure
                let completePlan = CompleteWorkoutPlan(
                    workoutPlan: workoutPlan,
                    weeklySchedules: weeklySchedules,
                    dailyWorkouts: dailyWorkouts,
                    workoutExercises: workoutExercises,
                    exercises: exercises
                )
                
                await MainActor.run {
                    self.isLoading = false
                    self.completeWorkoutPlan = completePlan
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = "Failed to fetch complete workout plan: \(error.localizedDescription)"
                    completion(false)
                }
            }
        }
    }
    
    /// Creates a new workout plan for the user using the WorkoutPlanService
    func createAndProvidePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void) {
        self.errorMessage = nil
        
        Task {
            do {
                // Use the dedicated service to generate and save the workout plan
                let savedWorkoutPlan = try await workoutPlanService.generateAndSaveWorkoutPlan(for: profile)
                
                await MainActor.run {
                    self.workoutPlan = savedWorkoutPlan
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to create workout plan: \(error.localizedDescription)"
                    completion(false)
                }
            }
        }
    }
    

    
    /// Updates exercise completion status with batch processing
    func updateExerciseCompletion(exerciseId: Int, isCompleted: Bool, weekNumber: Int) {
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
            self?.flushPendingUpdates()
        }
    }

    /// Fetches the list of coaches from Supabase
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] fetchCoaches called with userGoal: \(userGoal)")

        DispatchQueue.main.async { [weak self] in
            self?.isCoachesLoading = true
            self?.coachesErrorMessage = nil
        }
        
        Task {
            do {
                let response: [Coach] = try await supabase.database
                    .from("coaches")
                    .select()
                    .execute()
                    .value
                
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = response
                    self.selectedCoach = response.first(where: { $0.goal == userGoal })
                    completion(self.selectedCoach != nil)
                }
            } catch {
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = []
                    self.selectedCoach = nil
                    self.coachesErrorMessage = "Failed to fetch coaches: \(error.localizedDescription)"
                    completion(false)
                }
            }
        }
    }
    
    /// Fetches all coaches from Supabase (without filtering by goal)
    func fetchAllCoaches(completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] fetchAllCoaches called")

        DispatchQueue.main.async { [weak self] in
            self?.isCoachesLoading = true
            self?.coachesErrorMessage = nil
        }
        
        Task {
            do {
                let response: [Coach] = try await supabase.database
                    .from("coaches")
                    .select()
                    .execute()
                    .value
                
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = response
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = []
                    self.coachesErrorMessage = "Failed to fetch coaches: \(error.localizedDescription)"
                    completion(false)
                }
            }
        }
    }
    
    /// Fetches coaches by specific goal
    func fetchCoachesByGoal(_ goal: String, completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] fetchCoachesByGoal called with goal: \(goal)")

        DispatchQueue.main.async { [weak self] in
            self?.isCoachesLoading = true
            self?.coachesErrorMessage = nil
        }
        
        Task {
            do {
                let response: [Coach] = try await supabase.database
                    .from("coaches")
                    .select()
                    .eq("goal", value: goal)
                    .execute()
                    .value
                
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = response
                    self.selectedCoach = response.first
                    completion(!response.isEmpty)
                }
            } catch {
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = []
                    self.selectedCoach = nil
                    self.coachesErrorMessage = "Failed to fetch coaches: \(error.localizedDescription)"
                    completion(false)
                }
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func flushPendingUpdates() {
        guard !pendingUpdates.isEmpty else { return }
        
        let updates = pendingUpdates
        pendingUpdates.removeAll()
        
        // For now, just log the updates since we don't have a progress tracking table yet
        print("Would update \(updates.count) exercise progress items: \(updates)")
        
        // TODO: Implement progress tracking in Supabase
        // This would involve creating a progress tracking table and updating it
    }
}
