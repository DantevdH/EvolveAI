import SwiftUI

struct OnboardingFlow: View {
    @StateObject var viewModel: OnboardingViewModel

    // The total number of steps in the onboarding flow (0-7)
    private let totalSteps = 8

    init(networkService: NetworkServiceProtocol = NetworkService()) {
        _viewModel = StateObject(wrappedValue: OnboardingViewModel(networkService: networkService))
    }

    private var userProfileBinding: Binding<UserProfile> {
        Binding(
            get: { viewModel.userProfile },
            set: { viewModel.userProfile = $0 }
        )
    }
    
    

    var body: some View {
        if viewModel.isGenerating {
            AIGeneratingView(
                userProfile: viewModel.userProfile,
                coach: viewModel.selectedCoach
            )
        } else {
            NavigationView {
                ZStack {
                    Color.evolveBackground.ignoresSafeArea()

                    VStack(spacing: 0) {
                        if viewModel.currentStep > 0 {
                            ProgressBarView(currentStep: viewModel.currentStep, totalSteps: totalSteps)
                                .padding(.horizontal)
                                .padding(.top)
                        } else {
                            Spacer()
                        }

                        TabView(selection: $viewModel.currentStep) {
                            WelcomeStep {
                                withAnimation(.easeInOut) { viewModel.nextStep() }
                            }.tag(0)

                            ExperienceStep(viewModel: viewModel).tag(1)

                            PersonalInfoStep(userProfile: userProfileBinding).tag(2)

                            GoalsStep(
                                userProfile: userProfileBinding,
                                availableCoaches: viewModel.availableCoaches,
                                onCoachSelected: { coach in
                                    viewModel.selectedCoach = coach
                                }
                            ).tag(3)

                            ScheduleStep(userProfile: userProfileBinding).tag(4)

                            EquipmentStep(userProfile: userProfileBinding).tag(5)

                            LimitationsStep(userProfile: userProfileBinding).tag(6)

                            FinalChatStep(
                                userProfile: userProfileBinding,
                                coach: viewModel.selectedCoach,
                                onReadyToGenerate: viewModel.completeOnboarding
                            ).tag(7)
                        }
                        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))

                        if viewModel.currentStep > 0 && viewModel.currentStep < totalSteps - 1 {
                            HStack {
                                if viewModel.currentStep > 1 {
                                    Button("Back") {
                                        withAnimation { viewModel.previousStep() }
                                    }
                                    .buttonStyle(SecondaryButtonStyle())
                                }

                                Spacer()

                                Button("Next") {
                                    withAnimation { viewModel.nextStep() }
                                }
                                .buttonStyle(NextButtonStyle())
                                .disabled(viewModel.isNextButtonDisabled)
                            }
                            .padding()
                        }
                    }
                }
                .navigationBarHidden(true)
                .onAppear(perform: viewModel.fetchCoaches)
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
