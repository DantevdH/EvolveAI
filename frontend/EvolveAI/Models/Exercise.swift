import Foundation

// Exercise now only contains descriptive info
struct Exercise: Codable, Identifiable {
    let id = UUID()
    let name: String
    let description: String?
    let videoUrl: String?

    enum CodingKeys: String, CodingKey {
        case name, description
        case videoUrl = "video_url"
    }
}

// This new struct represents an exercise inside a workout
struct WorkoutExercise: Codable, Identifiable {
    let id = UUID()
    let exercise: Exercise
    let sets: Int
    let reps: String
}

struct DailyWorkout: Codable, Identifiable {
    let id = UUID()
    let dayOfWeek: String
    // This now holds the list of exercises with their specific sets/reps
    let workoutExercises: [WorkoutExercise]

    enum CodingKeys: String, CodingKey {
        case dayOfWeek = "day_of_week"
        case workoutExercises = "workout_exercises"
    }
}

struct WeeklySchedule: Codable, Identifiable {
    let id = UUID()
    let weekNumber: Int
    let dailyWorkouts: [DailyWorkout]

    enum CodingKeys: String, CodingKey {
        case weekNumber = "week_number"
        case dailyWorkouts = "daily_workouts"
    }
}

struct WorkoutPlan: Codable, Identifiable, Equatable {
    // An ID is necessary for SwiftUI to uniquely identify this view's state.
    // If your API provides an ID, use that instead of UUID().
    let id = UUID()
    let title: String
    let summary: String
    let weeklySchedules: [WeeklySchedule]

    enum CodingKeys: String, CodingKey {
        // We exclude `id` from Codable as it's a client-side property.
        case title, summary
        case weeklySchedules = "weekly_schedules"
    }
    
    static func == (lhs: WorkoutPlan, rhs: WorkoutPlan) -> Bool {
        lhs.id == rhs.id
    }
}
