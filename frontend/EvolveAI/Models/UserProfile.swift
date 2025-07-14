import Foundation

// This struct will temporarily hold all the user's answers
// during the onboarding process.
struct UserProfile: Codable {
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
