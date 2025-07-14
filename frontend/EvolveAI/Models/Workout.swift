import Foundation

struct Workout: Identifiable {
    let id = UUID()
    let name: String
    let exercises: [String]
}

// Example data
let mockWorkouts = [
    Workout(name: "Day 1: Upper Body Strength", exercises: ["Bench Press", "Pull-ups", "Overhead Press"]),
    Workout(name: "Day 2: Cardio & Core", exercises: ["Running", "Plank", "Crunches"])
]
