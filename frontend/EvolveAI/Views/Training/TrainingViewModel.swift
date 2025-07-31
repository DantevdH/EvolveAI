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
    private var completeWorkoutPlan: CompleteWorkoutPlan?
    
    init(workoutPlan: WorkoutPlan?) {
        self.workoutPlan = workoutPlan
        self.currentWeekSelected = TrainingViewModel.calculateCurrentWeek(from: workoutPlan)
        setupTodayAsDefault()
    }
    
    // Helper to calculate the real current week based on plan start date
    static func calculateCurrentWeek(from plan: WorkoutPlan?) -> Int {
        guard let plan = plan else { return 1 }
        let startDate = ISO8601DateFormatter().date(from: plan.createdAt) ?? Date()
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
        // Update local state immediately for UI responsiveness
        if completedExercises.contains(exerciseId) {
            completedExercises.remove(exerciseId)
        } else {
            completedExercises.insert(exerciseId)
        }
        
        let isCompleted = completedExercises.contains(exerciseId)
        
        // Send to WorkoutManager for batch processing
        workoutManager.updateExerciseCompletion(
            exerciseId: exerciseId,
            isCompleted: isCompleted,
            weekNumber: currentWeekNumber
        )
        
        // Update workout completion status
        updateWorkoutCompletionStatus()
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
        completedExercises.contains(exerciseId)
    }
    
    func isWorkoutCompleted(_ workoutId: Int) -> Bool {
        guard let workout = findWorkoutById(workoutId) else { return false }
        
        // Check if this is a rest day (no exercises)
        let workoutExercises = getWorkoutExercises(for: workout.id)
        if workoutExercises.isEmpty {
            return true // Rest days are automatically "completed"
        }
        
        // Check if all exercises in this workout are completed
        let allExerciseIds = Set(workoutExercises.map { $0.exerciseId })
        return allExerciseIds.isSubset(of: completedExercises)
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
}