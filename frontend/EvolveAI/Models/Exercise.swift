import Foundation

struct Exercise: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
}

struct WorkoutExercise: Codable, Identifiable, Equatable {
    let id: Int
    let exercise: Exercise
    let sets: Int
    let reps: String
}

struct DailyWorkout: Codable, Identifiable, Equatable {
    let id: Int
    let day_of_week: String
    let exercises: [WorkoutExercise]
    
    var isRestDay: Bool {
        return exercises.isEmpty
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, day_of_week
        case exercises = "workout_exercises" 
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
    let user_profile: UserProfile
    let weekly_schedules: [WeeklySchedule]
    
    static func == (lhs: WorkoutPlan, rhs: WorkoutPlan) -> Bool {
        lhs.id == rhs.id
    }
}
