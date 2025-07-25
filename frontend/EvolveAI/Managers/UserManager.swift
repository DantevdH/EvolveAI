import Foundation

class UserManager: ObservableObject {
    @Published var isLoading = true
    @Published var isOnboardingComplete = false
    @Published var userProfile: UserProfile? = nil
    @Published var authToken: String? {
        didSet {
            if let token = authToken {
                UserDefaults.standard.set(token, forKey: "authToken")
            } else {
                UserDefaults.standard.removeObject(forKey: "authToken")
            }
        }
    }
    
    private let networkService: NetworkServiceProtocol

    init(networkService: NetworkServiceProtocol = AppEnvironment.networkService) {
        self.networkService = networkService
        loadUserSession()
    }
    
    func checkAuthenticationState() {
        if authToken == nil {
            self.isLoading = false
        } else {
            fetchUserData()
        }
    }
    
    private func fetchUserData() {
        guard let token = authToken else {
            self.isLoading = false
            return
        }
        networkService.getUserProfile(authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let profile):
                    self?.userProfile = profile
                    self?.checkOnboardingStatus()
                case .failure:
                    self?.authToken = nil
                    self?.userProfile = nil
                    self?.isOnboardingComplete = false
                    self?.saveOnboardingStatus(isComplete: false)
                    self?.isLoading = false
                }
            }
        }
    }
    
    func signInWithApple() {}
    func signInWithGoogle() {}
    func signInWithFacebook() {}
    
    func login(username: String, password: String) {
        isLoading = true
        let credentials = ["username": username, "password": password]
        networkService.login(credentials: credentials) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let token):
                    self?.authToken = token
                    self?.fetchUserData()
                case .failure(let error):
                    print("Login failed: \(error.localizedDescription)")
                    self?.isLoading = false
                }
            }
        }
    }
    
    private func checkOnboardingStatus() {
        guard let token = authToken else {
            isLoading = false
            return
        }
        networkService.getWorkoutPlan(authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.isOnboardingComplete = true
                    self?.saveOnboardingStatus(isComplete: true)
                case .failure:
                    self?.isOnboardingComplete = false
                    self?.saveOnboardingStatus(isComplete: false)
                }
                self?.isLoading = false
            }
        }
    }

    func completeOnboarding(with profile: UserProfile, completion: @escaping (Bool) -> Void) {
        guard let token = authToken else {
            print("Error: Auth token missing for profile save.")
            completion(false)
            return
        }
        networkService.saveUserProfile(profile, authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.userProfile = profile
                    self?.isOnboardingComplete = true
                    self?.saveOnboardingStatus(isComplete: true)
                    completion(true)
                case .failure(let error):
                    print("Failed to save profile: \(error.localizedDescription)")
                    completion(false)
                }
            }
        }
    }
    
    func logout() {
        authToken = nil
        userProfile = nil
        isOnboardingComplete = false
        saveOnboardingStatus(isComplete: false)
    }
    
    private func saveOnboardingStatus(isComplete: Bool) {
        UserDefaults.standard.set(isComplete, forKey: "onboardingComplete")
    }
    
    private func loadUserSession() {
        self.authToken = UserDefaults.standard.string(forKey: "authToken")
        self.isOnboardingComplete = UserDefaults.standard.bool(forKey: "onboardingComplete")
    }
}

