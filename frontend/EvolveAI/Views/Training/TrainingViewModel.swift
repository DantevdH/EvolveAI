import SwiftUI
import Combine

// MARK: - Training View Model
class TrainingViewModel: ObservableObject {
    @Published var currentWeekSelected: Int = 1 
    @Published var selectedDayIndex: Int = 0
    @Published var completedExercises: Set<Int> = []
    @Published var completedWorkouts: Set<Int> = []
    @Published var isShowingExerciseDetail = false
    @Published var selectedExercise: Exercise?
    
    private var workoutPlan: WorkoutPlan?
    private var completeWorkoutPlan: CompleteWorkoutPlan? {
        didSet {
            // Notify observers when the complete workout plan changes
            objectWillChange.send()
        }
    }
    
    init(workoutPlan: WorkoutPlan?) {
        self.workoutPlan = workoutPlan
        self.currentWeekSelected = TrainingViewModel.calculateCurrentWeek(from: workoutPlan)
        setupTodayAsDefault()
    }
    
    // Helper to calculate the real current week based on plan start date
    static func calculateCurrentWeek(from plan: WorkoutPlan?) -> Int {
        guard let plan = plan else { return 1 }
        let startDate = plan.createdAt ?? Date()
        let now = Date()
        let calendar = Calendar.current
        let weekDiff = calendar.dateComponents([.weekOfYear], from: startDate, to: now).weekOfYear ?? 0
        let result = 1 + weekDiff
        print("[DEBUG] Calculated current week: \(result) (startDate: \(plan.createdAt), today: \(now))")
        return result
    }
    
    func updateWorkoutPlan(_ plan: WorkoutPlan) {
        print("[DEBUG] updateWorkoutPlan called with plan ID: \(plan.id)")
        workoutPlan = plan
        setupTodayAsDefault()
    }
    
    func updateCompleteWorkoutPlan(_ completePlan: CompleteWorkoutPlan) {
        print("[DEBUG] updateCompleteWorkoutPlan called")
        completeWorkoutPlan = completePlan
        workoutPlan = completePlan.workoutPlan
        setupTodayAsDefault()
    }
    
    func setCurrentWeek(_ week: Int) {
        print("[DEBUG] setCurrentWeek called with week: \(week)")
        if let completePlan = completeWorkoutPlan,
           week > 0 && week <= completePlan.weeklySchedules.count {
            print("[DEBUG] Setting currentWeekSelected to \(week)")
            currentWeekSelected = week
        } else {
            print("[DEBUG] setCurrentWeek: invalid week \(week) for plan with weeks: \(completeWorkoutPlan?.weeklySchedules.count ?? 0)")
        }
    }
    
    var currentWeek: WeeklySchedule? {
        guard let completePlan = completeWorkoutPlan, completePlan.weeklySchedules.count > 0 else { return nil }
        let safeIndex = min(currentWeekSelected, completePlan.weeklySchedules.count) - 1
        guard safeIndex >= 0, safeIndex < completePlan.weeklySchedules.count else { return nil }
        return completePlan.weeklySchedules[safeIndex]
    }
    
    var selectedDayWorkout: DailyWorkout? {
        guard let week = currentWeek else { return nil }
        
        // Get daily workouts for this week
        let weekDailyWorkouts = completeWorkoutPlan?.dailyWorkouts.filter { $0.weeklyScheduleId == week.id } ?? []
        
        guard selectedDayIndex < weekDailyWorkouts.count else { return nil }
        return weekDailyWorkouts[selectedDayIndex]
    }
    
    var totalWeeks: Int {
        completeWorkoutPlan?.weeklySchedules.count ?? 0
    }
    
    var currentWeekNumber: Int {
        currentWeekSelected
    }
    
    func previousWeek() {
        print("[DEBUG] previousWeek called. currentWeekSelected before: \(currentWeekSelected)")
        if currentWeekSelected > 1 {
            currentWeekSelected -= 1
            selectedDayIndex = 0
            print("[DEBUG] previousWeek: currentWeekSelected after: \(currentWeekSelected), selectedDayIndex reset to 0")
        } else {
            print("[DEBUG] previousWeek: already at first week")
        }
    }
    
    func nextWeek() {
        print("[DEBUG] nextWeek called. currentWeekSelected before: \(currentWeekSelected), totalWeeks: \(totalWeeks)")
        if currentWeekSelected < totalWeeks {
            currentWeekSelected += 1
            selectedDayIndex = 0
            print("[DEBUG] nextWeek: currentWeekSelected after: \(currentWeekSelected), selectedDayIndex reset to 0")
        } else {
            print("[DEBUG] nextWeek: already at last week")
        }
    }
    
    func selectDay(_ index: Int) {
        selectedDayIndex = index
    }
    
    func toggleExerciseCompletion(
        exerciseId: Int, 
        userManager: UserManager, 
        workoutManager: WorkoutManager
    ) {
        // This method is no longer used - exercises are completed automatically when all weights are filled
        print("[DEBUG] Manual exercise completion is disabled - exercises complete automatically when all weights are filled")
    }
    
    func showExerciseDetail(_ exercise: Exercise) {
        selectedExercise = exercise
        isShowingExerciseDetail = true
    }
    
    func markWorkoutComplete(
        _ workout: DailyWorkout, 
        userManager: UserManager, 
        workoutManager: WorkoutManager
    ) {
        let isCurrentlyCompleted = isWorkoutCompleted(workout.id)
        
        if isCurrentlyCompleted {
            // Mark all exercises as incomplete
            let workoutExercises = getWorkoutExercises(for: workout.id)
            for workoutExercise in workoutExercises {
                completedExercises.remove(workoutExercise.exerciseId)
                workoutManager.updateExerciseCompletion(
                    exerciseId: workoutExercise.exerciseId,
                    isCompleted: false,
                    weekNumber: currentWeekNumber
                )
            }
            completedWorkouts.remove(workout.id)
        } else {
            // Mark all exercises as complete
            let workoutExercises = getWorkoutExercises(for: workout.id)
            for workoutExercise in workoutExercises {
                completedExercises.insert(workoutExercise.exerciseId)
                workoutManager.updateExerciseCompletion(
                    exerciseId: workoutExercise.exerciseId,
                    isCompleted: true,
                    weekNumber: currentWeekNumber
                )
            }
            completedWorkouts.insert(workout.id)
        }
        
        updateWorkoutCompletionStatus()
        
        print("DEBUG: Workout \(workout.id) completion toggled. Now completed: \(!isCurrentlyCompleted)")
    }
    
    func isExerciseCompleted(_ exerciseId: Int) -> Bool {
        // Exercise is completed when all sets have weights filled in
        guard let completePlan = completeWorkoutPlan else { return false }
        
        if let workoutExercise = completePlan.workoutExercises.first(where: { $0.exerciseId == exerciseId }) {
            // Check if all sets have weights filled in
            return workoutExercise.weight.allSatisfy { $0 != nil }
        }
        
        return false
    }
    
    func isWorkoutCompleted(_ workoutId: Int) -> Bool {
        guard let workout = findWorkoutById(workoutId) else { return false }
        
        // Check if this is a rest day (no exercises)
        let workoutExercises = getWorkoutExercises(for: workout.id)
        if workoutExercises.isEmpty {
            return true // Rest days are automatically "completed"
        }
        
        // Check if all exercises in this workout are completed (all weights filled)
        let allExerciseIds = Set(workoutExercises.map { $0.exerciseId })
        return allExerciseIds.allSatisfy { isExerciseCompleted($0) }
    }
    
    private func updateWorkoutCompletionStatus() {
        guard let completePlan = completeWorkoutPlan else { return }
        
        // Update completed workouts based on exercise completion
        for dailyWorkout in completePlan.dailyWorkouts {
            if isWorkoutCompleted(dailyWorkout.id) {
                completedWorkouts.insert(dailyWorkout.id)
            } else {
                completedWorkouts.remove(dailyWorkout.id)
            }
        }
    }
    
    private func findWorkoutById(_ workoutId: Int) -> DailyWorkout? {
        return completeWorkoutPlan?.dailyWorkouts.first { $0.id == workoutId }
    }
    
    private func getWorkoutExercises(for dailyWorkoutId: Int) -> [WorkoutExercise] {
        return completeWorkoutPlan?.workoutExercises.filter { $0.dailyWorkoutId == dailyWorkoutId } ?? []
    }
    
    private func getExercise(for exerciseId: Int) -> Exercise? {
        return completeWorkoutPlan?.exercises.first { $0.id == exerciseId }
    }
    
    // Helper method to get exercises for a specific daily workout
    func getExercisesForWorkout(_ workout: DailyWorkout) -> [Exercise] {
        let workoutExercises = getWorkoutExercises(for: workout.id)
        return workoutExercises.compactMap { workoutExercise in
            getExercise(for: workoutExercise.exerciseId)
        }
    }
    
    // Helper method to get workout exercise details for a specific exercise
    func getWorkoutExerciseDetails(for exerciseId: Int, in workout: DailyWorkout) -> WorkoutExercise? {
        return getWorkoutExercises(for: workout.id).first { $0.exerciseId == exerciseId }
    }
    
    // Helper method to get daily workouts for a specific week
    func getDailyWorkoutsForWeek(_ week: WeeklySchedule) -> [DailyWorkout] {
        return completeWorkoutPlan?.dailyWorkouts.filter { $0.weeklyScheduleId == week.id } ?? []
    }
    
    // Helper method to check if a daily workout is a rest day
    func isRestDay(_ workout: DailyWorkout) -> Bool {
        let workoutExercises = getWorkoutExercises(for: workout.id)
        return workoutExercises.isEmpty
    }
    
    private func setupTodayAsDefault() {
        // Set to current day of week (0 = Monday, 6 = Sunday)
        let calendar = Calendar.current
        let today = Date()
        let dayOfWeek = calendar.component(.weekday, from: today)
        
        // Convert to 0-based index (Monday = 0)
        selectedDayIndex = (dayOfWeek + 5) % 7
    }
    
    func setCurrentWeekSelected(_ week: Int) {
        print("[DEBUG] setCurrentWeekSelected called with week: \(week)")
        currentWeekSelected = week
    }
    
    // Initialize from server data
    func loadFromServerData() {
        // For now, we'll start with empty completion status
        // TODO: Implement loading completion status from Supabase when you add progress tracking
        completedExercises = []
        completedWorkouts = []
    }
    
    // MARK: - Set Management
    
    /// Update the details for a specific set (reps and weight) or manage sets
    func updateSetDetails(exerciseId: Int, setIndex: Int, reps: Int, weight: Double?) {
        print("[DEBUG] Updating set details for exercise \(exerciseId): setIndex=\(setIndex), reps=\(reps), weight=\(weight?.description ?? "nil")")
        
        // Handle special cases for set management
        if setIndex == -1 {
            // Add new set
            addSetToExercise(exerciseId: exerciseId)
            return
        } else if setIndex == -2 {
            // Remove last set
            removeSetFromExercise(exerciseId: exerciseId)
            return
        }
        
        // Update the local completeWorkoutPlan data
        guard let completePlan = completeWorkoutPlan else {
            print("[DEBUG] No complete workout plan available")
            return
        }
        
        // Find the workout exercise for this exercise
        if let workoutExerciseIndex = completePlan.workoutExercises.firstIndex(where: { $0.exerciseId == exerciseId }) {
            var updatedWorkoutExercise = completePlan.workoutExercises[workoutExerciseIndex]
            
            // Update reps for this set
            if setIndex < updatedWorkoutExercise.reps.count {
                updatedWorkoutExercise.reps[setIndex] = reps
            }
            
            // Update weight for this set
            if setIndex < updatedWorkoutExercise.weight.count {
                updatedWorkoutExercise.weight[setIndex] = weight
            }
            
            // Update the local data
            completeWorkoutPlan?.workoutExercises[workoutExerciseIndex] = updatedWorkoutExercise
            
            print("[DEBUG] Successfully updated set details locally")
            
            // Sync to backend database
            Task {
                do {
                    try await NetworkService().updateWorkoutExerciseDetails(
                        workoutExerciseId: updatedWorkoutExercise.id,
                        sets: updatedWorkoutExercise.sets,
                        reps: updatedWorkoutExercise.reps,
                        weight: updatedWorkoutExercise.weight
                    )
                    print("[DEBUG] Successfully synced set details to backend")
                } catch {
                    print("[DEBUG] Failed to sync set details to backend: \(error)")
                    // TODO: Handle error - could show user notification or retry
                }
            }
        } else {
            print("[DEBUG] Workout exercise not found for exercise ID: \(exerciseId)")
        }
    }
    
    /// Add a new set to an exercise
    private func addSetToExercise(exerciseId: Int) {
        print("[DEBUG] Adding new set to exercise \(exerciseId)")
        
        guard let completePlan = completeWorkoutPlan else { return }
        
        if let workoutExerciseIndex = completePlan.workoutExercises.firstIndex(where: { $0.exerciseId == exerciseId }) {
            var updatedWorkoutExercise = completePlan.workoutExercises[workoutExerciseIndex]
            
            // Add new set with default values
            updatedWorkoutExercise.reps.append(10) // Default to 10 reps
            updatedWorkoutExercise.weight.append(nil) // Default to no weight
            updatedWorkoutExercise.sets += 1 // Increment sets count
            
            // Update the local data
            completeWorkoutPlan?.workoutExercises[workoutExerciseIndex] = updatedWorkoutExercise
            
            // Sync to backend
            syncExerciseToBackend(updatedWorkoutExercise)
        }
    }
    
    /// Remove the last set from an exercise
    private func removeSetFromExercise(exerciseId: Int) {
        print("[DEBUG] Removing last set from exercise \(exerciseId)")
        
        guard let completePlan = completeWorkoutPlan else { return }
        
        if let workoutExerciseIndex = completePlan.workoutExercises.firstIndex(where: { $0.exerciseId == exerciseId }) {
            var updatedWorkoutExercise = completePlan.workoutExercises[workoutExerciseIndex]
            
            // Only remove if we have more than 1 set
            if updatedWorkoutExercise.sets > 1 {
                updatedWorkoutExercise.reps.removeLast()
                updatedWorkoutExercise.weight.removeLast()
                updatedWorkoutExercise.sets -= 1 // Decrement sets count
                
                // Update the local data
                completeWorkoutPlan?.workoutExercises[workoutExerciseIndex] = updatedWorkoutExercise
                
                // Sync to backend
                syncExerciseToBackend(updatedWorkoutExercise)
            }
        }
    }
    
    /// Sync exercise changes to backend
    private func syncExerciseToBackend(_ workoutExercise: WorkoutExercise) {
        Task {
            do {
                try await NetworkService().updateWorkoutExerciseDetails(
                    workoutExerciseId: workoutExercise.id,
                    sets: workoutExercise.sets,
                    reps: workoutExercise.reps,
                    weight: workoutExercise.weight
                )
                print("[DEBUG] Successfully synced exercise changes to backend")
            } catch {
                print("[DEBUG] Failed to sync exercise changes to backend: \(error)")
            }
        }
    }
}
