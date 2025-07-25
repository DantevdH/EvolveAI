import SwiftUI

struct OnboardingFlow: View {

    let onComplete: () -> Void
    @StateObject var viewModel: OnboardingViewModel

    // The total number of steps in the onboarding flow (0-7)
    private let totalSteps = 8

    init(userManager: UserManagerProtocol, onComplete: @escaping () -> Void) {
        _viewModel = StateObject(wrappedValue: OnboardingViewModel(userManager: userManager))
        self.onComplete = onComplete // Store the action
    }

    private var userProfileBinding: Binding<UserProfile> {
        Binding(
            get: { viewModel.userProfile },
            set: { viewModel.userProfile = $0 }
        )
    }
    
    

    var body: some View {
        // 👉 If we are generating, show a simple loading view.
        // This removes the complex TabView from the hierarchy.
        if viewModel.userManager.isLoading {
            ZStack {
                Color.evolveBackground.ignoresSafeArea()
                ProgressView("Finalizing Your Profile...")
                    .progressViewStyle(CircularProgressViewStyle(tint: .evolvePrimary))
                    .foregroundStyle(Color.evolveText)
            }
        } else {
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
                                onReadyToGenerate: {
                                    viewModel.completeOnboarding(onSuccess: self.onComplete)
                                }
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

                    if viewModel.showErrorAlert {
                        ErrorView(
                            message: viewModel.errorMessage,
                            retryAction: {
                                viewModel.showErrorAlert = false
                                // Optionally retry onboarding or plan generation
                            }
                        )
                        .background(Color.black.opacity(0.7).ignoresSafeArea())
                    }
                }
                // .navigationBarHidden(true)
                .onAppear(perform: viewModel.fetchCoaches)
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

// #Preview {
//     OnboardingFlow(userManager: UserManager())
//         .environmentObject(UserManager())
// }
