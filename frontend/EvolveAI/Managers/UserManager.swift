import Foundation

protocol UserManagerProtocol: AnyObject {
    var isLoading: Bool { get set }
    var isOnboardingComplete: Bool { get set }
    var userProfile: UserProfile? { get set }
    var authToken: String? { get set }
    
    func checkAuthenticationState()
    func login(username: String, password: String)
    func completeOnboarding(with profile: UserProfile, completion: @escaping (Bool) -> Void)
    func logout()
}

class UserManager: ObservableObject, UserManagerProtocol {
    @Published var isLoading: Bool = false {
        didSet {
            print("UserManager.isLoading changed to \(isLoading) in \(#function), line \(#line)")
        }
    }
    
    @Published var isOnboardingComplete = true {
        didSet {
            print("UserManager.isOnboardingComplete changed to \(isOnboardingComplete)")
            print("Stack trace: \(Thread.callStackSymbols.prefix(5).joined(separator: "\n"))")
        }
    }
    
    // Computed property that derives onboarding status from actual user profile
    var isOnboardingCompleteComputed: Bool {
        return userProfile != nil
    }
    
    @Published var userProfile: UserProfile? = nil {
        didSet {
            print("UserManager.userProfile changed to \(userProfile != nil ? "present" : "nil")")
            if userProfile == nil {
                print("UserProfile set to nil - this will affect onboarding status")
            }
        }
    }
    
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
        printState("checkAuthenticationState - start")
        if authToken == nil {
            self.isLoading = false
            printState("checkAuthenticationState - no token")
        } else {
            self.isLoading = true  // Set loading to true when we start fetching
            printState("checkAuthenticationState - fetching user data")
            fetchUserData()
        }
    }
    
    private func fetchUserData() {
        guard let token = authToken else {
            self.isLoading = false
            printState("fetchUserData - no token")
            return
        }
        networkService.getUserProfile(authToken: token) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let profile):
                    self?.userProfile = profile
                    self?.isOnboardingComplete = true
                    self?.isLoading = false
                    self?.printState("fetchUserData - success")
                case .failure:
                    self?.authToken = nil
                    self?.userProfile = nil
                    self?.isOnboardingComplete = false
                    self?.isLoading = false
                    self?.printState("fetchUserData - failure")
                }
            }
        }
    }
    
    func signInWithApple() {}
    func signInWithGoogle() {}
    func signInWithFacebook() {}
    
    func login(username: String, password: String) {
        isLoading = true
        printState("login - start")
        let credentials = ["username": username, "password": password]
        networkService.login(credentials: credentials) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let token):
                    self?.authToken = token
                    self?.fetchUserData()
                    self?.printState("login - success, token set")
                case .failure(let error):
                    print("Login failed: \(error.localizedDescription)")
                    self?.isLoading = false
                    self?.printState("login - failure")
                }
            }
        }
    }
    
    // private func checkOnboardingStatus() {
    //     // Fixed: Only update if the value actually needs to change
    //     let shouldBeComplete = (userProfile != nil)
        
    //     if isOnboardingComplete != shouldBeComplete {
    //         self.isOnboardingComplete = shouldBeComplete
    //         self.saveOnboardingStatus(isComplete: shouldBeComplete)
    //     }
        
    //     self.isLoading = false
    // }

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
                    self?.isLoading = false
                    self?.printState("completeOnboarding - success")
                    completion(true)
                case .failure(let error):
                    print("Failed to save profile: \(error.localizedDescription)")
                    self?.isLoading = false
                    self?.printState("completeOnboarding - failure")
                    completion(false)
                }
            }
        }
    }
    
    func logout() {
        print("UserManager.logout() called")
        authToken = nil
        userProfile = nil
        isOnboardingComplete = false
        isLoading = false
        printState("logout")
    }

    
    private func loadUserSession() {
        self.authToken = UserDefaults.standard.string(forKey: "authToken")
        // self.isOnboardingComplete = false
        // self.isLoading = false
        printState("loadUserSession")
        
        // For debugging: If we're in mock mode and have no token, create a mock token
        #if DEBUG
        if self.authToken == nil {
            print("[DEBUG] No auth token found, creating mock token for testing")
            self.authToken = "mock-token"
        }
        #endif
    }
    
    // Keep this method for any remaining calls, but make it a no-op
    private func saveOnboardingStatus(isComplete: Bool) {
        // No longer saving to UserDefaults - onboarding status is derived from user profile
    }
    
    // Helper to print current state
    private func printState(_ context: String) {
        let address = Unmanaged.passUnretained(self).toOpaque()
        print("[UserManager \(address)] [\(context)] isLoading: \(isLoading), hasToken: \(authToken != nil), hasProfile: \(userProfile != nil), onboardingComplete: \(isOnboardingComplete)")
        if isLoading && userProfile != nil && isOnboardingComplete {
            print("[UserManager][WARNING] isLoading is TRUE even though userProfile and isOnboardingComplete are set!")
        }
    }
}