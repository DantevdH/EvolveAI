import SwiftUI

let mockUserProfile = UserProfile(
    userId: UUID(),
    username: "Dante",
    primaryGoal: "Increase Strength",
    primaryGoalDescription: "Focus on increasing raw power and lifting heavier.",
    coachId: 3, // Coach Titan
    experienceLevel: "Intermediate",
    daysPerWeek: 3,
    minutesPerSession: 60,
    equipment: "Full Gym",
    age: 32,
    weight: 85.5,
    weightUnit: "kg",
    height: 182,
    heightUnit: "cm",
    gender: "Male",
    hasLimitations: false,
    limitationsDescription: "",
    finalChatNotes: "User is motivated and ready to start. Wants to focus on compound lifts."
)