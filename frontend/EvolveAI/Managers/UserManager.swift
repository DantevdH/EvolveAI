import Foundation

protocol UserManagerProtocol: AnyObject {
    var isLoading: Bool { get set }
    var isOnboardingComplete: Bool { get set }
    var userProfile: UserProfile? { get set }
    var authToken: String? { get set }
    
    func checkAuthenticationState()
    func login(username: String, password: String)
    func signInWithEmail(email: String, password: String)
    func signUpWithEmail(email: String, password: String)
    func signInWithGoogle()
    func signInWithFacebook()
    func signInWithApple()
    func completeOnboarding(with profile: UserProfile, completion: @escaping (Bool) -> Void)
    func markOnboardingComplete()
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
    
    // Track whether we've attempted to validate the token
    @Published var isNewUser = false
    @Published var networkErrorMessage: String? = nil
    private let networkService: NetworkServiceProtocol
    private let supabaseManager: SupabaseManagerProtocol

    init(networkService: NetworkServiceProtocol = AppEnvironment.networkService, 
         supabaseManager: SupabaseManagerProtocol = SupabaseManager.shared) {
        self.networkService = networkService
        self.supabaseManager = supabaseManager
        loadUserSession()
    }
    
    private func loadUserSession() {
        // For scenarios, we need to check the backend for the current user state
        // For now, just use the network service to get the auth token
        self.authToken = networkService.getAuthToken()
        printState("loadUserSession")
    }

    func checkAuthenticationState() {
        printState("checkAuthenticationState - start")
        
        if authToken == nil {
            // No token means user needs to log in
            self.isLoading = false
            printState("checkAuthenticationState - no token, user needs to login")
        } else {
            // We have a token, but need to validate it
            self.isLoading = true
            printState("checkAuthenticationState - validating token")
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
                    self?.networkErrorMessage = nil
                    self?.printState("fetchUserData - success")
                case .failure(let error):
                    if let networkError = error as NSError? {
                        switch networkError.code {
                        case 401:
                            print("Token is invalid (401), clearing auth token")
                            self?.authToken = nil
                            self?.userProfile = nil
                            self?.isOnboardingComplete = false
                        case 404:
                            print("User profile not found (404), moving to onboarding")
                            self?.userProfile = nil
                            self?.isOnboardingComplete = false
                            self?.isNewUser = true
                        case 500...599:
                            print("Network/server error ( \(networkError.code)), surfacing error to UI")
                            self?.networkErrorMessage = "A network error occurred. Please try again."
                        default:
                            print("Network error (\(networkError.code)), keeping token but clearing profile")
                            self?.userProfile = nil
                            self?.isOnboardingComplete = false
                        }
                    } else {
                        self?.authToken = nil
                        self?.userProfile = nil
                        self?.isOnboardingComplete = false
                    }
                    self?.isLoading = false
                    self?.printState("fetchUserData - failure: \(error.localizedDescription)")
                }
            }
        }
    }
    
    func signInWithEmail(email: String, password: String) {
        isLoading = true
        printState("signInWithEmail - start")
        
        supabaseManager.signInWithEmail(email: email, password: password) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let authResult):
                    // Exchange Supabase token for Django token
                    self?.exchangeSupabaseTokenForDjangoToken(authResult.accessToken)
                case .failure(let error):
                    print("Email sign-in failed: \(error.localizedDescription)")
                    self?.isLoading = false
                    self?.networkErrorMessage = error.localizedDescription
                    self?.printState("signInWithEmail - failure")
                }
            }
        }
    }
    
    func signUpWithEmail(email: String, password: String) {
        isLoading = true
        printState("signUpWithEmail - start")
        
        supabaseManager.signUpWithEmail(email: email, password: password) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let authResult):
                    // Exchange Supabase token for Django token
                    self?.exchangeSupabaseTokenForDjangoToken(authResult.accessToken)
                case .failure(let error):
                    print("Email sign-up failed: \(error.localizedDescription)")
                    self?.isLoading = false
                    self?.networkErrorMessage = error.localizedDescription
                    self?.printState("signUpWithEmail - failure")
                }
            }
        }
    }
    
    func signInWithGoogle() {
        isLoading = true
        printState("signInWithGoogle - start")
        
        supabaseManager.signInWithGoogle { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let authResult):
                    // Exchange Supabase token for Django token
                    self?.exchangeSupabaseTokenForDjangoToken(authResult.accessToken)
                case .failure(let error):
                    print("Google sign-in failed: \(error.localizedDescription)")
                    self?.isLoading = false
                    self?.networkErrorMessage = error.localizedDescription
                    self?.printState("signInWithGoogle - failure")
                }
            }
        }
    }
    
    func signInWithFacebook() {
        isLoading = true
        printState("signInWithFacebook - start")
        
        supabaseManager.signInWithFacebook { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let authResult):
                    // Exchange Supabase token for Django token
                    self?.exchangeSupabaseTokenForDjangoToken(authResult.accessToken)
                case .failure(let error):
                    print("Facebook sign-in failed: \(error.localizedDescription)")
                    self?.isLoading = false
                    self?.networkErrorMessage = error.localizedDescription
                    self?.printState("signInWithFacebook - failure")
                }
            }
        }
    }
    
    // Apple Sign-In disabled as requested
    func signInWithApple() {
        print("Apple Sign-In is disabled")
        self.isLoading = false
        self.networkErrorMessage = "Apple Sign-In is not available"
    }
    
    private func exchangeSupabaseTokenForDjangoToken(_ supabaseToken: String) {
        // Call Django backend to exchange Supabase token for Django token
        let body = ["access_token": supabaseToken]
        
        guard let url = URL(string: "http://127.0.0.1:8000/api/users/auth/supabase/") else {
            self.isLoading = false
            self.networkErrorMessage = "Invalid URL"
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.isLoading = false
                    self?.networkErrorMessage = error.localizedDescription
                    return
                }
                
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let djangoToken = json["token"] as? String else {
                    self?.isLoading = false
                    self?.networkErrorMessage = "Failed to get Django token"
                    return
                }
                
                // Set Django token and fetch user data
                self?.authToken = djangoToken
                self?.fetchUserData()
                self?.printState("exchangeSupabaseTokenForDjangoToken - success")
            }
        }.resume()
    }
    
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
                    // Don't set isOnboardingComplete yet - wait for plan generation
                    self?.isLoading = false
                    self?.isNewUser = false
                    self?.printState("completeOnboarding - success (profile saved)")
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
    
    /// Marks onboarding as complete after plan generation
    func markOnboardingComplete() {
        self.isOnboardingComplete = true
        self.printState("markOnboardingComplete")
    }
    
    func logout() {
        print("UserManager.logout() called")
        authToken = nil
        userProfile = nil
        isOnboardingComplete = false
        isLoading = false
        printState("logout")
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