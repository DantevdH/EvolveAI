import XCTest
import Foundation
@testable import EvolveAI

class UserManagerSupabaseTests: XCTestCase {
    
    var userManager: UserManager!
    var mockNetworkService: MockNetworkService!
    var mockSupabaseManager: MockSupabaseManager!
    
    override func setUp() {
        super.setUp()
        mockNetworkService = MockNetworkService()
        mockSupabaseManager = MockSupabaseManager()
        userManager = UserManager(
            networkService: mockNetworkService,
            supabaseManager: mockSupabaseManager
        )
    }
    
    override func tearDown() {
        userManager = nil
        mockNetworkService = nil
        mockSupabaseManager = nil
        super.tearDown()
    }
    
    // MARK: - Email Authentication Tests
    
    func testSignInWithEmailSuccess() {
        let expectation = XCTestExpectation(description: "Email sign-in success")
        
        // Mock successful Supabase authentication
        mockSupabaseManager.mockAuthResult = AuthResult(
            accessToken: "supabase-token",
            refreshToken: "refresh-token",
            user: createMockSupabaseUser()
        )
        
        // Mock successful Django token exchange
        mockNetworkService.mockDjangoToken = "django-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.signInWithEmail(email: "test@example.com", password: "password")
        
        // Wait for async operations
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.userManager.isAuthenticated)
            XCTAssertNotNil(self.userManager.authToken)
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testSignInWithEmailFailure() {
        let expectation = XCTestExpectation(description: "Email sign-in failure")
        
        // Mock Supabase authentication failure
        mockSupabaseManager.shouldSucceed = false
        mockSupabaseManager.mockError = NSError(domain: "AuthError", code: 401, userInfo: nil)
        
        userManager.signInWithEmail(email: "invalid@example.com", password: "wrong")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.userManager.isAuthenticated)
            XCTAssertNil(self.userManager.authToken)
            XCTAssertNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            XCTAssertNotNil(self.userManager.networkErrorMessage)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testSignUpWithEmailSuccess() {
        let expectation = XCTestExpectation(description: "Email sign-up success")
        
        // Mock successful Supabase sign-up
        mockSupabaseManager.mockAuthResult = AuthResult(
            accessToken: "supabase-token",
            refreshToken: "refresh-token",
            user: createMockSupabaseUser()
        )
        
        // Mock successful Django token exchange
        mockNetworkService.mockDjangoToken = "django-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.signUpWithEmail(email: "new@example.com", password: "password")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.userManager.isAuthenticated)
            XCTAssertNotNil(self.userManager.authToken)
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Social Authentication Tests
    
    func testSignInWithGoogleSuccess() {
        let expectation = XCTestExpectation(description: "Google sign-in success")
        
        // Mock successful Google authentication
        mockSupabaseManager.mockAuthResult = AuthResult(
            accessToken: "supabase-token",
            refreshToken: "refresh-token",
            user: createMockSupabaseUser()
        )
        
        // Mock successful Django token exchange
        mockNetworkService.mockDjangoToken = "django-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.signInWithGoogle()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.userManager.isAuthenticated)
            XCTAssertNotNil(self.userManager.authToken)
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testSignInWithFacebookSuccess() {
        let expectation = XCTestExpectation(description: "Facebook sign-in success")
        
        // Mock successful Facebook authentication
        mockSupabaseManager.mockAuthResult = AuthResult(
            accessToken: "supabase-token",
            refreshToken: "refresh-token",
            user: createMockSupabaseUser()
        )
        
        // Mock successful Django token exchange
        mockNetworkService.mockDjangoToken = "django-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.signInWithFacebook()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.userManager.isAuthenticated)
            XCTAssertNotNil(self.userManager.authToken)
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testSignInWithAppleSuccess() {
        let expectation = XCTestExpectation(description: "Apple sign-in success")
        
        // Mock successful Apple authentication
        mockSupabaseManager.mockAuthResult = AuthResult(
            accessToken: "supabase-token",
            refreshToken: "refresh-token",
            user: createMockSupabaseUser()
        )
        
        // Mock successful Django token exchange
        mockNetworkService.mockDjangoToken = "django-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.signInWithApple()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.userManager.isAuthenticated)
            XCTAssertNotNil(self.userManager.authToken)
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Token Exchange Tests
    
    func testExchangeSupabaseTokenForDjangoTokenSuccess() {
        let expectation = XCTestExpectation(description: "Token exchange success")
        
        // Mock successful Django token exchange
        mockNetworkService.mockDjangoToken = "django-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.exchangeSupabaseTokenForDjangoToken("supabase-token")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(self.userManager.authToken, "django-token")
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testExchangeSupabaseTokenForDjangoTokenFailure() {
        let expectation = XCTestExpectation(description: "Token exchange failure")
        
        // Mock Django token exchange failure
        mockNetworkService.shouldSucceed = false
        mockNetworkService.mockError = NSError(domain: "NetworkError", code: 500, userInfo: nil)
        
        userManager.exchangeSupabaseTokenForDjangoToken("supabase-token")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertNil(self.userManager.authToken)
            XCTAssertNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            XCTAssertNotNil(self.userManager.networkErrorMessage)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Authentication State Tests
    
    func testCheckAuthenticationStateWithToken() {
        let expectation = XCTestExpectation(description: "Check auth state with token")
        
        // Set up user with token
        userManager.authToken = "existing-token"
        mockNetworkService.mockUserProfile = createMockUserProfile()
        
        userManager.checkAuthenticationState()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertTrue(self.userManager.isAuthenticated)
            XCTAssertNotNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testCheckAuthenticationStateWithoutToken() {
        let expectation = XCTestExpectation(description: "Check auth state without token")
        
        // No token set
        userManager.authToken = nil
        
        userManager.checkAuthenticationState()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.userManager.isAuthenticated)
            XCTAssertNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testCheckAuthenticationStateWithInvalidToken() {
        let expectation = XCTestExpectation(description: "Check auth state with invalid token")
        
        // Set up user with invalid token
        userManager.authToken = "invalid-token"
        mockNetworkService.shouldSucceed = false
        mockNetworkService.mockError = NSError(domain: "AuthError", code: 401, userInfo: nil)
        
        userManager.checkAuthenticationState()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertFalse(self.userManager.isAuthenticated)
            XCTAssertNil(self.userManager.authToken)
            XCTAssertNil(self.userManager.userProfile)
            XCTAssertFalse(self.userManager.isLoading)
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Helper Methods
    
    private func createMockSupabaseUser() -> SupabaseUser {
        return SupabaseUser(
            id: "test-user-id",
            email: "test@example.com",
            phone: nil,
            appMetadata: SupabaseUser.AppMetadata(
                provider: "email",
                providers: ["email"]
            ),
            userMetadata: SupabaseUser.UserMetadata(
                email: "test@example.com",
                emailVerified: true,
                phoneVerified: false,
                sub: "test-user-id",
                name: "Test User",
                picture: nil
            ),
            aud: "authenticated",
            createdAt: "2025-01-01T00:00:00Z"
        )
    }
    
    private func createMockUserProfile() -> UserProfile {
        return UserProfile(
            username: "Test User",
            primaryGoal: "Strength",
            primaryGoalDescription: "Build strength",
            experienceLevel: "Intermediate",
            daysPerWeek: 3,
            minutesPerSession: 60,
            equipment: "Full Gym",
            age: 25,
            weight: 70.0,
            weightUnit: "kg",
            height: 175,
            heightUnit: "cm",
            gender: "Male",
            hasLimitations: false,
            limitationsDescription: "",
            finalChatNotes: "Ready to start"
        )
    }
}

// MARK: - Mock Supabase Manager

class MockSupabaseManager: SupabaseManagerProtocol {
    var shouldSucceed = true
    var mockAuthResult: AuthResult?
    var mockError: Error?
    
    func signInWithEmail(email: String, password: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        if shouldSucceed {
            let mockUser = SupabaseUser(
                id: "test-id",
                email: email,
                phone: nil,
                appMetadata: SupabaseUser.AppMetadata(provider: "email", providers: ["email"]),
                userMetadata: SupabaseUser.UserMetadata(
                    email: email,
                    emailVerified: true,
                    phoneVerified: false,
                    sub: "test-id",
                    name: "Test User",
                    picture: nil
                ),
                aud: "authenticated",
                createdAt: "2025-01-01T00:00:00Z"
            )
            
            let authResult = AuthResult(
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token",
                user: mockUser
            )
            completion(.success(authResult))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 401, userInfo: nil)))
        }
    }
    
    func signUpWithEmail(email: String, password: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        signInWithEmail(email: email, password: password, completion: completion)
    }
    
    func signInWithGoogle(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        if shouldSucceed {
            completion(.success(mockAuthResult ?? AuthResult(
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token",
                user: SupabaseUser(
                    id: "test-id",
                    email: "test@example.com",
                    phone: nil,
                    appMetadata: SupabaseUser.AppMetadata(provider: "google", providers: ["google"]),
                    userMetadata: SupabaseUser.UserMetadata(
                        email: "test@example.com",
                        emailVerified: true,
                        phoneVerified: false,
                        sub: "test-id",
                        name: "Test User",
                        picture: nil
                    ),
                    aud: "authenticated",
                    createdAt: "2025-01-01T00:00:00Z"
                )
            )))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 401, userInfo: nil)))
        }
    }
    
    func signInWithFacebook(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        if shouldSucceed {
            completion(.success(mockAuthResult ?? AuthResult(
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token",
                user: SupabaseUser(
                    id: "test-id",
                    email: "test@example.com",
                    phone: nil,
                    appMetadata: SupabaseUser.AppMetadata(provider: "facebook", providers: ["facebook"]),
                    userMetadata: SupabaseUser.UserMetadata(
                        email: "test@example.com",
                        emailVerified: true,
                        phoneVerified: false,
                        sub: "test-id",
                        name: "Test User",
                        picture: nil
                    ),
                    aud: "authenticated",
                    createdAt: "2025-01-01T00:00:00Z"
                )
            )))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 401, userInfo: nil)))
        }
    }
    
    func signInWithApple(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        if shouldSucceed {
            completion(.success(mockAuthResult ?? AuthResult(
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token",
                user: SupabaseUser(
                    id: "test-id",
                    email: "test@example.com",
                    phone: nil,
                    appMetadata: SupabaseUser.AppMetadata(provider: "apple", providers: ["apple"]),
                    userMetadata: SupabaseUser.UserMetadata(
                        email: "test@example.com",
                        emailVerified: true,
                        phoneVerified: false,
                        sub: "test-id",
                        name: "Test User",
                        picture: nil
                    ),
                    aud: "authenticated",
                    createdAt: "2025-01-01T00:00:00Z"
                )
            )))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 401, userInfo: nil)))
        }
    }
    
    func signOut(completion: @escaping (Result<Void, Error>) -> Void) {
        if shouldSucceed {
            completion(.success(()))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 500, userInfo: nil)))
        }
    }
    
    func getCurrentUser() -> SupabaseUser? {
        return mockAuthResult?.user
    }
    
    func getAccessToken() -> String? {
        return mockAuthResult?.accessToken
    }
}

// MARK: - Extended Mock Network Service

extension MockNetworkService {
    var mockDjangoToken: String?
    var mockUserProfile: UserProfile?
    
    func exchangeSupabaseTokenForDjangoToken(_ supabaseToken: String, completion: @escaping (Result<String, Error>) -> Void) {
        if shouldSucceed {
            completion(.success(mockDjangoToken ?? "mock-django-token"))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 500, userInfo: nil)))
        }
    }
    
    func getUserProfile(authToken: String, completion: @escaping (Result<UserProfile, Error>) -> Void) {
        if shouldSucceed {
            completion(.success(mockUserProfile ?? UserProfile(
                username: "Test User",
                primaryGoal: "Strength",
                primaryGoalDescription: "Build strength",
                experienceLevel: "Intermediate",
                daysPerWeek: 3,
                minutesPerSession: 60,
                equipment: "Full Gym",
                age: 25,
                weight: 70.0,
                weightUnit: "kg",
                height: 175,
                heightUnit: "cm",
                gender: "Male",
                hasLimitations: false,
                limitationsDescription: "",
                finalChatNotes: "Ready to start"
            )))
        } else {
            completion(.failure(mockError ?? NSError(domain: "MockError", code: 404, userInfo: nil)))
        }
    }
} 