import Foundation

enum ExperienceLevel: String, CaseIterable, Identifiable {
    case beginner
    case intermediate
    case advanced
    
    // The 'id' for Identifiable conformance is simply the case itself.
    var id: Self { self }
    
    // Title for display in the UI.
    var title: String {
        switch self {
        case .beginner: return "Beginner"
        case .intermediate: return "Intermediate"
        case .advanced: return "Advanced"
        }
    }
    
    // Description for display in the UI.
    var description: String {
        switch self {
        case .beginner: return "Just starting my fitness journey"
        case .intermediate: return "I work out regularly with some experience"
        case .advanced: return "I'm experienced with training and nutrition"
        }
    }
    
    var infoText: String {
        switch self {
        case .beginner:
            return "Choose this if you're new to structured workouts or have been inactive for a while. We'll focus on building a solid foundation."
        case .intermediate:
            return "Choose this if you exercise 2-4 times a week and are comfortable with common exercises. We'll help you break through plateaus."
        case .advanced:
            return "Choose this if you have significant training experience and clear performance goals. The program will be demanding and highly specific."
        }
    }
}

// This struct will temporarily hold all the user's answers
// during the onboarding process.
struct UserProfile: Codable {

    var username: String = ""
    // Properties for GoalsStep
    var primaryGoal: String = ""

    var primaryGoalDescription: String = ""
    
    // Properties for ExperienceStep
    var experienceLevel: String = ""
    
    // Properties for ScheduleStep
    var daysPerWeek: Int = 3
    var minutesPerSession: Int = 60
    
    // Property for EquipmentStep (changed from [String] to String for single selection)
    var equipment: String = ""
    
    // Properties for PersonalInfoStep
    var age: Int = 30

    var weight: Double = 70.0
    var weightUnit: String = "kg"
    var height: Double = 70.0
    var heightUnit: String = "cm"
    var gender: String = ""
    
    var hasLimitations: Bool = false
    var limitationsDescription: String = ""
    
    var finalChatNotes = ""
}
