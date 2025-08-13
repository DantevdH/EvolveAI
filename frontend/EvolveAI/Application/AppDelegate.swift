import SwiftUI
import FBSDKLoginKit
import Supabase

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
        return true
    }
    
    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        
        print("AppDelegate received URL: \(url.absoluteString)")
        print("URL scheme: \(url.scheme ?? "nil")")
        print("URL host: \(url.host ?? "nil")")
        
        // Handle Supabase OAuth callbacks (using your app scheme)
        if url.scheme == "com.evolveai.app" && url.host == "oauth" {
            print("Handling Supabase OAuth callback")
            Task {
                do {
                    let session = try await supabase.auth.session(from: url)
                    print("Supabase OAuth successful: \(session.user.email ?? "unknown")")
                    
                    // Post notification for UserManager to handle
                    await MainActor.run {
                        print("Posting supabaseOAuthSuccess notification")
                        NotificationCenter.default.post(
                            name: .supabaseOAuthSuccess,
                            object: session
                        )
                    }
                } catch {
                    print("Supabase OAuth error: \(error)")
                    await MainActor.run {
                        print("Posting supabaseOAuthError notification")
                        NotificationCenter.default.post(
                            name: .supabaseOAuthError,
                            object: error
                        )
                    }
                }
            }
            return true
        }
        
        // Handle Facebook Login callbacks
        if url.scheme?.hasPrefix("fb") == true {
            return ApplicationDelegate.shared.application(app, open: url, options: options)
        }
        
        // Handle Google Sign-In callbacks
        if url.scheme?.contains("googleusercontent") == true {
            // If you're using Google Sign-In SDK directly, handle it here
            // For now, we'll let Supabase handle Google OAuth through the main scheme
            return true
        }
        
        // Default: try Facebook handler for any remaining URLs
        return ApplicationDelegate.shared.application(app, open: url, options: options)
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let supabaseOAuthSuccess = Notification.Name("supabaseOAuthSuccess")
    static let supabaseOAuthError = Notification.Name("supabaseOAuthError")
}