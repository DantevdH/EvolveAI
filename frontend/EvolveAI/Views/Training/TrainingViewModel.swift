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
        print("[DEBUG] updateWorkoutPlan called with plan containing weeks: \(plan.weekly_schedules.map { $0.week_number })")
        workoutPlan = plan
        setupTodayAsDefault()
    }
    
    func setCurrentWeek(_ week: Int) {
        print("[DEBUG] setCurrentWeek called with week: \(week)")
        if let plan = workoutPlan,
           week > 0 && week <= plan.weekly_schedules.count {
            print("[DEBUG] Setting currentWeekIndex to \(week - 1)")
            // currentWeekIndex = week - 1 // This line is removed
        } else {
            print("[DEBUG] setCurrentWeek: invalid week \(week) for plan with weeks: \(workoutPlan?.weekly_schedules.count ?? 0)")
        }
    }
    
    var currentWeek: WeeklySchedule? {
        guard let plan = workoutPlan, plan.weekly_schedules.count > 0 else { return nil }
        let safeIndex = min(currentWeekSelected, plan.weekly_schedules.count) - 1
        guard safeIndex >= 0, safeIndex < plan.weekly_schedules.count else { return nil }
        return plan.weekly_schedules[safeIndex]
    }
    
    var selectedDayWorkout: DailyWorkout? {
        guard let week = currentWeek,
              selectedDayIndex < week.daily_workouts.count else { return nil }
        return week.daily_workouts[selectedDayIndex]
    }
    
    var totalWeeks: Int {
        workoutPlan?.weekly_schedules.count ?? 0
    }
    
    var currentWeekNumber: Int {
        currentWeekSelected
    }
    
    func previousWeek() {
        print("[DEBUG] previousWeek called. currentWeekIndex before: \(currentWeekSelected)")
        if currentWeekSelected > 1 {
            currentWeekSelected -= 1
            selectedDayIndex = 0
            print("[DEBUG] previousWeek: currentWeekIndex after: \(currentWeekSelected), selectedDayIndex reset to 0")
        } else {
            print("[DEBUG] previousWeek: already at first week")
        }
    }
    
    func nextWeek() {
        print("[DEBUG] nextWeek called. currentWeekIndex before: \(currentWeekSelected), totalWeeks: \(totalWeeks)")
        if currentWeekSelected < totalWeeks {
            currentWeekSelected += 1
            selectedDayIndex = 0
            print("[DEBUG] nextWeek: currentWeekIndex after: \(currentWeekSelected), selectedDayIndex reset to 0")
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
        
        // Send to WorkoutManager for batch processing (only if we have auth token)
        #if DEBUG
        print("DEBUG: Toggle exercise \(exerciseId) to \(isCompleted)")
        // In debug mode, just update local state
        #else
        guard let authToken = userManager.authToken else { 
            print("No auth token available")
            return 
        }
        workoutManager.updateExerciseCompletion(
            exerciseId: exerciseId,
            isCompleted: isCompleted,
            weekNumber: currentWeekNumber,
            authToken: authToken
        )
        #endif
        
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
            for exercise in workout.exercises {
                completedExercises.remove(exercise.id)
                #if !DEBUG
                guard let authToken = userManager.authToken else { continue }
                workoutManager.updateExerciseCompletion(
                    exerciseId: exercise.id,
                    isCompleted: false,
                    weekNumber: currentWeekNumber,
                    authToken: authToken
                )
                #endif
            }
            completedWorkouts.remove(workout.id)
        } else {
            // Mark all exercises as complete
            for exercise in workout.exercises {
                completedExercises.insert(exercise.id)
                #if !DEBUG
                guard let authToken = userManager.authToken else { continue }
                workoutManager.updateExerciseCompletion(
                    exerciseId: exercise.id,
                    isCompleted: true,
                    weekNumber: currentWeekNumber,
                    authToken: authToken
                )
                #endif
            }
            completedWorkouts.insert(workout.id)
        }
        
        updateWorkoutCompletionStatus()
        
        #if DEBUG
        print("DEBUG: Workout \(workout.id) completion toggled. Now completed: \(!isCurrentlyCompleted)")
        #endif
    }
    
    func isExerciseCompleted(_ exerciseId: Int) -> Bool {
        completedExercises.contains(exerciseId)
    }
    
    func isWorkoutCompleted(_ workoutId: Int) -> Bool {
        guard let workout = findWorkoutById(workoutId) else { return false }
        
        // Rest days are automatically "completed"
        if workout.isRestDay {
            return true
        }
        
        // Check if all exercises in this workout are completed
        let allExerciseIds = Set(workout.exercises.map { $0.id })
        return allExerciseIds.isSubset(of: completedExercises)
    }
    
    private func updateWorkoutCompletionStatus() {
        guard let plan = workoutPlan else { return }
        
        // Update completed workouts based on exercise completion
        for weeklySchedule in plan.weekly_schedules {
            for dailyWorkout in weeklySchedule.daily_workouts {
                if isWorkoutCompleted(dailyWorkout.id) {
                    completedWorkouts.insert(dailyWorkout.id)
                } else {
                    completedWorkouts.remove(dailyWorkout.id)
                }
            }
        }
    }
    
    private func findWorkoutById(_ workoutId: Int) -> DailyWorkout? {
        guard let plan = workoutPlan else { return nil }
        
        for weeklySchedule in plan.weekly_schedules {
            for dailyWorkout in weeklySchedule.daily_workouts {
                if dailyWorkout.id == workoutId {
                    return dailyWorkout
                }
            }
        }
        return nil
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
        guard let plan = workoutPlan else { return }
        
        // Extract completion status from server data
        var exerciseCompletions: Set<Int> = []
        var workoutCompletions: Set<Int> = []
        
        for weeklySchedule in plan.weekly_schedules {
            for dailyWorkout in weeklySchedule.daily_workouts {
                // Check if workout is completed (from server)
                if dailyWorkout.isCompleted {
                    workoutCompletions.insert(dailyWorkout.id)
                }
                
                // Check individual exercises
                for exercise in dailyWorkout.exercises {
                    if exercise.isCompleted {
                        exerciseCompletions.insert(exercise.id)
                    }
                }
            }
        }
        
        completedExercises = exerciseCompletions
        completedWorkouts = workoutCompletions
    }
}