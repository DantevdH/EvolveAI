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

struct WorkoutExercise: Codable, Identifiable, Equatable {
    let id: Int
    let exercise: Exercise
    let sets: Int
    let reps: String
    let isCompleted: Bool
    let progressId: Int?
    
    enum CodingKeys: String, CodingKey {
        case id, exercise, sets, reps
        case isCompleted = "is_completed"
        case progressId = "progress_id"
    }
}

struct DailyWorkout: Codable, Identifiable, Equatable {
    let id: Int
    let day_of_week: String
    let exercises: [WorkoutExercise]
    let isCompleted: Bool
    let weekNumber: Int
    
    var isRestDay: Bool {
        return exercises.isEmpty
    }
    
    enum CodingKeys: String, CodingKey {
        case id, day_of_week
        case exercises = "workout_exercises"
        case isCompleted = "is_completed"
        case weekNumber = "week_number"
    }
}

struct WeeklySchedule: Codable, Identifiable, Equatable {
    let id: Int
    let week_number: Int
    let daily_workouts: [DailyWorkout]
}

struct WorkoutPlan: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let summary: String
    let totalWeeks: Int
    let createdAt: String
    let updatedAt: String
    let weekly_schedules: [WeeklySchedule]
    
    enum CodingKeys: String, CodingKey {
        case id, title, summary
        case totalWeeks = "total_weeks"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case weekly_schedules
    }
    
    static func == (lhs: WorkoutPlan, rhs: WorkoutPlan) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Progress Tracking Models

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
