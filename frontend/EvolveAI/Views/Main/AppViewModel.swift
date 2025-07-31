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
    @Published private(set) var showRedirectDelay: Bool = false

    let userManager: UserManager
    let workoutManager: WorkoutManager
    private var cancellables = Set<AnyCancellable>()

    init(userManager: UserManager, workoutManager: WorkoutManager) {
        self.userManager = userManager
        self.workoutManager = workoutManager
        setupSubscriptions()
        
        // Always check authentication state - the UserManager will handle the logic
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
            if case .error = self.state {
                // Already in error state, do not update further
                return
            }
            
            if isLoading {
                self.state = .loading
                print("[DEBUG] AppViewModel.state set to .loading in CombineLatest4 subscription")
                // Only show loading if we're actually validating a token
                // if authToken != nil {
                //     self.state = .loading
                // } else {
                //     // No token but loading - this shouldn't happen, but handle gracefully
                //     self.state = .loggedOut
                // }
            } else {
                // Not loading - determine the appropriate state
                if authToken == nil {
                    self.state = .loggedOut
                    print("[DEBUG] AppViewModel.state set to .loggedOut in CombineLatest4 subscription")
                } else if userManager.isNewUser {
                    // New user - show redirect delay
                    self.showRedirectDelay = true
                    self.state = .loading
                    print("[DEBUG] AppViewModel.state set to .loading (redirect delay) in CombineLatest4 subscription")
                    
                    // After 2 seconds, redirect to onboarding
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        self.showRedirectDelay = false
                        self.state = .needsOnboarding
                        print("[DEBUG] AppViewModel.state set to .needsOnboarding after redirect delay")
                    }
                } else if userProfile == nil || !isOnboardingComplete {
                    self.state = .needsOnboarding
                    print("[DEBUG] AppViewModel.state set to .needsOnboarding in CombineLatest4 subscription")
                } else {
                    // User is authenticated and onboarded
                    // Check if we already have a plan (from onboarding)
                    if self.workoutManager.workoutPlan != nil {
                        // Plan already exists, go to loaded state
                        self.state = .loaded(plan: self.workoutManager.workoutPlan!)
                        print("[DEBUG] AppViewModel.state set to .loaded(plan) in CombineLatest4 subscription")
                    } else {
                        // No plan yet, start loading plan
                        self.state = .loading
                        print("[DEBUG] AppViewModel.state set to .loading (fetching plan) in CombineLatest4 subscription")
                        self.fetchCoachesAndPlanIfNeeded()
                    }
                }
            }
        }
        .store(in: &cancellables)

        workoutManager.$workoutPlan
            .receive(on: DispatchQueue.main)
            .sink { [weak self] plan in
                guard let self = self else { return }
                // Only update state if user is authenticated and onboarded
                if self.userManager.authToken == nil || self.userManager.userProfile == nil || !self.userManager.isOnboardingComplete {
                    // Don't update state, user is not ready for a plan
                    return
                }
                if let plan = plan {
                    self.state = .loaded(plan: plan)
                    print("[DEBUG] AppViewModel.state set to .loaded(plan) in workoutPlan subscription")
                } else if !self.workoutManager.isLoading && !self.workoutManager.isCoachesLoading {
                    self.state = .needsPlan
                    print("[DEBUG] AppViewModel.state set to .needsPlan in workoutPlan subscription")
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
                    print("[DEBUG] AppViewModel.state set to .error in errorMessage subscription")
                }
            }
            .store(in: &cancellables)
        
        // Subscribe to userManager errors
        userManager.$errorMessage
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                if let error = error {
                    self?.state = .error(message: error)
                    print("[DEBUG] AppViewModel.state set to .error in userManager.errorMessage subscription")
                }
            }
            .store(in: &cancellables)
    }

    func fetchCoachesAndPlanIfNeeded() {
        guard let userProfile = userManager.userProfile else { return }
        isLoading = true

        if workoutManager.selectedCoach != nil {
            fetchWorkoutPlan()
            return
        }

        workoutManager.fetchCoaches(userGoal: userProfile.primaryGoal) { [weak self] success in
            guard let self = self else { return }
            if success {
                self.fetchWorkoutPlan()
            } else {
                self.isLoading = false
                self.state = .error(message: "Failed to fetch coaches.")
                print("[DEBUG] AppViewModel.state set to .error (Failed to fetch coaches) in fetchCoachesAndPlanIfNeeded")
            }
        }
    }

    func fetchWorkoutPlan() {
        // Try to fetch existing plan first
        workoutManager.fetchExistingPlan { [weak self] success in
            guard let self = self else { return }
            
            if success {
                // Plan exists, we're done
                self.isLoading = false
            } else {
                // No plan exists, show GeneratePlanView
                self.showPlanGeneration()
            }
        }
    }
    
    private func showPlanGeneration() {
        // Set state to show GeneratePlanView
        self.state = .needsPlan
        print("[DEBUG] AppViewModel.state set to .needsPlan in showPlanGeneration")
    }
    
    func generatePlanForUser(authToken: String, completion: @escaping (Bool) -> Void) {
        guard let userProfile = userManager.userProfile else {
            self.state = .error(message: "User profile not found.")
            print("[DEBUG] AppViewModel.state set to .error (User profile not found) in generatePlanForUser")
            return
        }
        
        workoutManager.createAndProvidePlan(for: userProfile) { [weak self] success in
            guard let self = self else { return }
            
            if success {
                // Plan generated successfully, state will be updated by subscription
                completion(true)
            } else {
                self.state = .error(message: "Failed to generate workout plan.")
                print("[DEBUG] AppViewModel.state set to .error (Failed to generate workout plan) in generatePlanForUser")
                completion(false)
            }
        }
    }

    func logout() {
        userManager.logout()
        state = .loggedOut
        print("[DEBUG] AppViewModel.state set to .loggedOut in logout()")
    }
} 