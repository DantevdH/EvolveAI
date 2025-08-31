# Supabase Setup Guide for EvolveAI

This guide explains how to set up Supabase authentication for the EvolveAI iOS app.

## Overview

The app now uses **Supabase-only authentication** (no Django backend needed). This provides:
- Email/password authentication
- Social login (Google, Facebook, Apple)
- User profile management
- Row Level Security (RLS)
- Automatic user profile creation

## 1. Supabase Project Setup

### Create a new Supabase project:
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `evolveai`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users

### Get your project credentials:
1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 2. Database Schema Setup

### Run the SQL schema:
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase_schema.sql`
3. Click **Run** to execute the schema

This creates:
- `user_profiles` table with all user data
- Row Level Security policies
- Automatic profile creation on signup
- Updated timestamp triggers

## 3. Authentication Configuration

### Enable Email Authentication:
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates if needed

### Enable Google Authentication:
1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

### Enable Facebook Authentication:
1. Go to **Authentication** → **Providers**
2. Enable **Facebook** provider
3. Add your Facebook OAuth credentials:
   - **Client ID**: From Facebook Developer Console
   - **Client Secret**: From Facebook Developer Console

### Enable Apple Authentication:
1. Go to **Authentication** → **Providers**
2. Enable **Apple** provider
3. Add your Apple OAuth credentials:
   - **Client ID**: From Apple Developer Console
   - **Client Secret**: From Apple Developer Console

## 4. iOS App Configuration

### Update Config.plist:
The `Config.plist` file should contain:
```xml
<key>SUPABASE_URL</key>
<string>https://your-project-id.supabase.co</string>
<key>SUPABASE_ANON_KEY</key>
<string>your-anon-key-here</string>
```

### Update Info.plist:
Add the necessary URL schemes and OAuth configurations for social login.

## 5. Testing

### Test Email Authentication:
1. Run the app
2. Try signing up with email/password
3. Verify user profile is created automatically
4. Test sign in with the same credentials

### Test Social Authentication:
1. Configure social providers in Supabase
2. Test each social login method
3. Verify user profiles are created

## 6. Security Features

### Row Level Security (RLS):
- Users can only access their own data
- Automatic profile creation on signup
- Secure token-based authentication

### Environment Variables:
Store sensitive data in environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

## 7. Troubleshooting

### Common Issues:

**"SUPABASE_URL not found in Config.plist"**
- Ensure `Config.plist` is in the correct location
- Check that the file is included in the app bundle

**"Authentication failed"**
- Verify Supabase project URL and anon key
- Check that email provider is enabled
- Ensure database schema is properly set up

**"User profile not found"**
- Run the SQL schema to create the `user_profiles` table
- Check that RLS policies are in place
- Verify the trigger for automatic profile creation

## 8. Next Steps

### Implement Social Login:
1. Add Google Sign-In SDK
2. Add Facebook Login SDK
3. Add Apple Sign-In
4. Update `UserManager` to handle social tokens

### Add More Features:
1. Password reset functionality
2. Email verification
3. Profile image upload
4. Workout plan storage
5. Nutrition tracking

## Benefits of Supabase-Only Approach

✅ **Simpler Architecture**: No Django backend needed
✅ **Built-in Authentication**: Email, social, and magic link auth
✅ **Real-time Features**: Built-in subscriptions and real-time updates
✅ **Row Level Security**: Automatic data protection
✅ **Scalable**: Handles millions of users
✅ **Cost Effective**: Generous free tier
✅ **Type Safety**: Full TypeScript/JavaScript support
✅ **Database**: PostgreSQL with full SQL capabilities

## Migration from Django

If you're migrating from Django:
1. Export user data from Django
2. Import into Supabase using the SQL schema
3. Update iOS app to use new UserManager
4. Test all authentication flows
5. Remove Django backend dependencies 