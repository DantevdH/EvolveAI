# Supabase Authentication Setup

## Configuration Required

### 1. Supabase Project Setup
1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from the project settings
3. Update `Config.plist` with your actual Supabase credentials:
   - Replace `https://your-project.supabase.co` with your actual Supabase URL
   - Replace `your-anon-key-here` with your actual anon key

### 2. Google Sign-In Setup
1. Configure Google Sign-In in your Supabase project:
   - Go to Authentication > Providers > Google
   - Enable Google provider
   - Add your Google OAuth credentials (Client ID and Client Secret)

2. Configure Google Sign-In in your iOS app:
   - Add your Google Client ID to your iOS app's URL schemes
   - Configure GoogleSignIn in your app delegate

### 3. Facebook Sign-In Setup
1. Configure Facebook Login in your Supabase project:
   - Go to Authentication > Providers > Facebook
   - Enable Facebook provider
   - Add your Facebook App credentials

2. Configure Facebook Login in your iOS app:
   - Add your Facebook App ID to Info.plist
   - Configure FBSDKLoginKit in your app delegate

### 4. Backend Configuration
The backend is already configured to handle social authentication tokens. The current implementation uses placeholder email generation for development. In production, you should:

1. Verify Google ID tokens with Google's API
2. Verify Facebook access tokens with Facebook's API
3. Extract real user information from the verified tokens

## Current Implementation Status

✅ **Frontend**: Google and Facebook sign-in buttons implemented
✅ **Backend**: Social authentication endpoints configured
✅ **Token Exchange**: Supabase tokens exchanged for Django tokens
⚠️ **Token Verification**: Currently using placeholder verification (needs production implementation)

## Testing

The authentication flow works as follows:
1. User taps Google/Facebook sign-in button
2. Frontend gets token from respective provider
3. Frontend sends token to Django backend (`/api/users/auth/social/`)
4. Backend creates/gets user and returns Django token
5. Frontend uses Django token for all subsequent API calls