import Foundation

class UserManager: ObservableObject {
    @Published var isLoading = true
    @Published var isOnboardingComplete = false
    @Published var authToken: String? {
            // Use didSet to save the token to Keychain whenever it's set
            didSet {
                // In a real app, you would save `authToken` to the Keychain here.
            }
        }
    
    private var networkService = NetworkService()

    init() {
            // In a real app, you would try to load a token from the Keychain here.
            // For this example, we'll simulate that. If a token were found,
            // you would call checkOnboardingStatus().
            
            // Since we have no saved token, we ensure the loading state is false
            // so the app can proceed to the LoginView.
//            login(username: "evolve-admin", password: "@Evolveai")
    }
    
    func checkAuthenticationState() {
           // This function would contain your logic to check for a token
           // in the Keychain. We'll simulate it with a 2-second delay.
           
           // Ensure we don't run this check multiple times
           guard isLoading else { return }

           DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
               // After the check is complete:
               // 1. Update the auth token and onboarding status based on what was found.
               // For this example, we'll pretend the user is not logged in.
               self.authToken = nil
               self.isOnboardingComplete = false

               // 2. Set isLoading to false to hide the spinner and show the correct view.
               self.isLoading = false
           }
       }
    
    func signInWithApple() {}
    func signInWithGoogle() {}
    func signInWithFacebook() {}
    // This function is now called by your LoginView
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
                    // Handle login failure (e.g., show an alert)
                    print("Login failed: \(error)")
                    self?.isLoading = false
                }
            }
        }
    }
    
    func checkOnboardingStatus() {
        guard let token = authToken else {
            isLoading = false
            return
        }
        
        isLoading = true
        networkService.getWorkoutPlan(authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                self?.isOnboardingComplete = (result.isSuccess)
                self?.isLoading = false
            }
        }
    }

    func generateAndSavePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void) {
        guard let token = authToken else {
            completion(false)
            return
        }

        networkService.generateWorkout(for: profile, authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                if result.isSuccess {
                    self?.isOnboardingComplete = true
                    completion(true)
                } else {
                    completion(false)
                }
            }
        }
    }
}

// Helper to check Result
extension Result {
    var isSuccess: Bool {
        if case .success = self { return true }
        return false
    }
}
