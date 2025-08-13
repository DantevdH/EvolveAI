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
    
    // Add operation coordination
    private var currentOAuthOperation: OAuthOperation?
    private var fallbackTimer: Timer?
    private var isOAuthInProgress = false
    
    // Add email authentication coordination
    private var isEmailAuthInProgress = false
    private var currentEmailOperation: EmailAuthOperation?
    
    // Add retry logic
    private var currentRetryCount: Int = 0
    private var maxRetryAttempts: Int = 3
    private var lastError: Error?
    private var retryableOperations: [AuthOperationType] = []

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
                    self.clearRetryState()
                }
            } catch {
                await MainActor.run {
                    self.authToken = nil
                    self.isAuthenticated = false
                    printState("loadUserSession - no session")
                    // Don't retry session validation on app launch - user needs to sign in
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
            
            // Use retry logic for session validation
            let authOperation = AuthOperationType.sessionValidation
            storeRetryableOperation(authOperation)
            executeOperation(authOperation)
        }
    }
    
    private func fetchUserData() {
        print("[UserManager] fetchUserData called")
        guard let token = authToken else {
            self.isLoading = false
            printState("fetchUserData - no token")
            return
        }
        
        print("[UserManager] fetchUserData - starting fetch with token: \(token.prefix(10))...")
        
        Task {
            do {
                // Get current session to get user ID
                let session = try await supabase.auth.session
                let userId = session.user.id
                
                print("[UserManager] fetchUserData - got userId: \(userId)")
                
                let response: [UserProfile] = try await supabase.database
                    .from("user_profiles")
                    .select()
                    .eq("user_id", value: userId)
                    .execute()
                    .value
                
                print("[UserManager] fetchUserData - database response: \(response.count) profiles")
                
                await MainActor.run {
                    if let profile = response.first {
                        print("[UserManager] fetchUserData - found profile: \(profile)")
                        self.userProfile = profile
                    } else {
                        print("[UserManager] fetchUserData - no profile found for user ID: \(userId)")
                        // No profile found, userProfile will be nil
                        self.userProfile = nil
                    }
                    self.isLoading = false
                    self.printState("fetchUserData - success")
                    self.clearRetryState()
                }
            } catch {
                print("[UserManager] fetchUserData - error: \(error)")
                await MainActor.run {
                    print("Failed to fetch user profile: \(error)")
                    print("Error details: \(error)")
                    self.handleUserDataFetchFailureWithRetry(error: error)
                }
            }
        }
    }
    
    @Published var userEmail: String? = nil

    // MARK: - Social Authentication
    
    func signInWithGoogle() {
        print("[UserManager] signInWithGoogle called")
        
        // Prevent multiple OAuth operations
        guard !isOAuthInProgress else {
            print("[UserManager] OAuth already in progress, ignoring request")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isOAuthInProgress = true
        
        // Create OAuth operation
        let operation = OAuthOperation(
            provider: .google,
            startTime: Date(),
            fallbackTimer: nil
        )
        currentOAuthOperation = operation
        
        Task {
            do {
                print("[UserManager] Initiating Google OAuth flow")
                try await supabase.auth.signInWithOAuth(
                    provider: .google,
                    redirectTo: URL(string: SupabaseConfig.redirectURL)
                )
                print("[UserManager] Google OAuth flow initiated successfully")
                
                // OAuth initiated successfully, start fallback timer
                await MainActor.run {
                    self.startFallbackTimer(for: operation)
                }
                
            } catch {
                print("[UserManager] Google OAuth error: \(error)")
                await MainActor.run {
                    self.handleOAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    func signInWithFacebook() {
        print("[UserManager] signInWithFacebook called")
        
        // Prevent multiple OAuth operations
        guard !isOAuthInProgress else {
            print("[UserManager] OAuth already in progress, ignoring request")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isOAuthInProgress = true
        
        // Create OAuth operation
        let operation = OAuthOperation(
            provider: .facebook,
            startTime: Date(),
            fallbackTimer: nil
        )
        currentOAuthOperation = operation
        
        Task {
            do {
                print("[UserManager] Initiating Facebook OAuth flow")
                try await supabase.auth.signInWithOAuth(
                    provider: .facebook,
                    redirectTo: URL(string: SupabaseConfig.redirectURL)
                )
                print("[UserManager] Facebook OAuth flow initiated successfully")
                
                // OAuth initiated successfully, start fallback timer
                await MainActor.run {
                    self.startFallbackTimer(for: operation)
                }
                
            } catch {
                print("[UserManager] Facebook OAuth error: \(error)")
                await MainActor.run {
                    self.handleOAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    func signInWithApple() {
        print("[UserManager] signInWithApple called")
        
        // Prevent multiple OAuth operations
        guard !isOAuthInProgress else {
            print("[UserManager] OAuth already in progress, ignoring request")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isOAuthInProgress = true
        
        // Create OAuth operation
        let operation = OAuthOperation(
            provider: .apple,
            startTime: Date(),
            fallbackTimer: nil
        )
        currentOAuthOperation = operation
        
        Task {
            do {
                print("[UserManager] Initiating Apple OAuth flow")
                try await supabase.auth.signInWithOAuth(
                    provider: .apple,
                    redirectTo: URL(string: SupabaseConfig.redirectURL)
                )
                print("[UserManager] Apple OAuth flow initiated successfully")
                
                // OAuth initiated successfully, start fallback timer
                await MainActor.run {
                    self.startFallbackTimer(for: operation)
                }
                
            } catch {
                print("[UserManager] Apple OAuth error: \(error)")
                await MainActor.run {
                    self.handleOAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    func signInWithEmail(email: String, password: String) {
        // Prevent multiple email auth operations
        guard !isEmailAuthInProgress else {
            print("[UserManager] Email authentication already in progress, ignoring request")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isEmailAuthInProgress = true
        
        // Create email auth operation
        let operation = EmailAuthOperation(
            type: .signIn,
            email: email,
            startTime: Date()
        )
        currentEmailOperation = operation
        
        Task {
            do {
                let session = try await supabase.auth.signIn(email: email, password: password)
                await MainActor.run {
                    self.authToken = session.accessToken
                    self.isAuthenticated = true
                    self.userEmail = session.user.email
                    self.isLoading = false
                    self.fetchUserData()
                    
                    // Email auth succeeded, clean up operation
                    self.completeEmailAuthOperation()
                    self.clearRetryState()
                }
            } catch {
                await MainActor.run {
                    self.handleEmailAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    func signUpWithEmail(email: String, password: String) {
        // Prevent multiple email auth operations
        guard !isEmailAuthInProgress else {
            print("[UserManager] Email authentication already in progress, ignoring request")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isEmailAuthInProgress = true
        
        // Create email auth operation
        let operation = EmailAuthOperation(
            type: .signUp,
            email: email,
            startTime: Date()
        )
        currentEmailOperation = operation
        
        Task {
            do {
                let authResponse = try await supabase.auth.signUp(email: email, password: password)
                
                await MainActor.run {
                    if let session = authResponse.session {
                        self.authToken = session.accessToken
                        self.isAuthenticated = true
                        self.userEmail = authResponse.user.email
                        self.isLoading = false
                        
                        // Email auth succeeded, clean up operation
                        self.completeEmailAuthOperation()
                        self.clearRetryState()
                        
                        // IMPORTANT: After successful signup, fetch user data
                        // This ensures the user profile is loaded if it exists
                        print("[UserManager] signUpWithEmail - fetching user data after signup")
                        self.fetchUserData()
                    } else {
                        self.handleEmailAuthFailureWithRetry(
                            error: NSError(domain: "UserManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No session returned"]),
                            operation: operation
                        )
                    }
                }
            } catch {
                await MainActor.run {
                    self.handleEmailAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }

    
    func completeOnboarding(with profile: UserProfile, completion: @escaping (Bool) -> Void) {
        guard authToken != nil else {
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
                
                // Attach the real userId to the profile provided by onboarding
                var profileToSave = profile
                profileToSave.userId = userId
                
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
                        self.clearRetryState()
                        completion(true)
                    } else {
                        let error = NSError(domain: "UserManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to save profile: No response from server"])
                        self.handleOnboardingFailure(error: error, completion: completion)
                    }
                }
            } catch {
                await MainActor.run {
                    print("Failed to save profile: \(error.localizedDescription)")
                    self.handleOnboardingFailure(error: error, completion: completion)
                }
            }
        }
    }
    
    /// Handles onboarding failure with retry logic
    private func handleOnboardingFailure(error: Error, completion: @escaping (Bool) -> Void) {
        print("[UserManager] Onboarding failed: \(error.localizedDescription)")
        
        // Store operation for potential retry
        let authOperation = AuthOperationType.userDataFetch
        storeRetryableOperation(authOperation)
        
        // Check if we should retry
        if shouldRetryOperation(error: error) {
            // Retry the profile save operation
            attemptAutoRetry(for: authOperation)
            // Note: We'll need to store the profile and completion for retry
            // This is a simplified version - in practice you might want to store more context
        } else {
            // Final failure
            self.errorMessage = "Failed to save profile: \(error.localizedDescription)"
            self.isLoading = false
            self.printState("completeOnboarding - failure")
            self.clearRetryState()
            completion(false)
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
                
                // OAuth succeeded, clean up operation
                self.completeOAuthOperation()
            }
        }
    }
    
    // MARK: - OAuth Operation Management
    
    /// Starts a fallback timer for OAuth operations
    private func startFallbackTimer(for operation: OAuthOperation) {
        print("[UserManager] Starting fallback timer for \(operation.provider)")
        
        // Cancel any existing timer
        fallbackTimer?.invalidate()
        
        // Create new fallback timer
        fallbackTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
            self?.performFallbackCheck(for: operation)
        }
        
        // Update operation with timer reference
        currentOAuthOperation = OAuthOperation(
            provider: operation.provider,
            startTime: operation.startTime,
            fallbackTimer: fallbackTimer
        )
    }
    
    /// Performs fallback check when timer expires
    private func performFallbackCheck(for operation: OAuthOperation) {
        print("[UserManager] Performing fallback check for \(operation.provider)")
        
        // Only perform fallback if we're still in OAuth state
        guard isOAuthInProgress else {
            print("[UserManager] OAuth no longer in progress, skipping fallback")
            return
        }
        
        Task {
            do {
                let session = try await supabase.auth.session
                print("[UserManager] Fallback check: Found session after OAuth - user: \(session.user.email ?? "unknown")")
                
                await MainActor.run {
                    // OAuth succeeded but redirect failed, handle session
                    self.handleOAuthSession(session)
                }
                
            } catch {
                print("[UserManager] Fallback check: No session found after OAuth - error: \(error)")
                
                await MainActor.run {
                    // OAuth actually failed, show error
                    self.handleOAuthFailure(error: error, operation: operation)
                }
            }
        }
    }
    
    /// Handles OAuth operation failure
    private func handleOAuthFailure(error: Error, operation: OAuthOperation) {
        print("[UserManager] OAuth failed for \(operation.provider): \(error.localizedDescription)")
        
        // Clean up operation
        completeOAuthOperation()
        
        // Set error message
        let providerName: String
        switch operation.provider {
        case .google:
            providerName = "Google"
        case .facebook:
            providerName = "Facebook"
        case .apple:
            providerName = "Apple"
        @unknown default:
            providerName = "OAuth"
        }
        errorMessage = "\(providerName) Sign-In failed: \(error.localizedDescription)"
        isLoading = false
    }
    
    /// Completes OAuth operation and cleans up
    private func completeOAuthOperation() {
        print("[UserManager] Completing OAuth operation")
        
        // Cancel fallback timer
        fallbackTimer?.invalidate()
        fallbackTimer = nil
        
        // Clear operation state
        currentOAuthOperation = nil
        isOAuthInProgress = false
    }
    
    /// Cancels ongoing OAuth operation
    func cancelOAuthOperation() {
        print("[UserManager] Cancelling OAuth operation")
        
        // Cancel fallback timer
        fallbackTimer?.invalidate()
        fallbackTimer = nil
        
        // Clear operation state
        currentOAuthOperation = nil
        isOAuthInProgress = false
        
        // Reset loading state
        isLoading = false
        errorMessage = nil
    }
    
    // MARK: - Email Auth Operation Management
    
    /// Starts an email authentication operation
    private func startEmailAuthOperation(type: EmailAuthOperation.EmailAuthType, email: String) {
        print("[UserManager] Starting email auth operation: \(type)")
        
        // Prevent multiple email auth operations
        guard !isEmailAuthInProgress else {
            print("[UserManager] Email auth already in progress, ignoring request")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isEmailAuthInProgress = true
        
        // Create email auth operation
        let operation = EmailAuthOperation(
            type: type,
            email: email,
            startTime: Date()
        )
        currentEmailOperation = operation
    }
    
    /// Completes the current email authentication operation
    private func completeEmailAuthOperation() {
        print("[UserManager] Completing email auth operation")
        
        // Cancel fallback timer
        fallbackTimer?.invalidate()
        fallbackTimer = nil
        
        // Clear operation state
        currentEmailOperation = nil
        isEmailAuthInProgress = false
    }
    
    /// Handles email authentication operation failure
    private func handleEmailAuthFailure(error: Error, operation: EmailAuthOperation) {
        print("[UserManager] Email auth failed for \(operation.type): \(error.localizedDescription)")
        
        // Clean up operation
        completeEmailAuthOperation()
        
        // Set error message
        let typeString = operation.type == .signIn ? "Sign In" : "Sign Up"
        errorMessage = "\(typeString) failed: \(error.localizedDescription)"
        isLoading = false
    }
    
    /// Cancels ongoing email authentication operation
    func cancelEmailAuthOperation() {
        print("[UserManager] Cancelling email auth operation")
        
        // Cancel fallback timer
        fallbackTimer?.invalidate()
        fallbackTimer = nil
        
        // Clear operation state
        currentEmailOperation = nil
        isEmailAuthInProgress = false
        
        // Reset loading state
        isLoading = false
        errorMessage = nil
    }
    
    // MARK: - Retry Logic
    
    /// Attempts to retry the last failed operation
    func retryLastOperation() {
        guard let lastOperation = retryableOperations.last else {
            print("[UserManager] No retryable operation available")
            return
        }
        
        print("[UserManager] Retrying operation: \(lastOperation.description)")
        
        // Reset retry count for manual retry
        currentRetryCount = 0
        
        // Execute the operation
        executeOperation(lastOperation)
    }
    
    /// Attempts automatic retry of the current operation
    private func attemptAutoRetry(for operation: AuthOperationType) {
        guard currentRetryCount < maxRetryAttempts else {
            print("[UserManager] Max retry attempts reached for \(operation.description)")
            handleMaxRetriesReached(for: operation)
            return
        }
        
        currentRetryCount += 1
        print("[UserManager] Auto-retry attempt \(currentRetryCount)/\(maxRetryAttempts) for \(operation.description)")
        
        // Add delay before retry (exponential backoff)
        let delay = TimeInterval(pow(2.0, Double(currentRetryCount - 1))) // 1s, 2s, 4s
        
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.executeOperation(operation)
        }
    }
    
    /// Executes a specific authentication operation
    private func executeOperation(_ operation: AuthOperationType) {
        print("[UserManager] Executing operation: \(operation.description)")
        
        switch operation {
        case .oAuth(let provider):
            executeOAuthOperation(provider: provider)
        case .emailSignIn(let email, let password):
            executeEmailSignIn(email: email, password: password)
        case .emailSignUp(let email, let password):
            executeEmailSignUp(email: email, password: password)
        case .sessionValidation:
            executeSessionValidation()
        case .userDataFetch:
            executeUserDataFetch()
        @unknown default:
            print("[UserManager] Unknown operation type: \(operation)")
        }
    }
    
    /// Executes OAuth operation with retry logic
    private func executeOAuthOperation(provider: Provider) {
        // Prevent multiple OAuth operations
        guard !isOAuthInProgress else {
            print("[UserManager] OAuth already in progress, ignoring retry")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isOAuthInProgress = true
        
        // Create OAuth operation
        let operation = OAuthOperation(
            provider: provider,
            startTime: Date(),
            fallbackTimer: nil
        )
        currentOAuthOperation = operation
        
        Task {
            do {
                print("[UserManager] Retrying \(provider) OAuth flow")
                try await supabase.auth.signInWithOAuth(
                    provider: provider,
                    redirectTo: URL(string: SupabaseConfig.redirectURL)
                )
                print("[UserManager] \(provider) OAuth flow retry successful")
                
                await MainActor.run {
                    self.startFallbackTimer(for: operation)
                }
                
            } catch {
                print("[UserManager] \(provider) OAuth retry failed: \(error)")
                await MainActor.run {
                    self.handleOAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    /// Executes email sign-in with retry logic
    private func executeEmailSignIn(email: String, password: String) {
        // Prevent multiple email auth operations
        guard !isEmailAuthInProgress else {
            print("[UserManager] Email auth already in progress, ignoring retry")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isEmailAuthInProgress = true
        
        // Create email auth operation
        let operation = EmailAuthOperation(
            type: .signIn,
            email: email,
            startTime: Date()
        )
        currentEmailOperation = operation
        
        Task {
            do {
                let session = try await supabase.auth.signIn(email: email, password: password)
                await MainActor.run {
                    self.authToken = session.accessToken
                    self.isAuthenticated = true
                    self.userEmail = session.user.email
                    self.isLoading = false
                    self.fetchUserData()
                    self.completeEmailAuthOperation()
                    self.clearRetryState()
                }
            } catch {
                await MainActor.run {
                    self.handleEmailAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    /// Executes email sign-up with retry logic
    private func executeEmailSignUp(email: String, password: String) {
        // Prevent multiple email auth operations
        guard !isEmailAuthInProgress else {
            print("[UserManager] Email auth already in progress, ignoring retry")
            return
        }
        
        isLoading = true
        errorMessage = nil
        isEmailAuthInProgress = true
        
        // Create email auth operation
        let operation = EmailAuthOperation(
            type: .signUp,
            email: email,
            startTime: Date()
        )
        currentEmailOperation = operation
        
        Task {
            do {
                let authResponse = try await supabase.auth.signUp(email: email, password: password)
                
                await MainActor.run {
                    if let session = authResponse.session {
                        self.authToken = session.accessToken
                        self.isAuthenticated = true
                        self.userEmail = authResponse.user.email
                        self.isLoading = false
                        self.completeEmailAuthOperation()
                        self.clearRetryState()
                    } else {
                        self.handleEmailAuthFailureWithRetry(
                            error: NSError(domain: "UserManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No session returned"]),
                            operation: operation
                        )
                    }
                }
            } catch {
                await MainActor.run {
                    self.handleEmailAuthFailureWithRetry(error: error, operation: operation)
                }
            }
        }
    }
    
    /// Executes session validation with retry logic
    private func executeSessionValidation() {
        Task {
            do {
                let session = try await supabase.auth.session
                await MainActor.run {
                    self.authToken = session.accessToken
                    self.isAuthenticated = true
                    self.clearRetryState()
                    
                    // IMPORTANT: After validating session, fetch the user profile
                    // This completes the authentication flow
                    print("[UserManager] Session validated, now fetching user profile")
                    self.fetchUserData()
                }
            } catch {
                await MainActor.run {
                    self.handleSessionValidationFailureWithRetry(error: error)
                }
            }
        }
    }
    
    /// Executes user data fetch with retry logic
    private func executeUserDataFetch() {
        print("[UserManager] executeUserDataFetch called")
        
        // Use the main fetchUserData method for consistency
        fetchUserData()
    }
    
    /// Handles OAuth failure with retry logic
    private func handleOAuthFailureWithRetry(error: Error, operation: OAuthOperation) {
        print("[UserManager] OAuth failed for \(operation.provider): \(error.localizedDescription)")
        
        // Store operation for potential retry
        let authOperation = AuthOperationType.oAuth(provider: operation.provider)
        storeRetryableOperation(authOperation)
        
        // Check if we should retry
        if shouldRetryOperation(error: error) {
            attemptAutoRetry(for: authOperation)
        } else {
            // Final failure, clean up
            completeOAuthOperation()
            handleFinalFailure(error: error, operation: authOperation)
        }
    }
    
    /// Handles email auth failure with retry logic
    private func handleEmailAuthFailureWithRetry(error: Error, operation: EmailAuthOperation) {
        print("[UserManager] Email auth failed for \(operation.type): \(error.localizedDescription)")
        
        // Store operation for potential retry
        let authOperation: AuthOperationType
        switch operation.type {
        case .signIn:
            authOperation = .emailSignIn(email: operation.email, password: "") // Password not stored for security
        case .signUp:
            authOperation = .emailSignUp(email: operation.email, password: "") // Password not stored for security
        @unknown default:
            authOperation = .emailSignIn(email: operation.email, password: "") // Default fallback
        }
        storeRetryableOperation(authOperation)
        
        // Check if we should retry
        if shouldRetryOperation(error: error) {
            attemptAutoRetry(for: authOperation)
        } else {
            // Final failure, clean up
            completeEmailAuthOperation()
            handleFinalFailure(error: error, operation: authOperation)
        }
    }
    
    /// Handles session validation failure with retry logic
    private func handleSessionValidationFailureWithRetry(error: Error) {
        print("[UserManager] Session validation failed: \(error.localizedDescription)")
        
        let authOperation = AuthOperationType.sessionValidation
        storeRetryableOperation(authOperation)
        
        if shouldRetryOperation(error: error) {
            attemptAutoRetry(for: authOperation)
        } else {
            handleFinalFailure(error: error, operation: authOperation)
        }
    }
    
    /// Handles user data fetch failure with retry logic
    private func handleUserDataFetchFailureWithRetry(error: Error) {
        print("[UserManager] User data fetch failed: \(error.localizedDescription)")
        
        let authOperation = AuthOperationType.userDataFetch
        storeRetryableOperation(authOperation)
        
        if shouldRetryOperation(error: error) {
            attemptAutoRetry(for: authOperation)
        } else {
            self.isLoading = false
            handleFinalFailure(error: error, operation: authOperation)
        }
    }
    
    /// Determines if an operation should be retried based on the error
    private func shouldRetryOperation(error: Error) -> Bool {
        // Retry on network errors, server errors, but not on authentication errors
        let nsError = error as NSError
        
        // Retry on network-related errors
        if nsError.domain == NSURLErrorDomain {
            return true
        }
        
        // Retry on server errors (5xx)
        if let httpResponse = nsError.userInfo["_response"] as? HTTPURLResponse {
            return (500...599).contains(httpResponse.statusCode)
        }
        
        // Don't retry on authentication errors (4xx)
        if let httpResponse = nsError.userInfo["_response"] as? HTTPURLResponse {
            return !(400...499).contains(httpResponse.statusCode)
        }
        
        // Default to retrying
        return true
    }
    
    /// Stores an operation for potential retry
    private func storeRetryableOperation(_ operation: AuthOperationType) {
        // Remove any existing operations of the same type
        retryableOperations.removeAll { existingOperation in
            switch (existingOperation, operation) {
            case (.oAuth, .oAuth), (.emailSignIn, .emailSignIn), (.emailSignUp, .emailSignUp),
                 (.sessionValidation, .sessionValidation), (.userDataFetch, .userDataFetch):
                return true
            default:
                return false
            }
        }
        
        retryableOperations.append(operation)
        lastError = lastError ?? NSError(domain: "UserManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unknown error"])
    }
    
    /// Handles when max retries are reached
    private func handleMaxRetriesReached(for operation: AuthOperationType) {
        print("[UserManager] Max retries reached for \(operation.description)")
        
        // Clean up operation state
        completeOAuthOperation()
        completeEmailAuthOperation()
        
        // Set final error message
        errorMessage = "\(operation.description) failed after \(maxRetryAttempts) attempts. Please try again later."
        isLoading = false
        
        // Clear retry state
        clearRetryState()
    }
    
    /// Handles final failure after all retries
    private func handleFinalFailure(error: Error, operation: AuthOperationType) {
        print("[UserManager] Final failure for \(operation.description): \(error.localizedDescription)")
        
        // Set error message
        let operationName = operation.description
        errorMessage = "\(operationName) failed: \(error.localizedDescription)"
        isLoading = false
        
        // Clear retry state
        clearRetryState()
    }
    
    /// Clears retry state
    private func clearRetryState() {
        currentRetryCount = 0
        lastError = nil
        retryableOperations.removeAll()
    }
    
    /// Gets current retry information for UI
    var retryInfo: (canRetry: Bool, retryCount: Int, maxRetries: Int) {
        return (
            canRetry: !retryableOperations.isEmpty && currentRetryCount < maxRetryAttempts,
            retryCount: currentRetryCount,
            maxRetries: maxRetryAttempts
        )
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
    
    // MARK: - Cleanup Methods
    
    /// Manually cleanup resources when needed
    func cleanup() {
        // Clear any pending async operations
        isLoading = false
        errorMessage = nil
        
        // Cancel any ongoing OAuth operations
        cancelOAuthOperation()
        
        // Cancel any ongoing email auth operations
        cancelEmailAuthOperation()
        
        // Clear retry state
        clearRetryState()
        
        // Remove notification observers
        NotificationCenter.default.removeObserver(self)
        
        print("[UserManager] Cleanup completed")
    }
    
    // MARK: - Business Logic Validation Methods
    
    /// Checks if user is ready for plan generation (has auth and profile)
    func isReadyForPlanGeneration() -> Bool {
        return authToken != nil && userProfile != nil
    }
    
    /// Checks if user is in a valid state for onboarding
    func isReadyForOnboarding() -> Bool {
        return authToken != nil && userProfile == nil
    }
    
    /// Checks if user has completed all prerequisites
    func hasCompletedPrerequisites() -> Bool {
        return authToken != nil && userProfile != nil && !isLoading
    }
    
    /// Gets the user's primary goal safely
    func getUserPrimaryGoal() -> String? {
        return userProfile?.primaryGoal
    }
    
    /// Validates if the current user state supports the requested operation
    func canPerformOperation(_ operation: UserOperation) -> Bool {
        switch operation {
        case .generatePlan:
            return isReadyForPlanGeneration()
        case .onboarding:
            return isReadyForOnboarding()
        case .fetchData:
            return hasCompletedPrerequisites()
        @unknown default:
            return false
        }
    }
    
    deinit {
        print("[DEINIT] UserManager deinitialized: \(Unmanaged.passUnretained(self).toOpaque())")
        // Ensure cleanup is performed
        cleanup()
    }
}

// MARK: - User Operations Enum
enum UserOperation {
    case generatePlan
    case onboarding
    case fetchData
}

// MARK: - Authentication Operation Types
enum AuthOperationType {
    case oAuth(provider: Provider)
    case emailSignIn(email: String, password: String)
    case emailSignUp(email: String, password: String)
    case sessionValidation
    case userDataFetch
    
    var description: String {
        switch self {
        case .oAuth(let provider):
            switch provider {
            case .google: return "Google OAuth"
            case .facebook: return "Facebook OAuth"
            case .apple: return "Apple OAuth"
            @unknown default: return "OAuth"
            }
        case .emailSignIn: return "Email Sign In"
        case .emailSignUp: return "Email Sign Up"
        case .sessionValidation: return "Session Validation"
        case .userDataFetch: return "User Data Fetch"
        }
    }
}

// MARK: - OAuth Operation Models

/// Represents an ongoing OAuth operation
struct OAuthOperation {
    let provider: Provider
    let startTime: Date
    let fallbackTimer: Timer?
}

/// Represents an ongoing email authentication operation
struct EmailAuthOperation {
    let type: EmailAuthOperation.EmailAuthType
    let email: String
    let startTime: Date
    
    enum EmailAuthType {
        case signIn
        case signUp
    }
}