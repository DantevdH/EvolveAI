import SwiftUI

struct OnboardingFlow: View {

    @State private var currentStep = 0
    @State private var userProfile = UserProfile()
    @State private var isGenerating = false
    @State private var selectedCoach: Coach?
    
    @State private var availableCoaches: [Coach] = []
    private let networkService = NetworkService()
    
    // The total number of steps in the onboarding flow (0-7)
    private let totalSteps = 8
    
    // The logic to disable the 'Next' button based on the current step
    private var isNextButtonDisabled: Bool {
        switch currentStep {
        case 1: // ExperienceStep
            return userProfile.experienceLevel.isEmpty
        case 2: // PersonalInfoStep
            return userProfile.gender.isEmpty
        case 3: // GoalsStep
            return userProfile.primaryGoal.isEmpty
        case 5: // EquipmentStep
            return userProfile.equipment.isEmpty
        case 6: // LimitationsStep
            return userProfile.hasLimitations && userProfile.limitationsDescription.isEmpty
        default:
            // For all other steps, the button is enabled by default.
            return false
        }
    }
    
    var body: some View {
        if isGenerating {
            AIGeneratingView(
                userProfile: userProfile,
                coach: selectedCoach
            )
        } else{
            NavigationView {
                ZStack {
                    Color.evolveBackground.ignoresSafeArea()
                    
                    VStack(spacing: 0) {
                        // Progress Bar
                        if currentStep > 0 {
                            ProgressBarView(currentStep: currentStep, totalSteps: totalSteps)
                                .padding(.horizontal)
                                .padding(.top)
                        }
                        
                        else {
                            Spacer()
                        }
                        // Content
                        TabView(selection: $currentStep) {
                            WelcomeStep {
                                withAnimation(.easeInOut) { currentStep += 1 }
                            }
                            .tag(0)
                            
                            ExperienceStep(userProfile: $userProfile)
                                .tag(1)
                            
                            PersonalInfoStep(userProfile: $userProfile)
                                .tag(2)
                            
                            GoalsStep(
                                    userProfile: $userProfile,
                                    availableCoaches: availableCoaches,
                                    onCoachSelected: { coach in
                                        self.selectedCoach = coach
                                    }
                            ).tag(3)
                            
                            ScheduleStep(userProfile: $userProfile)
                                .tag(4)
                            
                            EquipmentStep(userProfile: $userProfile)
                                .tag(5)
                            
                            LimitationsStep(userProfile: $userProfile)
                                .tag(6)
                            
                            FinalChatStep(
                                    userProfile: $userProfile,
                                    coach: selectedCoach,
                                    onReadyToGenerate: { completeOnboarding() }
                                ).tag(7)
                        }
                        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                        
                       
                        if currentStep > 0 && currentStep < totalSteps - 1 {
                            HStack {
                                if currentStep > 1 {
                                    Button("Back") {
                                        withAnimation { currentStep -= 1 }
                                    }.buttonStyle(SecondaryButtonStyle())
                                }
                                
                                Spacer()
                                
                                // --- MODIFICATION: Simplified "Next" button ---
                                Button("Next") {
                                    withAnimation { currentStep += 1 }
                                }
                                .buttonStyle(NextButtonStyle()) // Use the consistent style
                                .disabled(isNextButtonDisabled)
                            }
                            .padding()
                        }
                    }
                }
                .navigationBarHidden(true)
                .onAppear {
                    fetchCoaches()
                }
            }
        }
    }
    
//    sent the user info to the backend / database
    private func completeOnboarding() {
            withAnimation {
                isGenerating = true
            }
        }
    private func fetchCoaches() {
        // 👇 Add this check right here
        if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
            // Since the network call is skipped, you can load mock data for the preview
            self.availableCoaches = mockCoaches
            return // Exit the function early
        }

        // This part will now only run in the live app, not in the preview
        networkService.getAllCoaches { result in
            if case .success(let coaches) = result {
                self.availableCoaches = coaches
            } else {
                print("Failed to fetch coaches.")
            }
        }
    }
}

struct ProgressBarView: View {
    let currentStep: Int
    let totalSteps: Int
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 4)
                    .cornerRadius(2)
                
                Rectangle()

                    .fill(Color.evolvePrimary)
                    .frame(width: geometry.size.width * CGFloat(currentStep) / CGFloat(totalSteps - 1), height: 4)
                    .cornerRadius(2)
                    .animation(.easeInOut(duration: 0.3), value: currentStep)
            }
        }
        .frame(height: 4)
    }
}

#Preview {
    OnboardingFlow()
        .environmentObject(UserManager())
}

