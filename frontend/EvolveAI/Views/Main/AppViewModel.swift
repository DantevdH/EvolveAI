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
    private var hasAttemptedPlanFetch = false

    let userManager: UserManager
    let workoutManager: WorkoutManager
    private var cancellables = Set<AnyCancellable>()

    init(userManager: UserManager, workoutManager: WorkoutManager) {
        self.userManager = userManager
        self.workoutManager = workoutManager
        setupSubscriptions()
        
        // Start the flow by checking authentication
        DispatchQueue.main.async {
            self.userManager.checkAuthenticationState()
        }
    }

    private func setupSubscriptions() {
        // Simple flow: Check auth → Check profile → Check plan
        Publishers.CombineLatest3(
            userManager.$authToken,
            userManager.$userProfile,
            workoutManager.$workoutPlan
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] authToken, userProfile, workoutPlan in
            guard let self = self else { return }
            
            // Don't update state if we're already in an error state
            if case .error = self.state {
                return
            }
            
            // Step 1: Check if user is authenticated
            if authToken == nil {
                self.state = .loggedOut
                print("[DEBUG] AppViewModel: No auth token → .loggedOut")
                return
            }
            
            // Step 2: Check if user profile exists
            if userProfile == nil {
                // User is authenticated but no profile → needs onboarding
                self.state = .needsOnboarding
                print("[DEBUG] AppViewModel: Has token, no profile → .needsOnboarding")
                return
            }
            
            // Step 3: Check if workout plan exists
            if workoutPlan == nil {
                // Attempt to fetch existing plan once before deciding user needs a new plan
                if !self.hasAttemptedPlanFetch {
                    self.hasAttemptedPlanFetch = true
                    self.state = .loading
                    print("[DEBUG] AppViewModel: Has profile, no plan → attempting fetchExistingPlan")
                    self.workoutManager.fetchExistingPlan(userProfileId: self.userManager.userProfile?.id) { found in
                        DispatchQueue.main.async {
                            if found {
                                print("[DEBUG] AppViewModel: Existing plan found after fetch")
                                // State will switch to .loaded when workoutPlan publishes
                            } else {
                                if self.userManager.authToken != nil,
                                   self.userManager.userProfile != nil,
                                   self.workoutManager.workoutPlan == nil {
                                    self.state = .needsPlan
                                    print("[DEBUG] AppViewModel: No existing plan found → .needsPlan")
                                   }
                            }
                        }
                    }
                } else {
                    // Already attempted to fetch, move to needsPlan
                    self.state = .needsPlan
                    print("[DEBUG] AppViewModel: No plan and already attempted fetch → .needsPlan")
                }
                return
            }
            
            // Step 4: Everything exists → show main app
            self.state = .loaded(plan: workoutPlan!)
            print("[DEBUG] AppViewModel: Has everything → .loaded")
        }
        .store(in: &cancellables)
        
        // Handle loading states
        Publishers.CombineLatest(
            userManager.$isLoading,
            workoutManager.$isLoading
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] userLoading, workoutLoading in
            guard let self = self else { return }
            
            // Only show loading if we're not in an error state and something is actually loading
            if case .error = self.state {
                return
            }
            
            if userLoading || workoutLoading {
                self.state = .loading
                print("[DEBUG] AppViewModel: Loading state → .loading")
            }
        }
        .store(in: &cancellables)
        
        // Handle errors
        Publishers.Merge(
            userManager.$errorMessage,
            workoutManager.$errorMessage
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] error in
            guard let self = self, let error = error else { return }
            self.state = .error(message: error)
            print("[DEBUG] AppViewModel: Error → .error(\(error))")
        }
        .store(in: &cancellables)
        
        // Track selected coach
        workoutManager.$selectedCoach
            .receive(on: DispatchQueue.main)
            .sink { [weak self] coach in
                self?.selectedCoach = coach
            }
            .store(in: &cancellables)

        // Trigger coach fetching when entering needsPlan state
        $state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                guard let self = self else { return }
                if case .needsPlan = state {
                    if let userProfile = self.userManager.userProfile,
                       self.workoutManager.selectedCoach == nil {
                        print("[DEBUG] AppViewModel: Entering .needsPlan, fetching coaches")
                        self.workoutManager.fetchCoaches(userGoal: userProfile.primaryGoal) { success in
                            if !success {
                                print("[DEBUG] AppViewModel: Failed to fetch coaches for .needsPlan")
                            }
                        }
                    }
                }
            }
            .store(in: &cancellables)
    }

    func fetchCoachesAndPlanIfNeeded() {
        guard let userProfile = userManager.userProfile else { return }
        
        // Fetch coaches first, then check for existing plan
        workoutManager.fetchCoaches(userGoal: userProfile.primaryGoal) { [weak self] success in
            guard let self = self else { return }
            if success {
                // Coaches fetched successfully, now check for existing plan
                self.workoutManager.fetchExistingPlan(userProfileId: self.userManager.userProfile?.id) { success in
                    // The subscription will handle state updates based on workoutPlan
                }
            } else {
                self.state = .error(message: "Failed to fetch coaches.")
            }
        }
    }
    
    func generatePlanForUser(authToken: String, completion: @escaping (Bool) -> Void) {
        guard let userProfile = userManager.userProfile else {
            self.state = .error(message: "User profile not found.")
            completion(false)
            return
        }
        
        workoutManager.createAndProvidePlan(for: userProfile) { [weak self] success in
            guard let self = self else { return }
            
            if success {
                // Plan generated successfully, subscription will handle state update
                completion(true)
            } else {
                self.state = .error(message: "Failed to generate workout plan.")
                completion(false)
            }
        }
    }

    func logout() {
        userManager.logout()
        hasAttemptedPlanFetch = false
        state = .loggedOut
        print("[DEBUG] AppViewModel.state set to .loggedOut in logout()")
    }
} 