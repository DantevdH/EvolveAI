import SwiftUI

struct OnboardingFlow: View {
    @EnvironmentObject var userManager: UserManager
    @StateObject var viewModel: OnboardingViewModel

    private let totalSteps = 8

    init(userManager: UserManager, networkService: NetworkServiceProtocol = NetworkService()) {
        _viewModel = StateObject(wrappedValue: OnboardingViewModel(userManager: userManager, networkService: networkService))
    }

    var body: some View {
        // Use the ViewModel's state to decide which view to show
        if viewModel.isGenerating {
            // This view is now purely for display, receiving the data it needs
            AIGeneratingView(
                coach: viewModel.selectedCoach
            )
            .alert("Generation Failed", isPresented: $viewModel.showErrorAlert) {
                Button("Retry", role: .cancel) {
                    viewModel.completeOnboarding()
                }
            } message: {
                Text(viewModel.errorMessage ?? "An unknown error occurred. Please check your connection and try again.")
            }

        } else {
            // The main onboarding steps
            NavigationView {
                ZStack {
                    Color.evolveBackground.ignoresSafeArea()

                    VStack(spacing: 0) {
                        // Progress Bar
                        if viewModel.currentStep > 0 {
                            ProgressBarView(currentStep: viewModel.currentStep, totalSteps: totalSteps)
                                .padding(.horizontal)
                                .padding(.top)
                        } else {
                            Spacer() // Pushes the WelcomeStep content to the center
                        }

                        // Onboarding Steps in a TabView
                        TabView(selection: $viewModel.currentStep) {
                            WelcomeStep {
                                withAnimation(.easeInOut) { viewModel.nextStep() }
                            }.tag(0)

                            ExperienceStep(viewModel: viewModel).tag(1)

                            PersonalInfoStep(viewModel: viewModel).tag(2)

                            GoalsStep(
                                viewModel: viewModel,
                                availableCoaches: viewModel.availableCoaches,
                                onCoachSelected: { coach in
                                    viewModel.selectedCoach = coach
                                }
                            ).tag(3)

                            ScheduleStep(viewModel: viewModel).tag(4)

                            EquipmentStep(viewModel: viewModel).tag(5)

                            LimitationsStep(viewModel: viewModel).tag(6)

                            FinalChatStep(
                                viewModel: viewModel,
                                coach: viewModel.selectedCoach,
                                onReadyToGenerate: viewModel.completeOnboarding // The final action
                            ).tag(7)
                            
                        }
                        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))

                        // Navigation Buttons
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
    // CORRECTED: Provide a UserManager instance to the initializer.
    OnboardingFlow(userManager: UserManager())
        // .environmentObject(UserManager())
}
