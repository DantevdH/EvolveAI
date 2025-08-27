import SwiftUI
import Combine

class AppViewModel: ObservableObject {
    enum AppState: Equatable {
        case loading
        case loggedOut
        case needsOnboarding
        case loaded(plan: WorkoutPlan)
        case needsPlan
        case error(message: String, canRetry: Bool = true, retryCount: Int = 0)
        
        var description: String {
            switch self {
            case .loading:
                return "loading"
            case .loggedOut:
                return "loggedOut"
            case .needsOnboarding:
                return "needsOnboarding"
            case .loaded:
                return "loaded"
            case .needsPlan:
                return "needsPlan"
            case .error:
                return "error"
            }
        }
    }

    @Published private(set) var state: AppState = .loading
    @Published private(set) var selectedCoach: Coach?
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var showRedirectDelay: Bool = false
    private var hasAttemptedPlanFetch = false
    
    // Add retry tracking
    private var currentRetryCount = 0
    private let maxRetryAttempts = 3
    private var lastError: String?
    
    // Add app lifecycle tracking
    private var isAppInBackground = false
    private var backgroundedAt: Date?
    private var pendingOperations: [PendingOperation] = []
    private var backgroundTimer: Timer?

    let userManager: UserManager
    let workoutManager: WorkoutManager
    private var cancellables = Set<AnyCancellable>()

    init(userManager: UserManager, workoutManager: WorkoutManager) {
        self.userManager = userManager
        self.workoutManager = workoutManager
        setupSubscriptions()
        setupAppLifecycleHandling()
        
        // Start the flow by checking authentication
        DispatchQueue.main.async {
            self.userManager.checkAuthenticationState()
        }
    }

    // MARK: - State Machine Logic
    
    /// Validates if a state transition is allowed (updated for error recovery)
    private func canTransition(to newState: AppState) -> Bool {
        switch (state, newState) {
        case (.loading, _):
            return true // Can transition from loading to anything
        case (.loggedOut, .loading), (.loggedOut, .needsOnboarding):
            return true
        case (.needsOnboarding, .loading), (.needsOnboarding, .needsPlan):
            return true
        case (.needsPlan, .loading), (.needsPlan, .loaded), (.needsPlan, .error):
            return true
        case (.loaded, .loading), (.loaded, .error):
            return true
        case (.error, .loading), (.error, .loggedOut), (.error, .needsOnboarding), (.error, .needsPlan):
            return true // Allow recovery from error state
        default:
            return false
        }
    }
    
    /// Safely sets the state with validation and error tracking
    private func setState(_ newState: AppState) {
        guard canTransition(to: newState) else {
            print("[ERROR] Invalid state transition: \(state) → \(newState)")
            return
        }
        
        // Track error state for retry logic
        if case .error(let message, _, let retryCount) = newState {
            lastError = message
            currentRetryCount = retryCount
        } else {
            // Reset retry count when leaving error state
            currentRetryCount = 0
            lastError = nil
        }
        
        print("[DEBUG] State transition: \(state) → \(newState)")
        state = newState
    }
    
    /// Determines if loading state should be shown (updated for error recovery)
    private func shouldShowLoading() -> Bool {
        switch state {
        case .loggedOut, .needsOnboarding, .needsPlan:
            return true
        case .loaded:
            return false
        case .error:
            return false // Don't show loading when in error state
        case .loading:
            return false // Already loading
        }
    }

    private func setupSubscriptions() {
        // Stream 1: Core state logic (now allows error recovery)
        Publishers.CombineLatest3(
            userManager.$authToken,
            userManager.$userProfile,
            workoutManager.$workoutPlan
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] authToken, userProfile, workoutPlan in
            guard let self = self else { return }
            
            print("[DEBUG] AppViewModel: Publishers.CombineLatest3 triggered - authToken: \(authToken != nil), userProfile: \(userProfile != nil), workoutPlan: \(workoutPlan != nil)")
            
            // Track user profile changes specifically
            if let profile = userProfile {
                print("[DEBUG] AppViewModel: User profile loaded - ID: \(profile.id), Goal: \(profile.primaryGoal)")
            } else {
                print("[DEBUG] AppViewModel: User profile is nil")
            }
            
            // Allow processing if we're recovering from error state
            if case .error = self.state {
                // Only allow recovery if we have valid data
                if authToken != nil && userProfile != nil {
                    print("[DEBUG] AppViewModel: Attempting recovery from error state")
                    self.processStateTransition(authToken: authToken, userProfile: userProfile, workoutPlan: workoutPlan)
                }
                return
            }
            
            // Normal state processing
            self.processStateTransition(authToken: authToken, userProfile: userProfile, workoutPlan: workoutPlan)
        }
        .store(in: &cancellables)
        
        // Stream 2: Loading state (updated for error recovery)
        Publishers.CombineLatest(
            userManager.$isLoading,
            workoutManager.$isLoading
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] userLoading, workoutLoading in
            guard let self = self else { return }
            
            // Only show loading for certain state transitions
            if userLoading || workoutLoading {
                if self.shouldShowLoading() {
                    self.setState(.loading)
                }
            }
        }
        .store(in: &cancellables)
        
        // Handle errors with retry logic
        Publishers.Merge(
            userManager.$errorMessage,
            workoutManager.$errorMessage
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] error in
            guard let self = self, let error = error else { return }
            
            // Determine if we can retry
            let canRetry = self.currentRetryCount < self.maxRetryAttempts
            let retryCount = self.currentRetryCount
            
            if canRetry {
                print("[DEBUG] AppViewModel: Error occurred (attempt \(retryCount + 1)/\(self.maxRetryAttempts)): \(error)")
                self.setState(.error(message: error, canRetry: true, retryCount: retryCount))
                
                // Auto-retry for certain errors after a delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    self.attemptAutoRetry()
                }
            } else {
                print("[DEBUG] AppViewModel: Max retry attempts reached, showing final error")
                self.setState(.error(message: "\(error) (Max retries reached. Please check your connection and try again.)", canRetry: false, retryCount: retryCount))
            }
        }
        .store(in: &cancellables)
        
        // Track selected coach
        workoutManager.$selectedCoach
            .receive(on: DispatchQueue.main)
            .sink { [weak self] coach in
                self?.selectedCoach = coach
            }
            .store(in: &cancellables)
    }
    
    // MARK: - State Transition Logic
    
    /// Processes state transitions based on current data (updated to prevent intermediate states)
    private func processStateTransition(authToken: String?, userProfile: UserProfile?, workoutPlan: WorkoutPlan?) {
        print("[DEBUG] AppViewModel: processStateTransition - authToken: \(authToken != nil), userProfile: \(userProfile != nil), workoutPlan: \(workoutPlan != nil)")
        
        // Step 1: Check if user is authenticated
        if authToken == nil {
            if case .loggedOut = state {
                print("[DEBUG] AppViewModel: Already logged out, no change needed")
                return
            }
            setState(.loggedOut)
            print("[DEBUG] AppViewModel: No auth token → .loggedOut")
            return
        }
        
        // Step 2: Check if user profile exists
        if userProfile == nil {
            // User is authenticated but no profile → needs onboarding
            // BUT: Only if we're not currently loading the profile
            if userManager.isLoading {
                print("[DEBUG] AppViewModel: User profile is loading, staying in current state")
                return
            }
            
            // Only change state if we're not already in onboarding
            if case .needsOnboarding = state {
                print("[DEBUG] AppViewModel: Already in onboarding, no change needed")
                return
            }
            
            setState(.needsOnboarding)
            print("[DEBUG] AppViewModel: Has token, no profile → .needsOnboarding")
            return
        }
        
        // Step 3: Check if workout plan exists
        if workoutPlan == nil {
            // User has profile but no workout plan yet
            // This could mean either:
            // a) User needs a new plan (no plan in database)
            // b) User has a plan but it hasn't been loaded yet
            
            // IMPORTANT: If we're actively loading a workout plan, don't change state yet
            // This prevents the race condition where users with plans go to onboarding
            if workoutManager.isLoading {
                print("[DEBUG] AppViewModel: Workout plan is loading, staying in current state")
                return
            }
            
            handleNoWorkoutPlan()
        } else {
            // Step 4: Everything exists → show main app
            if case .loaded(let existingPlan) = state, existingPlan.id == workoutPlan!.id {
                print("[DEBUG] AppViewModel: Already loaded with same plan, no change needed")
                return
            }
            
            setState(.loaded(plan: workoutPlan!))
            print("[DEBUG] AppViewModel: Has everything → .loaded")
        }
    }
    
    /// Handles the case when no workout plan exists
    private func handleNoWorkoutPlan() {
        print("[DEBUG] AppViewModel: handleNoWorkoutPlan - hasAttemptedPlanFetch: \(hasAttemptedPlanFetch)")
        
        if !hasAttemptedPlanFetch {
            hasAttemptedPlanFetch = true
            setState(.loading)
            print("[DEBUG] AppViewModel: Has profile, no plan → attempting fetchExistingPlan")
            
            // Use encapsulated method instead of direct property access
            let userProfileId = userManager.userProfile?.id
            workoutManager.fetchExistingPlan(userProfileId: userProfileId) { [weak self] found in
                guard let self = self else { return }
                
                DispatchQueue.main.async {
                    if found {
                        print("[DEBUG] AppViewModel: Existing plan found after fetch - plan will be loaded via subscription")
                        // Don't set state here - let the subscription handle it when workoutPlan publishes
                        // This prevents race conditions where we set .needsPlan before the plan loads
                    } else {
                        print("[DEBUG] AppViewModel: No existing plan found in database")
                        // Use encapsulated validation methods
                        if self.userManager.isReadyForPlanGeneration() && self.workoutManager.needsPlan() {
                            self.setState(.needsPlan)
                            print("[DEBUG] AppViewModel: No existing plan found → .needsPlan")
                            // Trigger coach fetching here instead of in subscription
                            self.fetchCoachesIfNeeded()
                        } else {
                            print("[DEBUG] AppViewModel: User not ready for plan generation, staying in current state")
                        }
                    }
                }
            }
        } else {
            // Already attempted to fetch, but still no plan
            // This means the user genuinely needs a new plan
            print("[DEBUG] AppViewModel: Already attempted fetch, no plan found → .needsPlan")
            setState(.needsPlan)
            fetchCoachesIfNeeded()
        }
    }
    
    /// Fetches coaches when entering needsPlan state (moved from subscription)
    private func fetchCoachesIfNeeded() {
        guard case .needsPlan = state,
              let userGoal = userManager.getUserPrimaryGoal(),
              workoutManager.needsCoaches() else {
            return
        }
        
        print("[DEBUG] AppViewModel: Entering .needsPlan, fetching coaches")
        workoutManager.fetchCoaches(userGoal: userGoal) { [weak self] success in
            if !success {
                print("[DEBUG] AppViewModel: Failed to fetch coaches for .needsPlan")
            }
        }
    }
    
    // MARK: - Error Recovery Methods
    
    /// Attempts automatic retry for recoverable errors
    private func attemptAutoRetry() {
        guard case .error = state,
              currentRetryCount < maxRetryAttempts else {
            return
        }
        
        print("[DEBUG] AppViewModel: Attempting auto-retry \(currentRetryCount + 1)/\(maxRetryAttempts)")
        
        // Increment retry count
        currentRetryCount += 1
        
        // Attempt to recover based on what we were trying to do
        if let lastError = lastError {
            if lastError.contains("coaches") || lastError.contains("Failed to fetch coaches") {
                retryFetchCoaches()
            } else if lastError.contains("workout plan") || lastError.contains("Failed to fetch workout plan") {
                retryFetchPlan()
            } else {
                // Generic retry - attempt to refresh current state
                retryCurrentOperation()
            }
        }
    }
    
    /// Retries fetching coaches
    private func retryFetchCoaches() {
        guard let userGoal = userManager.getUserPrimaryGoal() else { return }
        
        setState(.loading)
        workoutManager.fetchCoaches(userGoal: userGoal) { [weak self] success in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                if success {
                    // Successfully recovered, continue with normal flow
                    print("[DEBUG] AppViewModel: Successfully recovered from coach fetch error")
                    self.processStateTransition(
                        authToken: self.userManager.authToken,
                        userProfile: self.userManager.userProfile,
                        workoutPlan: self.workoutManager.getCurrentWorkoutPlan()
                    )
                } else {
                    // Still failing, show error with updated retry count
                    let errorMessage = "Failed to fetch coaches. Please check your connection."
                    self.setState(.error(message: errorMessage, canRetry: true, retryCount: self.currentRetryCount))
                }
            }
        }
    }
    
    /// Retries fetching workout plan
    private func retryFetchPlan() {
        guard let userProfile = userManager.userProfile else { return }
        
        setState(.loading)
        workoutManager.fetchExistingPlan(userProfileId: userProfile.id) { [weak self] found in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                if found {
                    // Successfully recovered
                    print("[DEBUG] AppViewModel: Successfully recovered from plan fetch error")
                    self.processStateTransition(
                        authToken: self.userManager.authToken,
                        userProfile: self.userManager.userProfile,
                        workoutPlan: self.workoutManager.getCurrentWorkoutPlan()
                    )
                } else {
                    // No plan found, move to needsPlan
                    self.setState(.needsPlan)
                    self.fetchCoachesIfNeeded()
                }
            }
        }
    }
    
    /// Generic retry for current operation
    private func retryCurrentOperation() {
        // Determine what to retry based on current context using encapsulated methods
        if userManager.isReadyForPlanGeneration() {
            if workoutManager.needsPlan() {
                retryFetchPlan()
            } else if workoutManager.needsCoaches() {
                retryFetchCoaches()
            }
        } else {
            // Try to refresh user profile
            setState(.loading)
            userManager.checkAuthenticationState()
        }
    }

    // MARK: - Enhanced Public Methods
    
    /// Enhanced retry method for manual user retry
    func retryFromError() {
        guard case .error = state else { return }
        
        print("[DEBUG] AppViewModel: Manual retry requested from error state")
        
        // Reset retry count for manual retry
        currentRetryCount = 0
        
        // Attempt recovery
        attemptAutoRetry()
    }
    
    /// Enhanced fetch method with error recovery
    func fetchCoachesAndPlanIfNeeded() {
        guard userManager.isReadyForPlanGeneration() else { return }
        
        // Clear any existing errors
        if case .error = state {
            setState(.loading)
        }
        
        // Use encapsulated method to get user goal
        guard let userGoal = userManager.getUserPrimaryGoal() else { return }
        
        // Fetch coaches first, then check for existing plan
        workoutManager.fetchCoaches(userGoal: userGoal) { [weak self] success in
            guard let self = self else { return }
            if success {
                // Coaches fetched successfully, now check for existing plan
                let userProfileId = self.userManager.userProfile?.id
                self.workoutManager.fetchExistingPlan(userProfileId: userProfileId) { success in
                    // The subscription will handle state updates based on workoutPlan
                }
            } else {
                self.setState(.error(message: "Failed to fetch coaches.", canRetry: true, retryCount: 0))
            }
        }
    }
    
    func generatePlanForUser(authToken: String, completion: @escaping (Bool) -> Void) {
        guard let userProfile = userManager.userProfile else {
            setState(.error(message: "User profile not found."))
            completion(false)
            return
        }
        
        workoutManager.createAndProvidePlan(for: userProfile) { [weak self] success in
            guard let self = self else { return }
            
            if success {
                // Plan generated successfully, subscription will handle state update
                completion(true)
            } else {
                self.setState(.error(message: "Failed to generate workout plan."))
                completion(false)
            }
        }
    }

    func logout() {
        userManager.logout()
        hasAttemptedPlanFetch = false
        setState(.loggedOut)
        print("[DEBUG] AppViewModel.state set to .loggedOut in logout()")
    }
    
    /// Cleans up app lifecycle resources
    func cleanup() {
        NotificationCenter.default.removeObserver(self)
        backgroundTimer?.invalidate()
        backgroundTimer = nil
        pendingOperations.removeAll()
        print("[DEBUG] AppViewModel: App lifecycle cleanup completed")
    }
    
    deinit {
        cleanup()
    }
}

// MARK: - App Lifecycle Models

/// Represents an operation that was pending when the app went to background
struct PendingOperation {
    let type: OperationType
    let timestamp: Date
    let context: [String: Any]
    
    enum OperationType {
        case autoRetry
        case planGeneration
        case coachFetch
        case planFetch
        case userValidation
    }
}

// MARK: - App Lifecycle Handling

extension AppViewModel {
    
    /// Sets up app lifecycle notification handling
    private func setupAppLifecycleHandling() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.handleBackgroundTransition()
        }
        
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.handleForegroundTransition()
        }
        
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.handleAppBecameActive()
        }
        
        print("[DEBUG] AppViewModel: App lifecycle handling setup complete")
    }
    
    /// Handles when app goes to background
    private func handleBackgroundTransition() {
        print("[DEBUG] AppViewModel: App entering background")
        isAppInBackground = true
        backgroundedAt = Date()
        
        // Pause any ongoing operations
        pauseOngoingOperations()
        
        // Cancel background timer if it exists
        backgroundTimer?.invalidate()
        backgroundTimer = nil
        
        // Save current state for resumption
        saveCurrentState()
    }
    
    /// Handles when app comes to foreground
    private func handleForegroundTransition() {
        print("[DEBUG] AppViewModel: App entering foreground")
        isAppInBackground = false
        
        // Check how long we were in background
        if let backgroundedAt = backgroundedAt {
            let backgroundDuration = Date().timeIntervalSince(backgroundedAt)
            print("[DEBUG] AppViewModel: Was in background for \(backgroundDuration) seconds")
            
            // If we were backgrounded for more than 5 minutes, refresh everything
            if backgroundDuration > 300 { // 5 minutes
                print("[DEBUG] AppViewModel: Long background duration, refreshing state")
                refreshAppState()
            }
        }
        
        // Resume pending operations
        resumePendingOperations()
        
        // Validate current state
        validateCurrentState()
    }
    
    /// Handles when app becomes active (additional safety check)
    private func handleAppBecameActive() {
        print("[DEBUG] AppViewModel: App became active")
        
        // Additional validation when app becomes active
        if !isAppInBackground {
            validateCurrentState()
        }
    }
    
    /// Pauses ongoing operations when going to background
    private func pauseOngoingOperations() {
        // Check what operations are currently running
        switch state {
        case .loading:
            // We're loading something, save this operation
            let operation = determineCurrentOperation()
            if let operation = operation {
                pendingOperations.append(operation)
                print("[DEBUG] AppViewModel: Paused operation: \(operation.type)")
            }
            
        case .error:
            // If we're in error state with auto-retry pending, save it
            if case .error(_, let canRetry, let retryCount) = state,
               canRetry && retryCount < maxRetryAttempts {
                let operation = PendingOperation(
                    type: .autoRetry,
                    timestamp: Date(),
                    context: ["retryCount": retryCount, "error": lastError ?? ""]
                )
                pendingOperations.append(operation)
                print("[DEBUG] AppViewModel: Paused auto-retry operation")
            }
            
        default:
            break
        }
    }
    
    /// Determines what operation is currently running
    private func determineCurrentOperation() -> PendingOperation? {
        // This is a simplified version - you could make this more sophisticated
        if workoutManager.isLoading {
            return PendingOperation(
                type: .planFetch,
                timestamp: Date(),
                context: [:]
            )
        }
        
        if workoutManager.isCoachesLoading {
            return PendingOperation(
                type: .coachFetch,
                timestamp: Date(),
                context: [:]
            )
        }
        
        return nil
    }
    
    /// Saves current state for resumption
    private func saveCurrentState() {
        // Save current state to UserDefaults or other persistent storage
        // This ensures we can resume properly if the app is terminated
        UserDefaults.standard.set(state.description, forKey: "AppViewModel.lastState")
        UserDefaults.standard.set(Date(), forKey: "AppViewModel.lastStateTimestamp")
        print("[DEBUG] AppViewModel: Saved current state: \(state)")
    }
    
    /// Refreshes app state after long background duration
    private func refreshAppState() {
        print("[DEBUG] AppViewModel: Refreshing app state after long background")
        
        // Reset any stale state
        hasAttemptedPlanFetch = false
        
        // Validate authentication
        userManager.checkAuthenticationState()
        
        // Check if we need to refresh workout data
        if case .loaded = state {
            // We have a plan, but it might be stale
            setState(.loading)
            workoutManager.fetchExistingPlan(userProfileId: userManager.userProfile?.id) { [weak self] found in
                DispatchQueue.main.async {
                    if found {
                        // Plan is still valid
                        self?.setState(.loaded(plan: self?.workoutManager.getCurrentWorkoutPlan() ?? mockWorkoutPlan))
                    } else {
                        // Plan is no longer valid
                        self?.setState(.needsPlan)
                    }
                }
            }
        }
    }
    
    /// Resumes pending operations when coming to foreground
    private func resumePendingOperations() {
        guard !pendingOperations.isEmpty else { return }
        
        print("[DEBUG] AppViewModel: Resuming \(pendingOperations.count) pending operations")
        
        for operation in pendingOperations {
            resumeOperation(operation)
        }
        
        // Clear pending operations
        pendingOperations.removeAll()
    }
    
    /// Resumes a specific pending operation
    private func resumeOperation(_ operation: PendingOperation) {
        switch operation.type {
        case .autoRetry:
            // Resume auto-retry if we're still in error state
            if case .error = state {
                print("[DEBUG] AppViewModel: Resuming auto-retry operation")
                attemptAutoRetry()
            }
            
        case .planFetch:
            // Resume plan fetch if we still need it
            if workoutManager.needsPlan() {
                print("[DEBUG] AppViewModel: Resuming plan fetch operation")
                setState(.loading)
                workoutManager.fetchExistingPlan(userProfileId: userManager.userProfile?.id) { [weak self] found in
                    // Handle result
                }
            }
            
        case .coachFetch:
            // Resume coach fetch if we still need it
            if workoutManager.needsCoaches() {
                print("[DEBUG] AppViewModel: Resuming coach fetch operation")
                if let userGoal = userManager.getUserPrimaryGoal() {
                    workoutManager.fetchCoaches(userGoal: userGoal) { [weak self] success in
                        // Handle result
                    }
                }
            }
            
        case .planGeneration:
            // Resume plan generation if we were in the middle of it
            print("[DEBUG] AppViewModel: Resuming plan generation operation")
            // This would typically involve checking if generation completed in background
            
        case .userValidation:
            // Resume user validation
            print("[DEBUG] AppViewModel: Resuming user validation operation")
            userManager.checkAuthenticationState()
        }
    }
    
    /// Validates current state when coming to foreground
    private func validateCurrentState() {
        print("[DEBUG] AppViewModel: Validating current state")
        
        // Check if authentication is still valid
        Task {
            let isStillAuthenticated = await userManager.isUserAuthenticated()
            await MainActor.run {
                if !isStillAuthenticated && self.userManager.authToken != nil {
                    print("[DEBUG] AppViewModel: Authentication expired, logging out")
                    self.logout()
                }
            }
        }
        
        // Check if we're in a loading state that should have completed
        if case .loading = state {
            // If we've been loading for too long, something might be wrong
            // Extended timeout for workout plan generation which can take 2-5 minutes
            let loadingTimeout: TimeInterval = 300 // 5 minutes for complex operations like workout generation
            if let backgroundedAt = backgroundedAt,
               Date().timeIntervalSince(backgroundedAt) > loadingTimeout {
                print("[DEBUG] AppViewModel: Loading timeout exceeded, checking state")
                checkLoadingStateTimeout()
            }
        }
    }
    
    /// Checks if loading state has timed out
    private func checkLoadingStateTimeout() {
        // If we're stuck in loading, try to recover
        if workoutManager.isLoading {
            // Cancel the current operation and show error
            setState(.error(message: "Operation timed out. Please try again.", canRetry: true, retryCount: 0))
        } else if userManager.isLoading {
            // User manager is stuck, reset it
            userManager.isLoading = false
            setState(.loggedOut)
        }
    }
} 