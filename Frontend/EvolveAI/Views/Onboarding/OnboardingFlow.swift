import SwiftUI

struct OnboardingFlow: View {
    @EnvironmentObject var userManager: UserManager
    @State private var currentStep = 0
    @State private var userProfile = UserProfile()
    
    private let totalSteps = 6
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.evolveBackground.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Progress Bar
                    ProgressBarView(currentStep: currentStep, totalSteps: totalSteps)
                        .padding(.horizontal)
                        .padding(.top)
                    
                    // Content
                    TabView(selection: $currentStep) {
                        WelcomeStep()
                            .tag(0)
                        
                        GoalsStep(userProfile: $userProfile)
                            .tag(1)
                        
                        ExperienceStep(userProfile: $userProfile)
                            .tag(2)
                        
                        ScheduleStep(userProfile: $userProfile)
                            .tag(3)
                        
                        EquipmentStep(userProfile: $userProfile)
                            .tag(4)
                        
                        PersonalInfoStep(userProfile: $userProfile)
                            .tag(5)
                    }
                    .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                    
                    // Navigation Buttons
                    HStack {
                        if currentStep > 0 {
                            Button("Back") {
                                withAnimation {
                                    currentStep -= 1
                                }
                            }
                            .buttonStyle(SecondaryButtonStyle())
                        }
                        
                        Spacer()
                        
                        Button(currentStep == totalSteps - 1 ? "Complete" : "Next") {
                            if currentStep == totalSteps - 1 {
                                completeOnboarding()
                            } else {
                                withAnimation {
                                    currentStep += 1
                                }
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                    .padding()
                }
            }
        }
    }
    
    private func completeOnboarding() {
        userManager.completeOnboarding(with: userProfile)
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
                    .fill(Color.evolveBlue)
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