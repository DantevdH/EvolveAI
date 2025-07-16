import SwiftUI

class OnboardingViewModel: ObservableObject {
    @Published var currentStep = 0
    @Published var userProfile = UserProfile()
    @Published var isGenerating = false
    @Published var selectedCoach: Coach?
    @Published var availableCoaches: [Coach] = []

    let networkService: NetworkServiceProtocol

    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
    }

    func nextStep() {
        currentStep += 1
    }
    
    func previousStep() {
        currentStep -= 1
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

                            ExperienceStep(userProfile: userProfileBinding).tag(1)

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
