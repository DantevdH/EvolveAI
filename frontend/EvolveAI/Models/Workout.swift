import Foundation

// MARK: - Workout Plan (Root)
struct WorkoutPlan: Codable, Identifiable, Equatable {
    let id: Int
    let userProfileId: Int
    let title: String
    let summary: String
    @ISO8601DateValue var createdAt: Date
    @ISO8601DateValue var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userProfileId = "user_profile_id"
        case title, summary
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    static func == (lhs: WorkoutPlan, rhs: WorkoutPlan) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Weekly Schedule
struct WeeklySchedule: Codable, Identifiable, Equatable {
    let id: Int
    let workoutPlanId: Int
    let weekNumber: Int
    @ISO8601DateValue var createdAt: Date
    @ISO8601DateValue var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case workoutPlanId = "workout_plan_id"
        case weekNumber = "week_number"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Daily Workout
struct DailyWorkout: Codable, Identifiable, Equatable {
    let id: Int
    let weeklyScheduleId: Int
    let dayOfWeek: String
    @ISO8601DateValue var createdAt: Date
    @ISO8601DateValue var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case weeklyScheduleId = "weekly_schedule_id"
        case dayOfWeek = "day_of_week"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Workout Exercise (Sets/Reps/Weight)
struct WorkoutExercise: Codable, Identifiable, Equatable {
    let id: Int
    let dailyWorkoutId: Int
    let exerciseId: Int
    let sets: Int
    let reps: String
    let weight: Double?
    @ISO8601DateValue var createdAt: Date
    @ISO8601DateValue var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case dailyWorkoutId = "daily_workout_id"
        case exerciseId = "exercise_id"
        case sets
        case reps
        case weight
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Complete Workout Structure (for API responses)
struct CompleteWorkoutPlan: Codable, Equatable {
    let workoutPlan: WorkoutPlan
    let weeklySchedules: [WeeklySchedule]
    let dailyWorkouts: [DailyWorkout]
    let workoutExercises: [WorkoutExercise]
    let exercises: [Exercise]
}

// MARK: - Legacy Workout Model (for backward compatibility)
struct Workout: Codable, Identifiable {
    let id: Int
    let name: String
    let exercises: [Exercise]
    let sets: Int
    let reps: String
    let weight: Double?
    
    // Convert from new structure to legacy format
    init(from dailyWorkout: DailyWorkout, exercises: [Exercise], workoutExercises: [WorkoutExercise]) {
        self.id = dailyWorkout.id
        self.name = dailyWorkout.dayOfWeek
        
        // Map workout exercises to exercises with their sets/reps/weight
        self.exercises = workoutExercises.compactMap { workoutExercise in
            exercises.first { $0.id == workoutExercise.exerciseId }
        }
        
        // For simplicity, use the first workout exercise's data
        if let firstWorkoutExercise = workoutExercises.first {
            self.sets = firstWorkoutExercise.sets
            self.reps = firstWorkoutExercise.reps
            self.weight = firstWorkoutExercise.weight
        } else {
            self.sets = 0
            self.reps = ""
            self.weight = nil
        }
    }
}
