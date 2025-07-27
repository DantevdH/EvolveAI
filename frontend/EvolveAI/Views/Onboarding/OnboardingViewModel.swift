//
//  OnboardingViewModel.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//

import SwiftUI

class OnboardingViewModel: ObservableObject {
    @Published var currentStep = 0
    @Published var userProfile = UserProfile()
    @Published var isGenerating = false
    @Published var isGeneratingPlan = false
    @Published var availableCoaches: [Coach] = []
    @Published var showErrorAlert = false
    @Published var errorMessage = ""

    private let networkService: NetworkServiceProtocol
    let userManager: UserManagerProtocol
    let workoutManager: WorkoutManagerProtocol
    
    let levels = ExperienceLevel.allCases
    
    init(networkService: NetworkServiceProtocol = NetworkService(), userManager: UserManagerProtocol, workoutManager: WorkoutManagerProtocol) {
        self.networkService = networkService
        self.userManager = userManager
        self.workoutManager = workoutManager
    }

    func nextStep() {
        currentStep += 1
    }
    
    func previousStep() {
        currentStep -= 1
    }
    
    func selectExperienceLevel(_ level: ExperienceLevel) {
            userProfile.experienceLevel = level.rawValue
        }
    
    var isNextButtonDisabled: Bool {
        switch self.currentStep {
        case 0:
            return self.userProfile.username.count < 5
        case 1:
            return self.userProfile.experienceLevel.isEmpty
        case 2:
            return self.userProfile.gender.isEmpty
        case 3:
            return self.userProfile.primaryGoal.isEmpty
        case 5:
            return self.userProfile.equipment.isEmpty
        case 6:
            return self.userProfile.hasLimitations && self.userProfile.limitationsDescription.isEmpty
        default:
            return false
        }
    }
    
    /// Completes onboarding and shows plan generation view
    func completeOnboarding(onSuccess: @escaping () -> Void) {
        withAnimation {
            self.isGenerating = true
        }
        
        // Step 1: Show plan generation view (don't save profile yet)
        DispatchQueue.main.async {
            self.isGenerating = false
            self.isGeneratingPlan = true
        }
    }
    
    /// Generates the workout plan and saves user profile (called by GeneratePlanView)
    func generateWorkoutPlan(onSuccess: @escaping () -> Void) {
        guard let authToken = userManager.authToken else {
            errorMessage = "Authentication token not found"
            showErrorAlert = true
            return
        }
        
        // Step 1: Save user profile first
        userManager.completeOnboarding(with: userProfile) { [weak self] profileSuccess in
            guard let self = self, profileSuccess else {
                DispatchQueue.main.async {
                    self?.isGeneratingPlan = false
                    self?.errorMessage = "Failed to save user profile"
                    self?.showErrorAlert = true
                }
                return
            }
            
            // Step 2: Generate workout plan
            self.workoutManager.createAndProvidePlan(for: self.userProfile, authToken: authToken) { [weak self] planSuccess in
                DispatchQueue.main.async {
                    self?.isGeneratingPlan = false
                    if planSuccess {
                        // Mark onboarding as complete after plan is generated
                        self?.userManager.markOnboardingComplete()
                        onSuccess()
                    } else {
                        self?.errorMessage = "Failed to generate workout plan"
                        self?.showErrorAlert = true
                    }
                }
            }
        }
    }
    
    func fetchCoaches(userGoal: String) {
        if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
            self.availableCoaches = mockCoaches
            return
        }

        // Use the workoutManager to fetch coaches
        workoutManager.fetchCoaches(userGoal: userGoal) { [weak self] success in
            DispatchQueue.main.async {
                if success {
                    self?.availableCoaches = self?.workoutManager.coaches ?? []
                } else {
                    print("Failed to fetch coaches.")
                }
            }
        }
    }
    
    func convertWeight(value: Double, from oldUnit: String, to newUnit: String) -> Double {
        if oldUnit == "lbs" && newUnit == "kg" { return value * 0.453592 }
        if oldUnit == "kg" && newUnit == "lbs" { return value / 0.453592 }
        return value
    }
    
    func convertHeight(value: Double, from oldUnit: String, to newUnit: String) -> Double {
        if oldUnit == "in" && newUnit == "cm" { return value * 2.54 }
        if oldUnit == "cm" && newUnit == "in" { return value / 2.54 }
        return value
    }
    
    let goals = [
        ("Improve Endurance", "figure.run", "Enhance stamina for long-distance activities."),
        ("Bodybuilding", "dumbbell.fill", "Maximize muscle growth and definition."),
        ("Increase Strength", "flame.fill", "Focus on increasing raw power and lifting heavier."),
        ("General Fitness", "heart.fill", "Maintain overall health and well-being."),
        ("Weight Loss", "scalemass.fill", "Burn fat and improve body composition."),
        ("Power & Speed", "trophy.fill", "Boost speed, agility, and sport-specific skills.")
    ]
    
    let equipmentOptions = [
        ("Full Gym", "figure.strengthtraining.functional"),
        ("Home Gym", "house.fill"),
        ("Dumbbells Only", "dumbbell.fill"),
        ("Bodyweight Only", "figure.run")
    ]
    
    
    // State variables to manage the chat flow
    enum ChatPhase {
        case initial, awaitingChoice, userTyping, finished
    }
    @Published var messages: [ChatMessage] = []
    @Published var currentMessage: String = ""
    @Published var chatPhase: ChatPhase = .initial
    @Published var isCoachTyping: Bool = false
    
    
    func startChat(with coach: Coach) {
        guard messages.isEmpty else { return }
        
        isCoachTyping = true
        // First message
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.isCoachTyping = false
            let welcomeMessage = "Hi, nice to meet you! Or as I always say, *\(coach.tagline)*"
            self.messages.append(ChatMessage(text: welcomeMessage, isFromCoach: true))
            
            // Second message
            self.isCoachTyping = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.isCoachTyping = false
                let secondMessage = "I've reviewed your profile and I'm excited to get started! Before I build your plan, is there anything else about your fitness I should know?"
                self.messages.append(ChatMessage(text: secondMessage, isFromCoach: true))
                self.chatPhase = .awaitingChoice
            }
        }
    }
    
    func sendMessage() {
        guard !self.currentMessage.isEmpty else { return }
        
        self.userProfile.finalChatNotes = self.currentMessage
        self.messages.append(ChatMessage(text: self.currentMessage, isFromCoach: false))
        self.currentMessage = ""
        
        self.isCoachTyping = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.isCoachTyping = false
            let finalMessage = "Got it. I have everything I need. Let's create your plan!"
            self.messages.append(ChatMessage(text: finalMessage, isFromCoach: true))
            self.chatPhase = .finished
        }
    }
}
