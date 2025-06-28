import Foundation
import Combine

// UserManager.swift
// This class will manage all data related to the user.
class UserManager: ObservableObject {
    // @Published tells SwiftUI to update any views using this property when it changes.
    @Published var userName: String = "User"
    @Published var goal: String = "General Fitness"
    @Published var experienceLevel: String = "Beginner"
    @Published var isOnboardingComplete: Bool = false
    
    // You would add more properties here for personal stats, preferences, etc.
    init() {
        // You can load user data from storage here when the app starts.
    }
    
    func completeOnboarding(with profile: UserProfile) {
        // Here you would save the user's profile data.
        // For now, we'll just update the properties.
        self.goal = profile.primaryGoal
        self.experienceLevel = profile.experienceLevel
        
        // Most importantly, set the flag to true to switch to the main app view.
        self.isOnboardingComplete = true
    }
}


