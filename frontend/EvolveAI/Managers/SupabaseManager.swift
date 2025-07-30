import Foundation
import AuthenticationServices
import GoogleSignIn
import FBSDKLoginKit

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
}

// MARK: - Authentication Providers
enum AuthProvider: String, CaseIterable {
    case email = "email"
    case google = "google"
    case facebook = "facebook"
    case apple = "apple"
}

// MARK: - Authentication Result
struct AuthResult {
    let accessToken: String
    let refreshToken: String?
    let user: SupabaseUser
}

// MARK: - Supabase User
struct SupabaseUser: Codable {
    let id: String
    let email: String?
    let phone: String?
    let appMetadata: AppMetadata
    let userMetadata: UserMetadata
    let aud: String
    let createdAt: String
    
    struct AppMetadata: Codable {
        let provider: String?
        let providers: [String]?
    }
    
    struct UserMetadata: Codable {
        let email: String?
        let emailVerified: Bool?
        let phoneVerified: Bool?
        let sub: String?
        let name: String?
        let picture: String?
    }
}

// MARK: - Supabase Manager Protocol
protocol SupabaseManagerProtocol: AnyObject {
    func signInWithEmail(email: String, password: String, completion: @escaping (Result<AuthResult, Error>) -> Void)
    func signUpWithEmail(email: String, password: String, completion: @escaping (Result<AuthResult, Error>) -> Void)
    func signInWithGoogle(completion: @escaping (Result<AuthResult, Error>) -> Void)
    func signInWithFacebook(completion: @escaping (Result<AuthResult, Error>) -> Void)
    func signInWithApple(completion: @escaping (Result<AuthResult, Error>) -> Void)
    func signOut(completion: @escaping (Result<Void, Error>) -> Void)
    func getCurrentUser() -> SupabaseUser?
    func getAccessToken() -> String?
}

// MARK: - Supabase Manager
class SupabaseManager: NSObject, ObservableObject, SupabaseManagerProtocol {
    static let shared = SupabaseManager()
    
    @Published var currentUser: SupabaseUser?
    @Published var isAuthenticated = false
    
    private var accessToken: String?
    private var refreshToken: String?
    
    private override init() {
        super.init()
        loadStoredTokens()
    }
    
    // MARK: - Token Management
    private func loadStoredTokens() {
        accessToken = UserDefaults.standard.string(forKey: "supabase_access_token")
        refreshToken = UserDefaults.standard.string(forKey: "supabase_refresh_token")
        
        if let token = accessToken {
            // Validate token and get current user
            validateToken(token)
        }
    }
    
    private func storeTokens(accessToken: String, refreshToken: String?) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        
        UserDefaults.standard.set(accessToken, forKey: "supabase_access_token")
        if let refreshToken = refreshToken {
            UserDefaults.standard.set(refreshToken, forKey: "supabase_refresh_token")
        }
    }
    
    private func clearTokens() {
        accessToken = nil
        refreshToken = nil
        currentUser = nil
        isAuthenticated = false
        
        UserDefaults.standard.removeObject(forKey: "supabase_access_token")
        UserDefaults.standard.removeObject(forKey: "supabase_refresh_token")
    }
    
    // MARK: - Email Authentication
    func signInWithEmail(email: String, password: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        let url = URL(string: "\(SupabaseConfig.url)/auth/v1/token?grant_type=password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        
        let body = [
            "email": email,
            "password": password
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                    return
                }
                
                do {
                    let authResponse = try JSONDecoder().decode(SupabaseAuthResponse.self, from: data)
                    let result = AuthResult(
                        accessToken: authResponse.accessToken,
                        refreshToken: authResponse.refreshToken,
                        user: authResponse.user
                    )
                    
                    self?.storeTokens(accessToken: authResponse.accessToken, refreshToken: authResponse.refreshToken)
                    self?.currentUser = authResponse.user
                    self?.isAuthenticated = true
                    
                    completion(.success(result))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    func signUpWithEmail(email: String, password: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        let url = URL(string: "\(SupabaseConfig.url)/auth/v1/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        
        let body = [
            "email": email,
            "password": password
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                    return
                }
                
                do {
                    let authResponse = try JSONDecoder().decode(SupabaseAuthResponse.self, from: data)
                    let result = AuthResult(
                        accessToken: authResponse.accessToken,
                        refreshToken: authResponse.refreshToken,
                        user: authResponse.user
                    )
                    
                    self?.storeTokens(accessToken: authResponse.accessToken, refreshToken: authResponse.refreshToken)
                    self?.currentUser = authResponse.user
                    self?.isAuthenticated = true
                    
                    completion(.success(result))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    // MARK: - Google Sign-In
    func signInWithGoogle(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        guard let presentingViewController = UIApplication.shared.windows.first?.rootViewController else {
            completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller"])))
            return
        }
        
        GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { [weak self] result, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else {
                completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to get Google ID token"])))
                return
            }
            
            // Exchange Google token for Supabase token
            self?.exchangeGoogleToken(idToken, completion: completion)
        }
    }
    
    private func exchangeGoogleToken(_ idToken: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        // Use Django backend endpoint for social authentication
        let url = URL(string: "http://127.0.0.1:8000/api/users/auth/social/")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "provider": "google",
            "access_token": idToken
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                    return
                }
                
                do {
                    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    guard let djangoToken = json?["token"] as? String else {
                        completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to get Django token"])))
                        return
                    }
                    
                    // Create a mock AuthResult since we're using Django tokens
                    let mockUser = SupabaseUser(
                        id: json?["user_id"] as? String ?? "",
                        email: json?["email"] as? String,
                        phone: nil,
                        appMetadata: SupabaseUser.AppMetadata(provider: "google", providers: ["google"]),
                        userMetadata: SupabaseUser.UserMetadata(
                            email: json?["email"] as? String,
                            emailVerified: true,
                            phoneVerified: false,
                            sub: json?["user_id"] as? String,
                            name: nil,
                            picture: nil
                        ),
                        aud: "authenticated",
                        createdAt: ""
                    )
                    
                    let result = AuthResult(
                        accessToken: djangoToken,
                        refreshToken: nil,
                        user: mockUser
                    )
                    
                    self?.storeTokens(accessToken: djangoToken, refreshToken: nil)
                    self?.currentUser = mockUser
                    self?.isAuthenticated = true
                    
                    completion(.success(result))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    // MARK: - Facebook Sign-In
    func signInWithFacebook(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        let loginManager = LoginManager()
        loginManager.logIn(permissions: ["email", "public_profile"], from: nil) { [weak self] result, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let result = result, !result.isCancelled,
                  let accessToken = result.token?.tokenString else {
                completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook login cancelled or failed"])))
                return
            }
            
            // Exchange Facebook token for Supabase token
            self?.exchangeFacebookToken(accessToken, completion: completion)
        }
    }
    
    private func exchangeFacebookToken(_ accessToken: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        // Use Django backend endpoint for social authentication
        let url = URL(string: "http://127.0.0.1:8000/api/users/auth/social/")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "provider": "facebook",
            "access_token": accessToken
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                    return
                }
                
                do {
                    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    guard let djangoToken = json?["token"] as? String else {
                        completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to get Django token"])))
                        return
                    }
                    
                    // Create a mock AuthResult since we're using Django tokens
                    let mockUser = SupabaseUser(
                        id: json?["user_id"] as? String ?? "",
                        email: json?["email"] as? String,
                        phone: nil,
                        appMetadata: SupabaseUser.AppMetadata(provider: "facebook", providers: ["facebook"]),
                        userMetadata: SupabaseUser.UserMetadata(
                            email: json?["email"] as? String,
                            emailVerified: true,
                            phoneVerified: false,
                            sub: json?["user_id"] as? String,
                            name: nil,
                            picture: nil
                        ),
                        aud: "authenticated",
                        createdAt: ""
                    )
                    
                    let result = AuthResult(
                        accessToken: djangoToken,
                        refreshToken: nil,
                        user: mockUser
                    )
                    
                    self?.storeTokens(accessToken: djangoToken, refreshToken: nil)
                    self?.currentUser = mockUser
                    self?.isAuthenticated = true
                    
                    completion(.success(result))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    // MARK: - Apple Sign-In
    func signInWithApple(completion: @escaping (Result<AuthResult, Error>) -> Void) {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        
        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
        
        // Store completion handler for delegate
        appleSignInCompletion = completion
    }
    
    private var appleSignInCompletion: ((Result<AuthResult, Error>) -> Void)?
    
    private func exchangeAppleToken(_ idToken: String, completion: @escaping (Result<AuthResult, Error>) -> Void) {
        let url = URL(string: "\(SupabaseConfig.url)/auth/v1/token?grant_type=id_token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        
        let body = [
            "provider": "apple",
            "id_token": idToken
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(NSError(domain: "Supabase", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                    return
                }
                
                do {
                    let authResponse = try JSONDecoder().decode(SupabaseAuthResponse.self, from: data)
                    let result = AuthResult(
                        accessToken: authResponse.accessToken,
                        refreshToken: authResponse.refreshToken,
                        user: authResponse.user
                    )
                    
                    self?.storeTokens(accessToken: authResponse.accessToken, refreshToken: authResponse.refreshToken)
                    self?.currentUser = authResponse.user
                    self?.isAuthenticated = true
                    
                    completion(.success(result))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    // MARK: - Sign Out
    func signOut(completion: @escaping (Result<Void, Error>) -> Void) {
        let url = URL(string: "\(SupabaseConfig.url)/auth/v1/logout")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        
        if let accessToken = accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.clearTokens()
                
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        }.resume()
    }
    
    // MARK: - Token Validation
    private func validateToken(_ token: String) {
        let url = URL(string: "\(SupabaseConfig.url)/auth/v1/user")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let data = data,
                   let user = try? JSONDecoder().decode(SupabaseUser.self, from: data) {
                    self?.currentUser = user
                    self?.isAuthenticated = true
                } else {
                    self?.clearTokens()
                }
            }
        }.resume()
    }
    
    // MARK: - Public Interface
    func getCurrentUser() -> SupabaseUser? {
        return currentUser
    }
    
    func getAccessToken() -> String? {
        return accessToken
    }
}

// MARK: - Apple Sign-In Extensions
extension SupabaseManager: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first!
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
           let identityToken = appleIDCredential.identityToken,
           let idTokenString = String(data: identityToken, encoding: .utf8) {
            
            exchangeAppleToken(idTokenString) { [weak self] result in
                DispatchQueue.main.async {
                    self?.appleSignInCompletion?(result)
                    self?.appleSignInCompletion = nil
                }
            }
        }
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.appleSignInCompletion?(.failure(error))
            self?.appleSignInCompletion = nil
        }
    }
}

// MARK: - Supabase Auth Response
struct SupabaseAuthResponse: Codable {
    let accessToken: String
    let refreshToken: String?
    let user: SupabaseUser
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
} 
