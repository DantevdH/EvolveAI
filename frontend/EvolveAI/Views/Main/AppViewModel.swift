import SwiftUI
import Combine

class AppViewModel: ObservableObject {
    enum AppState: Equatable {
        case loading
        case loggedOut
        case needsOnboarding
        case loaded(plan: WorkoutPlan)
        case needsPlan
        case error(message: String)
    }

    @Published private(set) var state: AppState = .loading
    @Published private(set) var selectedCoach: Coach?
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var errorMessage: String?

    let userManager: UserManager
    let workoutManager: WorkoutManager
    private var cancellables = Set<AnyCancellable>()

    init(userManager: UserManager, workoutManager: WorkoutManager) {
        self.userManager = userManager
        self.workoutManager = workoutManager
        setupSubscriptions()
        DispatchQueue.main.async {
            self.userManager.checkAuthenticationState()
        }
    }

    private func setupSubscriptions() {
        Publishers.CombineLatest4(
            userManager.$isLoading,
            userManager.$authToken,
            userManager.$userProfile,
            userManager.$isOnboardingComplete
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] isLoading, authToken, userProfile, isOnboardingComplete in
            guard let self = self else { return }
            if isLoading {
                self.state = .loading
            } else if authToken == nil {
                self.state = .loggedOut
            } else if userProfile == nil || !isOnboardingComplete {
                self.state = .needsOnboarding
            } else {
                // User is authenticated and onboarded, start loading plan
                self.state = .loading
                self.fetchCoachesAndPlanIfNeeded()
            }
        }
        .store(in: &cancellables)

        workoutManager.$workoutPlanResponse
            .map { $0?.workoutPlan }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] plan in
                guard let self = self else { return }
                if let plan = plan {
                    self.state = .loaded(plan: plan)
                } else if !self.workoutManager.isLoading && !self.workoutManager.isCoachesLoading {
                    self.state = .needsPlan
                }
            }
            .store(in: &cancellables)
        workoutManager.$selectedCoach
            .receive(on: DispatchQueue.main)
            .sink { [weak self] coach in
                self?.selectedCoach = coach
            }
            .store(in: &cancellables)
        workoutManager.$errorMessage
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                if let error = error {
                    self?.state = .error(message: error)
                }
            }
            .store(in: &cancellables)
    }

    func fetchCoachesAndPlanIfNeeded() {
        guard let userProfile = userManager.userProfile else { return }
        isLoading = true
        workoutManager.fetchCoaches(userGoal: userProfile.primaryGoal) { [weak self] success in
            guard let self = self else { return }
            if success {
                self.fetchWorkoutPlan()
            } else {
                self.isLoading = false
                self.state = .error(message: "Failed to fetch coaches.")
            }
        }
    }

    func fetchWorkoutPlan() {
        #if DEBUG
        workoutManager.fetchPlan(authToken: "DEBUG_MOCK_TOKEN")
        #else
        guard let authToken = userManager.authToken else {
            self.state = .error(message: "Authentication token not found.")
            return
        }
        workoutManager.fetchPlan(authToken: authToken)
        #endif
        isLoading = false
    }

    func logout() {
        userManager.logout()
        state = .loggedOut
    }
} 