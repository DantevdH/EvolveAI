import XCTest
import Foundation
@testable import EvolveAI

class SupabaseManagerTests: XCTestCase {
    
    var supabaseManager: SupabaseManager!
    var mockNetworkService: MockNetworkService!
    
    override func setUp() {
        super.setUp()
        supabaseManager = SupabaseManager.shared
        mockNetworkService = MockNetworkService()
    }
    
    override func tearDown() {
        supabaseManager = nil
        mockNetworkService = nil
        super.tearDown()
    }
    
    // MARK: - Configuration Tests
    
    func testSupabaseConfigValues() {
        // Test that configuration values are set
        XCTAssertFalse(SupabaseConfig.url.isEmpty)
        XCTAssertFalse(SupabaseConfig.anonKey.isEmpty)
    }
    
    // MARK: - Token Management Tests
    
    func testStoreAndRetrieveTokens() {
        let testAccessToken = "test-access-token"
        let testRefreshToken = "test-refresh-token"
        
        // Store tokens
        supabaseManager.storeTokens(accessToken: testAccessToken, refreshToken: testRefreshToken)
        
        // Verify tokens are stored
        XCTAssertEqual(supabaseManager.getAccessToken(), testAccessToken)
        XCTAssertTrue(supabaseManager.isAuthenticated)
    }
    
    func testClearTokens() {
        // First store some tokens
        supabaseManager.storeTokens(accessToken: "test-token", refreshToken: "test-refresh")
        
        // Clear tokens
        supabaseManager.clearTokens()
        
        // Verify tokens are cleared
        XCTAssertNil(supabaseManager.getAccessToken())
        XCTAssertFalse(supabaseManager.isAuthenticated)
        XCTAssertNil(supabaseManager.getCurrentUser())
    }
    
    // MARK: - Email Authentication Tests
    
    func testSignInWithEmailSuccess() {
        let expectation = XCTestExpectation(description: "Email sign-in success")
        
        supabaseManager.signInWithEmail(email: "test@example.com", password: "password") { result in
            switch result {
            case .success(let authResult):
                XCTAssertNotNil(authResult.accessToken)
                XCTAssertNotNil(authResult.user)
                XCTAssertEqual(authResult.user.email, "test@example.com")
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Email sign-in failed: \(error)")
            }
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    func testSignInWithEmailFailure() {
        let expectation = XCTestExpectation(description: "Email sign-in failure")
        
        supabaseManager.signInWithEmail(email: "invalid@example.com", password: "wrong") { result in
            switch result {
            case .success:
                XCTFail("Should have failed with invalid credentials")
            case .failure:
                expectation.fulfill()
            }
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    func testSignUpWithEmailSuccess() {
        let expectation = XCTestExpectation(description: "Email sign-up success")
        
        supabaseManager.signUpWithEmail(email: "new@example.com", password: "password") { result in
            switch result {
            case .success(let authResult):
                XCTAssertNotNil(authResult.accessToken)
                XCTAssertNotNil(authResult.user)
                XCTAssertEqual(authResult.user.email, "new@example.com")
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Email sign-up failed: \(error)")
            }
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Social Authentication Tests
    
    func testSignInWithGoogle() {
        let expectation = XCTestExpectation(description: "Google sign-in")
        
        supabaseManager.signInWithGoogle { result in
            // This will likely fail in tests since we can't mock Google Sign-In easily
            // But we can test that the method doesn't crash
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    func testSignInWithFacebook() {
        let expectation = XCTestExpectation(description: "Facebook sign-in")
        
        supabaseManager.signInWithFacebook { result in
            // This will likely fail in tests since we can't mock Facebook Login easily
            // But we can test that the method doesn't crash
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    func testSignInWithApple() {
        let expectation = XCTestExpectation(description: "Apple sign-in")
        
        supabaseManager.signInWithApple { result in
            // This will likely fail in tests since we can't mock Apple Sign-In easily
            // But we can test that the method doesn't crash
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Sign Out Tests
    
    func testSignOut() {
        let expectation = XCTestExpectation(description: "Sign out")
        
        // First sign in
        supabaseManager.storeTokens(accessToken: "test-token", refreshToken: "test-refresh")
        
        // Then sign out
        supabaseManager.signOut { result in
            switch result {
            case .success:
                XCTAssertNil(self.supabaseManager.getAccessToken())
                XCTAssertFalse(self.supabaseManager.isAuthenticated)
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Sign out failed: \(error)")
            }
        }
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - User Management Tests
    
    func testGetCurrentUser() {
        // Initially should be nil
        XCTAssertNil(supabaseManager.getCurrentUser())
        
        // After storing tokens, should have user
        let mockUser = createMockSupabaseUser()
        supabaseManager.currentUser = mockUser
        supabaseManager.isAuthenticated = true
        
        let currentUser = supabaseManager.getCurrentUser()
        XCTAssertNotNil(currentUser)
        XCTAssertEqual(currentUser?.email, "test@example.com")
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
}

// MARK: - Mock Network Service

class MockNetworkService: NetworkServiceProtocol {
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
        completion(.failure(NSError(domain: "MockError", code: 501, userInfo: [NSLocalizedDescriptionKey: "Not implemented in tests"])))
    }
    
    func signInWithFacebook(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        completion(.failure(NSError(domain: "MockError", code: 501, userInfo: [NSLocalizedDescriptionKey: "Not implemented in tests"])))
    }
    
    func signInWithApple(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        completion(.failure(NSError(domain: "MockError", code: 501, userInfo: [NSLocalizedDescriptionKey: "Not implemented in tests"])))
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

// MARK: - AuthResult Tests

class AuthResultTests: XCTestCase {
    
    func testAuthResultInitialization() {
        let mockUser = SupabaseUser(
            id: "test-id",
            email: "test@example.com",
            phone: nil,
            appMetadata: SupabaseUser.AppMetadata(provider: "email", providers: ["email"]),
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
        
        let authResult = AuthResult(
            accessToken: "test-access-token",
            refreshToken: "test-refresh-token",
            user: mockUser
        )
        
        XCTAssertEqual(authResult.accessToken, "test-access-token")
        XCTAssertEqual(authResult.refreshToken, "test-refresh-token")
        XCTAssertEqual(authResult.user.id, "test-id")
        XCTAssertEqual(authResult.user.email, "test@example.com")
    }
}

// MARK: - SupabaseUser Tests

class SupabaseUserTests: XCTestCase {
    
    func testSupabaseUserInitialization() {
        let user = SupabaseUser(
            id: "test-id",
            email: "test@example.com",
            phone: "+1234567890",
            appMetadata: SupabaseUser.AppMetadata(
                provider: "google",
                providers: ["google", "email"]
            ),
            userMetadata: SupabaseUser.UserMetadata(
                email: "test@example.com",
                emailVerified: true,
                phoneVerified: true,
                sub: "test-id",
                name: "Test User",
                picture: "https://example.com/avatar.jpg"
            ),
            aud: "authenticated",
            createdAt: "2025-01-01T00:00:00Z"
        )
        
        XCTAssertEqual(user.id, "test-id")
        XCTAssertEqual(user.email, "test@example.com")
        XCTAssertEqual(user.phone, "+1234567890")
        XCTAssertEqual(user.appMetadata.provider, "google")
        XCTAssertEqual(user.userMetadata.name, "Test User")
        XCTAssertEqual(user.aud, "authenticated")
        XCTAssertEqual(user.createdAt, "2025-01-01T00:00:00Z")
    }
    
    func testSupabaseUserWithNilValues() {
        let user = SupabaseUser(
            id: "test-id",
            email: nil,
            phone: nil,
            appMetadata: SupabaseUser.AppMetadata(provider: nil, providers: nil),
            userMetadata: SupabaseUser.UserMetadata(
                email: nil,
                emailVerified: nil,
                phoneVerified: nil,
                sub: nil,
                name: nil,
                picture: nil
            ),
            aud: "authenticated",
            createdAt: "2025-01-01T00:00:00Z"
        )
        
        XCTAssertEqual(user.id, "test-id")
        XCTAssertNil(user.email)
        XCTAssertNil(user.phone)
        XCTAssertNil(user.appMetadata.provider)
        XCTAssertNil(user.userMetadata.name)
    }
} 