import Foundation

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

// MARK: - Workout Plan Models
struct GeneratedWorkoutPlan {
    let title: String
    let summary: String
    let weeklySchedules: [GeneratedWeeklySchedule]
}

struct GeneratedWeeklySchedule {
    let weekNumber: Int
    let dailyWorkouts: [GeneratedDailyWorkout]
}

struct GeneratedDailyWorkout {
    let dayOfWeek: String
    let isRestDay: Bool
    let exercises: [GeneratedWorkoutExercise]
}

struct GeneratedWorkoutExercise {
    let name: String
    let sets: Int
    let reps: String
}

// MARK: - Database Insert Models
struct WorkoutPlanInsert: Encodable {
    let user_profile_id: Int
    let title: String
    let summary: String
    // Removed created_at and updated_at - Supabase handles these automatically
    // with default now() and the update trigger
}

struct WeeklyScheduleInsert: Encodable {
    let workout_plan_id: Int
    let week_number: Int
    // Removed created_at and updated_at - Supabase handles these automatically
    // with default now() and the update trigger
}

struct DailyWorkoutInsert: Encodable {
    let weekly_schedule_id: Int
    let day_of_week: String
    // Removed created_at and updated_at - Supabase handles these automatically
    // with default now() and the update trigger
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
    let reps: String
    let weight: Double?
    // Removed created_at and updated_at - Supabase handles these automatically
    // with default now() and the update trigger
}

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

struct ProgressUpdateRequest: Codable {
    let updates: [ExerciseProgressUpdate]
}

struct WorkoutPlanResponse: Codable {
    let workoutPlan: WorkoutPlan
    enum CodingKeys: String, CodingKey {
        case workoutPlan = "workout_plan"
    }
}
