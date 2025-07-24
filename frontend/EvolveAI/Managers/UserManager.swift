import Foundation


import Foundation

class UserManager: ObservableObject {
    @Published var isLoading = true
    @Published var isOnboardingComplete = false
    @Published var authToken: String? {
        didSet {
            // In a real app, you would save `authToken` to the Keychain here.
            // For simplicity, we use UserDefaults.
            if let token = authToken {
                UserDefaults.standard.set(token, forKey: "authToken")
            } else {
                UserDefaults.standard.removeObject(forKey: "authToken")
            }
        }
    }
    
    // The UserManager now uses the network service directly.
    private let networkService: NetworkServiceProtocol

    // We can inject a mock service for testing, but default to the real one.
    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
        // Load any saved session data when the app starts.
        loadUserSession()
    }
    
    /// Checks for a saved token and onboarding status to determine the app's initial state.
    func checkAuthenticationState() {
        // This check is now synchronous based on what was loaded in init().
        // If there's no token, we're done loading and the user is logged out.
        if authToken == nil {
            self.isLoading = false
        } else {
            // If there is a token, we need to verify if onboarding is complete.
            checkOnboardingStatus()
        }
    }
    
    func signInWithApple() {}
    func signInWithGoogle() {}
    func signInWithFacebook() {}
    /// Handles user login by calling the network service.
    func login(username: String, password: String) {
        isLoading = true
        let credentials = ["username": username, "password": password]
        
        networkService.login(credentials: credentials) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let token):
                    // On successful login, save the token...
                    self?.authToken = token
                    // ...and then check if onboarding is complete.
                    self?.checkOnboardingStatus()
                case .failure(let error):
                    // Handle login failure
                    print("Login failed: \(error.localizedDescription)")
                    self?.isLoading = false
                }
            }
        }
    }
    
    /// Checks if a workout plan exists on the server to determine onboarding status.
    func checkOnboardingStatus() {
        guard let token = authToken else {
            isLoading = false
            return
        }
        
        isLoading = true
        networkService.getWorkoutPlan(authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    // If we successfully get a plan, onboarding is complete.
                    self?.isOnboardingComplete = true
                    self?.saveOnboardingStatus(isComplete: true)
                case .failure:
                    // If it fails (e.g., 404 Not Found), onboarding is not complete.
                    self?.isOnboardingComplete = false
                    self?.saveOnboardingStatus(isComplete: false)
                }
                self?.isLoading = false
            }
        }
    }

    /// Generates the initial workout plan and marks onboarding as complete.
    /// This is the sole responsibility of the UserManager.
    func completeOnboardingAndGeneratePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void) {

         #if DEBUG
              print("--- App is running in DEBUG mode. Not calling OpenAI model ---")
             self.isOnboardingComplete = true
             self.saveOnboardingStatus(isComplete: true)
             completion(true)
         #endif

        guard let token = authToken else {
            print("Error: Auth token missing for plan generation.")
            completion(false)
            return
        }
        
        print("--- Performing REAL network call to generate workout plan... ---")
        networkService.generateWorkoutPlan(for: profile, authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    // On success, update and save the onboarding state.
                    self?.isOnboardingComplete = true
                    self?.saveOnboardingStatus(isComplete: true)
                    completion(true)
                    
                case .failure(let error):
                    print("Failed to generate plan: \(error.localizedDescription)")
                    completion(false)
                }
            }
        }
    }
    
    // MARK: - Private Helper Methods
    
    /// Saves the user's onboarding completion status to UserDefaults.
    private func saveOnboardingStatus(isComplete: Bool) {
        UserDefaults.standard.set(isComplete, forKey: "onboardingComplete")
    }
    
    /// Loads the session token and onboarding status from UserDefaults at app launch.
    private func loadUserSession() {
        self.authToken = UserDefaults.standard.string(forKey: "authToken")
        self.isOnboardingComplete = UserDefaults.standard.bool(forKey: "onboardingComplete")
    }

}

