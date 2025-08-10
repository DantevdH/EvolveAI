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

// Database model that matches the Supabase schema exactly
struct UserProfile: Codable {
    // User input fields (mutable for onboarding)
    var username: String = ""
    var primaryGoal: String = ""
    var primaryGoalDescription: String = ""
    var experienceLevel: String = ""
    var daysPerWeek: Int = 3
    var minutesPerSession: Int = 60
    var equipment: String = ""
    var age: Int = 30
    var weight: Double = 70.0
    var weightUnit: String = "kg"
    var height: Double = 170.0
    var heightUnit: String = "cm"
    var gender: String = ""
    var hasLimitations: Bool = false
    var limitationsDescription: String = ""
    var finalChatNotes: String = ""
    
    // Database fields (read-only)
    let id: Int?
    let userId: UUID?
    let coachId: Int?
    let createdAt: Date?
    let updatedAt: Date?
    
    // Coding keys to map between snake_case (database) and camelCase (Swift)
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case username
        case primaryGoal = "primary_goal"
        case primaryGoalDescription = "primary_goal_description"
        case coachId = "coach_id"
        case experienceLevel = "experience_level"
        case daysPerWeek = "days_per_week"
        case minutesPerSession = "minutes_per_session"
        case equipment
        case age
        case weight
        case weightUnit = "weight_unit"
        case height
        case heightUnit = "height_unit"
        case gender
        case hasLimitations = "has_limitations"
        case limitationsDescription = "limitations_description"
        case finalChatNotes = "final_chat_notes"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    // Convenience initializer for creating a new profile during onboarding
    init(userId: UUID) {
        self.userId = userId
        self.id = nil
        self.coachId = nil
        self.createdAt = nil
        self.updatedAt = nil
        // All other fields use their default values
    }
    
    // Default initializer for creating an empty profile (used as fallback)
    init() {
        self.userId = nil
        self.id = nil
        self.coachId = nil
        self.createdAt = nil
        self.updatedAt = nil
        // All other fields use their default values
    }
    
    // Initializer for creating a profile with all values
    init(userId: UUID, username: String, primaryGoal: String, primaryGoalDescription: String, coachId: Int? = nil, experienceLevel: String, daysPerWeek: Int, minutesPerSession: Int, equipment: String, age: Int, weight: Double, weightUnit: String, height: Double, heightUnit: String, gender: String, hasLimitations: Bool, limitationsDescription: String, finalChatNotes: String) {
        self.userId = userId
        self.username = username
        self.primaryGoal = primaryGoal
        self.primaryGoalDescription = primaryGoalDescription
        self.coachId = coachId
        self.experienceLevel = experienceLevel
        self.daysPerWeek = daysPerWeek
        self.minutesPerSession = minutesPerSession
        self.equipment = equipment
        self.age = age
        self.weight = weight
        self.weightUnit = weightUnit
        self.height = height
        self.heightUnit = heightUnit
        self.gender = gender
        self.hasLimitations = hasLimitations
        self.limitationsDescription = limitationsDescription
        self.finalChatNotes = finalChatNotes
        self.id = nil
        self.createdAt = nil
        self.updatedAt = nil
    }
}


