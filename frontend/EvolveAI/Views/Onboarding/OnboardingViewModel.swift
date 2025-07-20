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
    @Published var selectedCoach: Coach?
    @Published var availableCoaches: [Coach] = []

    let networkService: NetworkServiceProtocol
    
    let levels = ExperienceLevel.allCases
    
    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
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
    
    func completeOnboarding() {
        withAnimation {
            self.isGenerating = true
        }
    }
    
    
    func fetchCoaches() {
        if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
            self.availableCoaches = mockCoaches
            return
        }

        self.networkService.getAllCoaches { result in
            if case .success(let coaches) = result {
                self.availableCoaches = coaches
            } else {
                print("Failed to fetch coaches.")
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
