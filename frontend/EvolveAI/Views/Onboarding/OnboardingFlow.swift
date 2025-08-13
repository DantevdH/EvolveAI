import SwiftUI

struct OnboardingFlow: View {

    let onComplete: () -> Void
    @StateObject var viewModel: OnboardingViewModel

    // The total number of steps in the onboarding flow (0-7)
    private let totalSteps = 8

    init(userManager: UserManagerProtocol, workoutManager: WorkoutManagerProtocol, onComplete: @escaping () -> Void) {
        _viewModel = StateObject(wrappedValue: OnboardingViewModel(userManager: userManager, workoutManager: workoutManager))
        self.onComplete = onComplete // Store the action
    }

    private var userProfileBinding: Binding<UserProfile> {
        Binding(
            get: { viewModel.userProfile },
            set: { viewModel.userProfile = $0 }
        )
    }
    
    

    var body: some View {
        ZStack {
            OnboardingBackground()

            if viewModel.isGeneratingPlan {
                // Show plan generation view
                GeneratePlanView(
                    userProfile: viewModel.userProfile,
                    coach: viewModel.workoutManager.selectedCoach,
                    generatePlan: { completion in
                        viewModel.generateWorkoutPlan {
                            completion(true)
                        }
                    }
                )
            } else {
                VStack(spacing: 0) {
                    if viewModel.currentStep > 0 {
                        ProgressBarView(currentStep: viewModel.currentStep, totalSteps: totalSteps)
                            .padding(.horizontal)
                            .padding(.top)
                    } else {
                        Spacer()
                    }

                    TabView(selection: $viewModel.currentStep) {
                        // Group 1: Initial steps (always loaded)
                        Group {
                            WelcomeStep(onStart: { username in
                                viewModel.userProfile.username = username
                                withAnimation(.easeInOut) { viewModel.nextStep() }
                            }, viewModel: viewModel).tag(0)

                            ExperienceStep(viewModel: viewModel).tag(1)
                        }
                        
                        // Group 2: Middle steps (loaded when needed)
                        Group {
                            if viewModel.currentStep >= 2 && viewModel.currentStep <= 4 {
                                PersonalInfoStep(viewModel: viewModel).tag(2)

                                GoalsStep(viewModel: viewModel).tag(3)

                                ScheduleStep(viewModel: viewModel).tag(4)
                            }
                        }
                        
                        // Group 3: Final steps (loaded when needed)
                        Group {
                            if viewModel.currentStep >= 5 && viewModel.currentStep <= 7 {
                                EquipmentStep(viewModel: viewModel).tag(5)

                                LimitationsStep(viewModel: viewModel).tag(6)

                                FinalChatStep(
                                    viewModel: viewModel,
                                    coach: viewModel.workoutManager.selectedCoach,
                                    onReadyToGenerate: {
                                        viewModel.completeOnboarding(onSuccess: self.onComplete)
                                    }
                                ).tag(7)
                            }
                        }
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
                        canRetry: true,
                        retryAction: {
                            viewModel.showErrorAlert = false
                        }
                    )
                    .background(Color.black.opacity(0.7).ignoresSafeArea())
                }
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

struct OnboardingBackground: View {
    @State private var gradientRotation: Double = 0
    @State private var particleOpacity: Double = 0.8
    @State private var particlePositions: [(x: CGFloat, y: CGFloat, size: CGFloat, duration: Double)] = []
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color.black,
                    Color.evolvePrimary.opacity(0.3),
                    Color.black,
                    Color.evolvePrimary.opacity(0.1),
                    Color.black
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .rotationEffect(.degrees(gradientRotation))
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    gradientRotation = 360
                }
                
                // Calculate random values once instead of on every render
                particlePositions = (0..<20).map { _ in
                    (
                        x: CGFloat.random(in: 0...UIScreen.main.bounds.width),
                        y: CGFloat.random(in: 0...UIScreen.main.bounds.height),
                        size: CGFloat.random(in: 2...6),
                        duration: Double.random(in: 2...4)
                    )
                }
            }
            
            ForEach(0..<20, id: \.self) { index in
                if index < particlePositions.count {
                    Circle()
                        .fill(Color.evolvePrimary.opacity(0.3))
                        .frame(width: particlePositions[index].size)
                        .position(
                            x: particlePositions[index].x,
                            y: particlePositions[index].y
                        )
                        .opacity(particleOpacity)
                        .animation(
                            .easeInOut(duration: particlePositions[index].duration)
                            .repeatForever(autoreverses: true),
                            value: particleOpacity
                        )
                }
            }
        }
    }
}

#if DEBUG
struct OnboardingFlow_Preview: PreviewProvider {
    static var previews: some View {
        OnboardingFlow(userManager: UserManager(), workoutManager: WorkoutManager(), onComplete: {})
            .environmentObject(UserManager())
            .environmentObject(WorkoutManager())
            .preferredColorScheme(.dark)
    }
}
#endif
