import Foundation
import Supabase

// MARK: - Supabase Configuration
struct SupabaseConfig {
    static let url: String = {
        guard let path = Bundle.main.path(forResource: "Config", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: path),
              let url = dict["SUPABASE_URL"] as? String else {
            fatalError("SUPABASE_URL not found in Config.plist")
        }
        return url
    }()
    
    static let anonKey: String = {
        guard let path = Bundle.main.path(forResource: "Config", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: path),
              let key = dict["SUPABASE_ANON_KEY"] as? String else {
            fatalError("SUPABASE_ANON_KEY not found in Config.plist")
        }
        return key
    }()
    
    // Add redirect URL configuration
    static let redirectURL: String = "com.evolveai.app://oauth/callback"
}

// Create Supabase client - redirect URL will be passed per-request
let supabase = SupabaseClient(
    supabaseURL: URL(string: SupabaseConfig.url)!,
    supabaseKey: SupabaseConfig.anonKey
)

protocol UserManagerProtocol: AnyObject {
    var isLoading: Bool { get set }
    var isOnboardingComplete: Bool { get }
    var userProfile: UserProfile? { get set }
    var authToken: String? { get set }
    var isAuthenticated: Bool { get set }
    
    func checkAuthenticationState()
    func signInWithEmail(email: String, password: String)
    func signUpWithEmail(email: String, password: String)
    func signInWithGoogle()
    func signInWithFacebook()
    func signInWithApple()
    func completeOnboarding(with profile: UserProfile, completion: @escaping (Bool) -> Void)
    func logout()
}

class UserManager: ObservableObject, UserManagerProtocol {
    @Published var isLoading: Bool = false {
        didSet {
            print("UserManager.isLoading changed to \(isLoading) in \(#function), line \(#line)")
        }
    }
    
    // Onboarding is complete if user profile exists
    var isOnboardingComplete: Bool {
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
                // Save to both UserDefaults and NetworkService for consistency
                UserDefaults.standard.set(token, forKey: "authToken")
                // Note: NetworkService.saveAuthToken() should be called when we get a valid Supabase session
            } else {
                UserDefaults.standard.removeObject(forKey: "authToken")
                // Note: NetworkService.clearAuthToken() should be called when logging out
            }
        }
    }
    
    @Published var isAuthenticated: Bool = false {
        didSet {
            print("UserManager.isAuthenticated changed to \(isAuthenticated)")
        }
    }
    
    // Track whether we've attempted to validate the token
    @Published var isNewUser = false
    @Published var errorMessage: String? = nil

    init() {
        // #if DEBUG
        // // Clear auth state in debug mode to ensure clean testing
        // clearAllAuthState()
        // #else
        loadUserSession()
        // #endif
        setupOAuthNotifications()
    }
    
    private func loadUserSession() {
        // Check if we have a stored Supabase session
        Task {
            do {
                let session = try await supabase.auth.session
                await MainActor.run {
                    self.authToken = session.accessToken
                    self.isAuthenticated = true
                    // Save the Supabase token to NetworkService for consistency
                    // Note: You might want to inject NetworkService as a dependency
                    printState("loadUserSession - found session")
                }
            } catch {
                await MainActor.run {
                    self.authToken = nil
                    self.isAuthenticated = false
                    printState("loadUserSession - no session")
                }
            }
        }
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
        
        Task {
            do {
                // Get current session to get user ID
                let session = try await supabase.auth.session
                let userId = session.user.id
                
                print("Fetching user profile for user ID: \(userId)")
                
                let response: [UserProfile] = try await supabase.database
                    .from("user_profiles")
                    .select()
                    .eq("user_id", value: userId)
                    .execute()
                    .value
                
                await MainActor.run {
                    if let profile = response.first {
                        print("Found user profile: \(profile)")
                        self.userProfile = profile
                    } else {
                        print("No user profile found for user ID: \(userId)")
                        // No profile found, userProfile will be nil
                        self.userProfile = nil
                    }
                    self.isLoading = false
                    self.printState("fetchUserData - success")
                }
            } catch {
                await MainActor.run {
                    print("Failed to fetch user profile: \(error)")
                    print("Error details: \(error)")
                    self.userProfile = nil
                    self.isLoading = false
                    self.printState("fetchUserData - failure: \(error.localizedDescription)")
                }
            }
        }
    }
    
    @Published var userEmail: String? = nil

    // MARK: - Social Authentication
    
    func signInWithGoogle() {
        print("[UserManager] signInWithGoogle called")
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                print("[UserManager] Initiating Google OAuth flow")
                // Use Supabase's OAuth flow for Google with explicit redirect URL
                try await supabase.auth.signInWithOAuth(
                    provider: .google,
                    redirectTo: URL(string: SupabaseConfig.redirectURL)
                )
                print("[UserManager] Google OAuth flow initiated successfully")
                // This will open Safari for OAuth flow
                // The session will be handled by the app delegate URL callback
                // Note: isLoading will be set to false in handleOAuthSession when the OAuth completes
                
                // Add a fallback check after 5 seconds to see if session was established
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                    print("[UserManager] Starting fallback session check")
                    Task {
                        do {
                            let session = try await supabase.auth.session
                            print("[UserManager] Fallback check: Found session after OAuth - user: \(session.user.email ?? "unknown")")
                            await MainActor.run {
                                self?.handleOAuthSession(session)
                            }
                        } catch {
                            print("[UserManager] Fallback check: No session found after OAuth - error: \(error)")
                            await MainActor.run {
                                self?.isLoading = false
                                self?.errorMessage = "OAuth authentication timed out. Please try again."
                            }
                        }
                    }
                }
            } catch {
                print("[UserManager] Google OAuth error: \(error)")
                await MainActor.run {
                    self.errorMessage = "Google Sign-In failed: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    func signInWithFacebook() {
        print("[UserManager] signInWithFacebook called")
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                print("[UserManager] Initiating Facebook OAuth flow")
                // Use Supabase's OAuth flow for Facebook with explicit redirect URL
                try await supabase.auth.signInWithOAuth(
                    provider: .facebook,
                    redirectTo: URL(string: SupabaseConfig.redirectURL)
                )
                print("[UserManager] Facebook OAuth flow initiated successfully")
                // This will open Safari for OAuth flow
                // The session will be handled by the app delegate URL callback
                // Note: isLoading will be set to false in handleOAuthSession when the OAuth completes
                
                // Add a fallback check after 5 seconds to see if session was established
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                    print("[UserManager] Starting fallback session check")
                    Task {
                        do {
                            let session = try await supabase.auth.session
                            print("[UserManager] Fallback check: Found session after OAuth - user: \(session.user.email ?? "unknown")")
                            await MainActor.run {
                                self?.handleOAuthSession(session)
                            }
                        } catch {
                            print("[UserManager] Fallback check: No session found after OAuth - error: \(error)")
                            await MainActor.run {
                                self?.isLoading = false
                                self?.errorMessage = "OAuth authentication timed out. Please try again."
                            }
                        }
                    }
                }
            } catch {
                print("[UserManager] Facebook OAuth error: \(error)")
                await MainActor.run {
                    self.errorMessage = "Facebook Sign-In failed: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    func signInWithApple() {
        // This will be implemented with Apple Sign-In + Supabase
        // For now, just show a placeholder
        errorMessage = "Apple Sign-In coming soon"
    }
    
    // MARK: - Supabase Authentication Methods
    
    func signInWithEmail(email: String, password: String) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let session = try await supabase.auth.signIn(email: email, password: password)
                await MainActor.run {
                    self.authToken = session.accessToken
                    self.isAuthenticated = true
                    self.userEmail = session.user.email
                    self.isLoading = false
                    self.fetchUserData()
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Sign in failed: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }

    
    func signUpWithEmail(email: String, password: String) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let authResponse = try await supabase.auth.signUp(email: email, password: password)
                
                await MainActor.run {
                    if let session = authResponse.session {
                        self.authToken = session.accessToken
                        self.isAuthenticated = true
                        self.userEmail = authResponse.user.email
                        self.isLoading = false
                    } else {
                        self.errorMessage = "Sign up failed: No session returned"
                        self.isLoading = false
                    }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Sign up failed: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }

    
    func completeOnboarding(with profile: UserProfile, completion: @escaping (Bool) -> Void) {
        guard let token = authToken else {
            errorMessage = "Not authenticated"
            completion(false)
            return
        }
        
        isLoading = true
        
        Task {
            do {
                // Get current session to get user ID
                let session = try await supabase.auth.session
                let userId = session.user.id
                
                // Create a new profile with the user ID
                var profileToSave = profile
                profileToSave = UserProfile(
                    userId: userId,
                    username: profile.username,
                    primaryGoal: profile.primaryGoal,
                    primaryGoalDescription: profile.primaryGoalDescription,
                    experienceLevel: profile.experienceLevel,
                    daysPerWeek: profile.daysPerWeek,
                    minutesPerSession: profile.minutesPerSession,
                    equipment: profile.equipment,
                    age: profile.age,
                    weight: profile.weight,
                    weightUnit: profile.weightUnit,
                    height: profile.height,
                    heightUnit: profile.heightUnit,
                    gender: profile.gender,
                    hasLimitations: profile.hasLimitations,
                    limitationsDescription: profile.limitationsDescription,
                    finalChatNotes: profile.finalChatNotes
                )
                
                let response: [UserProfile] = try await supabase.database
                    .from("user_profiles")
                    .insert(profileToSave)
                    .select()
                    .execute()
                    .value
                
                await MainActor.run {
                    if let savedProfile = response.first {
                        self.userProfile = savedProfile
                        self.isLoading = false
                        self.isNewUser = false
                        self.printState("completeOnboarding - success (profile saved)")
                        completion(true)
                    } else {
                        self.errorMessage = "Failed to save profile: No response from server"
                        self.isLoading = false
                        self.printState("completeOnboarding - failure: no response")
                        completion(false)
                    }
                }
            } catch {
                await MainActor.run {
                    print("Failed to save profile: \(error.localizedDescription)")
                    self.errorMessage = "Failed to save profile: \(error.localizedDescription)"
                    self.isLoading = false
                    self.printState("completeOnboarding - failure")
                    completion(false)
                }
            }
        }
    }
    
    func logout() {
        print("UserManager.logout() called")
        
        Task {
            do {
                try await supabase.auth.signOut()
                await MainActor.run {
                    self.authToken = nil
                    self.userProfile = nil
                    self.isAuthenticated = false
                    self.userEmail = nil
                    self.isLoading = false
                    self.printState("logout")
                }
            } catch {
                await MainActor.run {
                    print("Logout error: \(error)")
                    // Still clear local state even if server logout fails
                    self.authToken = nil
                    self.userProfile = nil
                    self.isAuthenticated = false
                    self.userEmail = nil
                    self.isLoading = false
                    self.printState("logout")
                }
            }
        }
    }
    
    /// Clear all authentication state for testing new user scenarios
    func clearAllAuthState() {
        print("UserManager.clearAllAuthState() called")
        
        // Clear local state immediately
        self.authToken = nil
        self.userProfile = nil
        self.isAuthenticated = false
        self.userEmail = nil
        self.isLoading = false
        self.printState("clearAllAuthState")
        
        // Clear server session in background
        Task {
            do {
                try await supabase.auth.signOut()
                print("Server session cleared successfully")
            } catch {
                print("Clear auth state error: \(error)")
            }
        }
    }
    
    // MARK: - OAuth Session Handling
    
    private func setupOAuthNotifications() {
        print("[UserManager] Setting up OAuth notifications")
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOAuthSuccess),
            name: .supabaseOAuthSuccess,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOAuthError),
            name: .supabaseOAuthError,
            object: nil
        )
        print("[UserManager] OAuth notifications setup complete")
    }
    
    @objc private func handleOAuthSuccess(_ notification: Notification) {
        print("[UserManager] handleOAuthSuccess called")
        guard let session = notification.object as? Session else { 
            print("[UserManager] handleOAuthSuccess: Invalid session object")
            return 
        }
        handleOAuthSession(session)
    }
    
    @objc private func handleOAuthError(_ notification: Notification) {
        print("[UserManager] handleOAuthError called")
        guard let error = notification.object as? Error else { 
            print("[UserManager] handleOAuthError: Invalid error object")
            return 
        }
        errorMessage = "OAuth failed: \(error.localizedDescription)"
        isLoading = false
        print("[UserManager] handleOAuthError: isLoading set to false")
    }
    
    func handleOAuthSession(_ session: Session) {
        print("[UserManager] handleOAuthSession called")
        Task {
            await MainActor.run {
                print("[UserManager] handleOAuthSession: Setting up session")
                self.authToken = session.accessToken
                self.isAuthenticated = true
                self.userEmail = session.user.email
                self.isLoading = false
                print("[UserManager] handleOAuthSession: isLoading set to false")
                self.fetchUserData()
                print("OAuth session handled successfully")
            }
        }
    }

    // Keep this method for any remaining calls, but make it a no-op
    private func saveOnboardingStatus(isComplete: Bool) {
        // No longer saving to UserDefaults - onboarding status is derived from user profile
    }
    
    // MARK: - Auth Token Management
    
    /// Gets the current Supabase access token
    /// This is the primary method for getting the auth token
    var currentAuthToken: String? {
        return authToken
    }
    
    /// Checks if user is authenticated with a valid Supabase session
    func isUserAuthenticated() async -> Bool {
        do {
            let session = try await supabase.auth.session
            return !session.accessToken.isEmpty
        } catch {
            return false
        }
    }
    
    /// Refreshes the auth token from Supabase
    func refreshAuthToken() async {
        do {
            let session = try await supabase.auth.session
            await MainActor.run {
                self.authToken = session.accessToken
                self.isAuthenticated = true
            }
        } catch {
            await MainActor.run {
                self.authToken = nil
                self.isAuthenticated = false
            }
        }
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