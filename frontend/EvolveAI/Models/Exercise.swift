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
