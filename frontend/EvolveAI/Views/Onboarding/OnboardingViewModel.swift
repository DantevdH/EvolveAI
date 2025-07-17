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
}
