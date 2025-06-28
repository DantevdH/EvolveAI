import Foundation

// This struct will temporarily hold all the user's answers
// during the onboarding process.
struct UserProfile {
    // Properties for GoalsStep
    var primaryGoal: String = ""
    
    // Properties for ExperienceStep
    var experienceLevel: String = ""
    
    // Properties for ScheduleStep
    var daysPerWeek: Int = 3
    var minutesPerSession: Int = 60
    
    // Property for EquipmentStep (changed from [String] to String for single selection)
    var equipment: String = ""
    
    // Properties for PersonalInfoStep
    var age: Int = 30
    var weight: Double = 150.0
    var height: Double = 70.0
    var gender: String = ""
}
