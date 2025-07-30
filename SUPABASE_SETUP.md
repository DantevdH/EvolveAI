# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication for your EvolveAI app with support for email, Google, Facebook, and Apple Sign-In.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `evolveai-auth`
   - Database Password: (generate a strong password) trainwithai
   - Region: Choose closest to your users
5. Click "Create new project"

## 2. Configure Authentication Providers

### Email Authentication
Email authentication is enabled by default in Supabase.

### Google Sign-In
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID for iOS
7. Copy the Client ID and Client Secret
8. In Supabase Dashboard → Authentication → Providers → Google
9. Enable Google provider
10. Enter Client ID and Client Secret
11. Add your redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### Facebook Sign-In
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth settings
5. Copy App ID and App Secret
6. In Supabase Dashboard → Authentication → Providers → Facebook
7. Enable Facebook provider
8. Enter App ID and App Secret
9. Add your redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### Apple Sign-In
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create a new App ID
3. Enable Sign In with Apple capability
4. Create a Service ID
5. Configure Sign In with Apple
6. Generate a private key
7. In Supabase Dashboard → Authentication → Providers → Apple
8. Enable Apple provider
9. Enter your Apple configuration details

## 3. Get Supabase Configuration

In your Supabase Dashboard:
1. Go to Settings → API
2. Copy the following values:
   - Project URL
   - Anon (public) key
   - Service role key (keep this secret!)
   - JWT secret

## 4. Configure Environment Variables

### Backend (.env file)
```bash
# Existing variables
django_secret=your_django_secret
openai_api=your_openai_key

# New Supabase variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

### Frontend (iOS Configuration)
Run the iOS configuration setup script:

```bash
./setup_ios_config.sh
```

This will:
- Create `frontend/EvolveAI/Resources/Config.plist` from template
- Optionally copy values from your backend `.env` file
- The file is gitignored for security

**Manual Configuration (if needed):**
1. Copy the template:
```bash
cp frontend/EvolveAI/Resources/Config.plist.template frontend/EvolveAI/Resources/Config.plist
```

2. Edit `frontend/EvolveAI/Resources/Config.plist`:
```xml
<key>SUPABASE_URL</key>
<string>https://your-project.supabase.co</string>
<key>SUPABASE_ANON_KEY</key>
<string>your-anon-key-here</string>
```

## 5. Install Dependencies

### Backend
```bash
cd backend
poetry install
```

**Note**: If you don't have Poetry installed, install it first:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### Frontend
Add these to your Xcode project dependencies:

#### Using Swift Package Manager:
1. In Xcode: File → Add Package Dependencies
2. Add these packages:
   - GoogleSignIn: `https://github.com/google/GoogleSignIn-iOS`
   - FacebookLogin: `https://github.com/facebook/facebook-ios-sdk`

#### Using CocoaPods (if preferred):
Add to your `Podfile`:
```ruby
pod 'GoogleSignIn'
pod 'FBSDKLoginKit'
```

## 6. Configure iOS App

### Info.plist Configuration
Add these to your `Info.plist`:

```xml
<!-- Google Sign-In -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>GoogleSignIn</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
        </array>
    </dict>
</array>

<!-- Facebook Login -->
<key>FacebookAppID</key>
<string>YOUR_FACEBOOK_APP_ID</string>
<key>FacebookClientToken</key>
<string>YOUR_FACEBOOK_CLIENT_TOKEN</string>
<key>FacebookDisplayName</key>
<string>EvolveAI</string>
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>FacebookLogin</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>fbYOUR_FACEBOOK_APP_ID</string>
        </array>
    </dict>
</array>

<!-- Apple Sign-In -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>AppleSignIn</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>YOUR_APPLE_SERVICE_ID</string>
        </array>
    </dict>
</array>
```

### App Delegate Configuration
In your `AppDelegate.swift` or `EvolveAIApp.swift`:

```swift
import GoogleSignIn
import FBSDKCoreKit

// In your app initialization
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    
    // Configure Google Sign-In
    GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: "com.googleusercontent.apps.41234641985-0f67mmmc4nph7eivf3t8ebgmtsmvp4t2")
    
    // Configure Facebook Login
    FBSDKCoreKit.ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
    
    return true
}

// Handle URL schemes
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    
    // Handle Google Sign-In
    if GIDSignIn.sharedInstance.handle(url) {
        return true
    }
    
    // Handle Facebook Login
    if FBSDKCoreKit.ApplicationDelegate.shared.application(app, open: url, options: options) {
        return true
    }
    
    return false
}
```

## 7. Test the Integration

### Backend Testing
```bash
cd backend
python manage.py runserver
```

Test the endpoints:
```bash
# Test Supabase auth callback
curl -X POST http://localhost:8000/api/users/auth/supabase/ \
  -H "Content-Type: application/json" \
  -d '{"access_token": "test_token"}'

# Test social auth
curl -X POST http://localhost:8000/api/users/auth/social/ \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "access_token": "test_token"}'
```

### Frontend Testing
1. Build and run your iOS app
2. Test each authentication method:
   - Email sign-in/sign-up
   - Google Sign-In
   - Facebook Login
   - Apple Sign-In

## 8. Security Considerations

1. **Never expose your service role key** in frontend code
2. **Use environment variables** for all sensitive configuration
3. **Enable Row Level Security (RLS)** in Supabase
4. **Configure proper redirect URLs** for each provider
5. **Set up proper CORS** settings in Supabase
6. **Use HTTPS** in production

## 9. Production Deployment

### Environment Variables
Make sure all environment variables are properly set in your production environment.

### Supabase Settings
1. Disable email confirmations if not needed
2. Configure proper redirect URLs for production
3. Set up proper CORS origins
4. Enable Row Level Security policies

### iOS App Store
1. Configure App Store Connect with proper app capabilities
2. Set up proper URL schemes for production
3. Test all authentication flows in TestFlight

## 10. Troubleshooting

### Common Issues

1. **"Invalid redirect URL"**
   - Check your redirect URLs in Supabase dashboard
   - Ensure they match exactly (including protocol)

2. **"Invalid client ID"**
   - Verify your OAuth client IDs are correct
   - Check that the app is properly configured in the provider's dashboard

3. **"Token exchange failed"**
   - Verify your JWT secret is correct
   - Check that the Supabase configuration is properly set

4. **"Network error"**
   - Check your internet connection
   - Verify Supabase project is active
   - Check CORS settings

### Debug Mode
Enable debug logging in your app to see detailed authentication flow:

```swift
// In SupabaseManager
print("Supabase auth flow: \(step)")
```

## 11. Next Steps

After successful authentication setup:

1. **User Profile Management**: Extend the user profile system
2. **Password Reset**: Implement password reset functionality
3. **Email Verification**: Add email verification if needed
4. **Multi-factor Authentication**: Add MFA for enhanced security
5. **Analytics**: Track authentication events
6. **Error Handling**: Improve error messages and recovery flows

## Support

If you encounter issues:
1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
3. Check the provider-specific documentation (Google, Facebook, Apple)
4. Review the logs in your Supabase dashboard 