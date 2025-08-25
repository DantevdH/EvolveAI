import Foundation

// MARK: - Core Exercise Model
/// Represents a single exercise from the exercise database
struct Exercise: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let description: String?
    let video_url: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, description
        case video_url
    }
}

// MARK: - Database Structure Models (Core Entities)
/// Root workout plan model - represents a complete workout plan
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

/// Weekly schedule within a workout plan
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

/// Daily workout within a weekly schedule
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

/// Individual exercise within a daily workout (sets/reps/weight)
struct WorkoutExercise: Codable, Identifiable, Equatable {
    let id: Int
    let dailyWorkoutId: Int
    let exerciseId: Int
    var sets: Int
    var reps: [Int]
    var weight: [Double?]  // Array of optional doubles (each weight can be nil)
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

// MARK: - Complete Workout Structure (for API responses and data fetching)
/// Complete workout plan structure for API responses and database operations
struct CompleteWorkoutPlan: Codable, Equatable {
    var workoutPlan: WorkoutPlan
    var weeklySchedules: [WeeklySchedule]
    var dailyWorkouts: [DailyWorkout]
    var workoutExercises: [WorkoutExercise]
    var exercises: [Exercise]
}

// MARK: - AI-Generated Workout Models (for API responses from backend)
/// Workout plan generated from the AI backend
struct GeneratedWorkoutPlan {
    let title: String
    let summary: String
    let weeklySchedules: [GeneratedWeeklySchedule]
}

/// Weekly schedule generated from the AI backend
struct GeneratedWeeklySchedule {
    let weekNumber: Int
    let dailyWorkouts: [GeneratedDailyWorkout]
}

/// Daily workout generated from the AI backend
struct GeneratedDailyWorkout {
    let dayOfWeek: String
    let isRestDay: Bool
    let exercises: [GeneratedWorkoutExercise]
}

/// Exercise generated from the AI backend
struct GeneratedWorkoutExercise {
    let name: String
    let sets: Int
    let reps: [Int]
}

// MARK: - Database Insert Models (for creating new records)
/// Models for inserting new data into the database
struct WorkoutPlanInsert: Encodable {
    let user_profile_id: Int
    let title: String
    let summary: String
}

struct WeeklyScheduleInsert: Encodable {
    let workout_plan_id: Int
    let week_number: Int
}

struct DailyWorkoutInsert: Encodable {
    let weekly_schedule_id: Int
    let day_of_week: String
}

struct ExerciseInsert: Encodable {
    let name: String
    let description: String
    let video_url: String?
}

struct WorkoutExerciseInsert: Encodable {
    let daily_workout_id: Int
    let exercise_id: Int
    let sets: Int
    let reps: [Int]
    let weight: [Double?]  // Array of optional doubles (each weight can be nil)
}

// MARK: - Progress Tracking Models (for user progress updates)
/// Model for updating individual exercise progress
struct ExerciseProgressUpdate: Codable {
    let exerciseId: Int
    let isCompleted: Bool
    let weekNumber: Int
    
    enum CodingKeys: String, CodingKey {
        case exerciseId = "exercise_id"
        case isCompleted = "is_completed"
        case weekNumber = "week_number"
    }
}

/// Request model for updating multiple exercises at once
struct ProgressUpdateRequest: Codable {
    let updates: [ExerciseProgressUpdate]
}

// MARK: - API Response Models (for external API communication)
/// Response model for workout plan API calls
struct WorkoutPlanResponse: Codable {
    let workoutPlan: WorkoutPlan
    enum CodingKeys: String, CodingKey {
        case workoutPlan = "workout_plan"
    }
}

// MARK: - Legacy Workout Model (for backward compatibility with existing UI)
/// Legacy workout model for backward compatibility with existing UI components
struct Workout: Codable, Identifiable {
    let id: Int
    let name: String
    let exercises: [Exercise]
    let sets: Int
    let reps: String
    let weight: Double?
    
    /// Convert from new structure to legacy format
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
            self.reps = firstWorkoutExercise.reps.map(String.init).joined(separator: ",")
            self.weight = firstWorkoutExercise.weight.first ?? nil
        } else {
            self.sets = 0
            self.reps = ""
            self.weight = nil
        }
    }
}

// // MARK: - Legacy Workout Conversion Helper
// extension Workout {
//     /// Convert from daily workout to legacy workout format
//     static func fromDailyWorkout(_ dailyWorkout: DailyWorkout, exercises: [Exercise], workoutExercises: [WorkoutExercise]) -> Workout {
//         return Workout(from: dailyWorkout, exercises: exercises, workoutExercises: workoutExercises)
//     }
// }
