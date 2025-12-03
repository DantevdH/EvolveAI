# Production Deployment - Final Checklist

**Status**: Pre-Production | Last Updated: 2025-01-27

This document consolidates all critical items needed to deploy EvolveAI to production. Complete all 🔴 items before deploying to production.

---

## 🚀 TestFlight Deployment - Step by Step Guide

Follow these steps to deploy your app to TestFlight (Apple's beta testing platform):

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program
   - Wait for approval (usually 24-48 hours)

2. **App Store Connect Setup**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Sign in with your Apple Developer account
   - Create a new app:
     - Click "+" → "New App"
     - Select your organization/team
     - Choose "iOS" platform
     - **Bundle ID**: `com.evolveai.app` (must match `app.json`)
     - **App Name**: `Evolve`
     - **Primary Language**: English (or your preference)
     - **SKU**: `evolveai-ios` (unique identifier, can be anything)
     - **User Access**: Full Access (or App Manager if you have a team)

### Step 1: Configure App Information

1. **Update `app.json`** (if not already done):
   ```json
   {
     "expo": {
       "name": "EvolveAI",
       "slug": "evolveai",
       "version": "1.0.0",
       "ios": {
         "bundleIdentifier": "com.evolveai.app"
       }
     }
   }
   ```

2. **Verify app icon and splash screen**:
   - Icon: `./assets/images/evolve-logo.png` (1024x1024px required for App Store)
   - Splash screen configured in `app.json`

### Step 2: Configure EAS Build

1. **Install EAS CLI** (if not already installed):
   ```bash
   cd frontend
   npm install -g eas-cli
   ```

2. **Login to EAS**:
   ```bash
   eas login
   ```
   (Use your Expo account - create one at expo.dev if needed)

3. **Link your project** (if not already done):
   ```bash
   eas build:configure
   ```
   This creates/updates `eas.json` with build profiles.

4. **Verify `eas.json` has production profile**:
   ```json
   {
     "build": {
       "production": {
         "ios": {
           "simulator": false,
           "distribution": "store"
         }
       }
     }
   }
   ```

### Step 3: Set Production Environment Variables

1. **Create production `.env` or use EAS Secrets**:
   ```bash
   # Set secrets in EAS (recommended for production)
   eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value https://your-production-backend.onrender.com
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your_production_supabase_url
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_production_anon_key
   ```

   Or set them in `eas.json` build profile:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_BACKEND_URL": "https://your-production-backend.onrender.com",
           "EXPO_PUBLIC_SUPABASE_URL": "your_production_supabase_url",
           "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your_production_anon_key"
         }
       }
     }
   }
   ```

### Step 4: Build for TestFlight

1. **Build iOS app for App Store**:
   ```bash
   cd frontend
   eas build --platform ios --profile production
   ```

2. **During build, you'll be prompted**:
   - **"Do you want to log in to your Apple account?"** → Answer `Y`
   - Enter your Apple Developer account email
   - Enter your Apple ID password (or app-specific password if 2FA enabled)
   - EAS will automatically manage certificates and provisioning profiles

3. **Wait for build to complete** (10-30 minutes):
   - Build runs in the cloud
   - You'll get a notification when done
   - Check status: `eas build:list`

### Step 5: Submit to TestFlight

1. **After build completes, submit to App Store Connect**:
   ```bash
   eas submit --platform ios --latest
   ```

   Or manually:
   - Go to [expo.dev](https://expo.dev) → Your project → Builds
   - Click on the completed iOS build
   - Click "Submit to App Store"
   - Follow the prompts

2. **In App Store Connect**:
   - Go to your app → TestFlight tab
   - Wait for processing (can take 10-60 minutes)
   - Once processed, you'll see the build under "iOS Builds"

### Step 6: Configure TestFlight

1. **Add Test Information** (optional but recommended):
   - Go to TestFlight → Test Information
   - Add "What to Test" notes
   - Add feedback email

2. **Add Internal Testers**:
   - Go to TestFlight → Internal Testing
   - Add your Apple ID email (you can test immediately)
   - Internal testers can test immediately after build is processed

3. **Add External Testers** (optional):
   - Go to TestFlight → External Testing
   - Create a new group
   - Add tester emails (up to 10,000)
   - Select the build
   - Submit for Beta App Review (can take 24-48 hours)

### Step 7: Install TestFlight App

1. **On your iPhone**:
   - Install "TestFlight" app from App Store (if not already installed)
   - Open TestFlight app
   - Sign in with your Apple ID
   - Accept invitation (if external tester) or find your app (if internal tester)
   - Tap "Install" next to EvolveAI

2. **Test your app**:
   - Open the app from your home screen
   - Test all critical flows
   - Report any issues via TestFlight feedback

### Troubleshooting

**Build fails with certificate error:**
- EAS manages certificates automatically, but if issues occur:
  ```bash
  eas credentials
  ```
  - Select iOS → Production → Manage credentials
  - Let EAS regenerate certificates if needed

**Build fails with "No Apple account":**
- Make sure you answered `Y` to Apple login prompt
- Or configure Apple credentials manually:
  ```bash
  eas credentials
  ```

**App doesn't appear in TestFlight:**
- Wait for processing (can take up to 60 minutes)
- Check App Store Connect → Activity for any errors
- Verify bundle ID matches exactly: `com.evolveai.app`

**Environment variables not working:**
- Verify secrets are set: `eas secret:list`
- Or check `eas.json` has env vars in production profile
- Rebuild after setting secrets

### Next Steps After TestFlight

Once TestFlight testing is successful:
1. Fix any critical bugs found during testing
2. Prepare App Store listing (screenshots, description, privacy policy)
3. Submit for App Store Review
4. See "Mobile App Deployment" section below for full App Store release

---

## 🔴 CRITICAL - Environment Configuration

### Backend Environment Variables
- [x ] **Set production backend URL** - Update `.env` file (or production environment):
  - `EXPO_PUBLIC_BACKEND_URL` - Your hosted backend URL (e.g., `https://api.evolveai.com`)
- [ x] **Set backend environment** - `backend/.env` or production environment:
  - `ENVIRONMENT=production` - Must be set to "production" for security checks
  - `CORS_ALLOWED_ORIGINS` - Set to your production frontend domains (mobile apps may need special handling)
- [x] **Configure all backend secrets** - `backend/.env` or production secret management:
  - `LLM_API_KEY` - Your LLM provider API key
  - `SUPABASE_URL` - Production Supabase project URL
  - `SUPABASE_ANON_KEY` - Production Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Production Supabase service role key
  - `SUPABASE_JWT_SECRET` - JWT secret for token verification
  - `SUPABASE_JWT_PUBLIC_KEY` - JWT public key (if using asymmetric signing)
- [x] **Verify CORS configuration** - `backend/main.py:79` - Ensure `CORS_ALLOWED_ORIGINS` is set correctly (not `*` in production)

### Frontend Environment Variables
- [x] **Set frontend environment variables** - `.env` file (lines 37-41) or build configuration:
  - `EXPO_PUBLIC_BACKEND_URL` - Production backend URL (must match your hosted backend)
  - `EXPO_PUBLIC_SUPABASE_URL` - Production Supabase project URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Production Supabase anonymous key
- [x] **Fix hardcoded backend URL** - `frontend/src/constants/index.ts:5-7` - ✅ FIXED: Now uses `EXPO_PUBLIC_BACKEND_URL` environment variable
- [x] **Verify environment variable usage** - All API calls should use `EXPO_PUBLIC_BACKEND_URL`:
  - `frontend/src/constants/api.ts:7` - ✅ Already uses env var
  - `frontend/src/services/onboardingService.ts:14` - ✅ Already uses env var
  - `frontend/src/services/apiClient.ts:28` - ✅ Uses API_CONFIG from api.ts (correct)

---

## 🔴 CRITICAL - Code Configuration

- [x] **Remove hardcoded production URLs** - `frontend/src/constants/index.ts:7` - ✅ FIXED: Now uses environment variable with fallback
- [x] **Verify backend production mode** - `backend/main.py:83` - Backend checks `ENVIRONMENT=production` for security warnings
- [x] **Test environment variable loading** - `frontend/app.config.js` - Verify `.env` file is loaded correctly in production builds
- [x] **Configure app.json/app.config.js** - Verify bundle identifiers, app names, icons, and splash screens are production-ready

---

## 🔴 CRITICAL - Security

- [x] **Verify HTTPS/SSL** - Backend must use HTTPS in production
- [x] **Verify CORS restrictions** - `backend/main.py:79-93` - CORS must not allow `*` in production
- [x] **Verify JWT validation** - `backend/core/training/helpers/database_service.py:17-139` - ✅ JWT signature verification is enabled with `verify_signature: True`, supports ES256/RS256/HS256, verifies expiration
- [x] **Verify no sensitive data in errors** - `backend/main.py:51-74` - ✅ Error responses sanitized: truncates body preview to 200 chars, removes 'input' field, doesn't expose full request body
- [x] **Verify secrets are not committed** - ✅ `.env` files are in `.gitignore` (line 177) and never committed
- [x] **Set up secure secret management** - Use AWS Secrets Manager, Google Secret Manager, or similar for production secrets

---

## 🔴 CRITICAL - Database & Infrastructure

- [x] **Verify production database connection** - Test Supabase connection from production backend
- [x] **Run database migrations** - Ensure all migrations are applied to production database
- [x] **Verify database backups** - Ensure automated backups are configured
- [x] **Test database operations** - Verify save, retrieve, and update operations work correctly

---

## 🔴 CRITICAL - Testing

- [x] **Run backend smoke tests** - `backend/tests/test_smoke.py` - Verify health check, API connectivity, database connection
- [x] **Test critical API endpoints** - Verify all endpoints work with production configuration:
  - `/api/trainingplan/initial-questions`
  - `/api/trainingplan/generate/`
  - `/api/trainingplan/feedback/`
  - `/api/trainingplan/playbook/{user_id}`
- [x] **Test authentication flow** - Verify JWT authentication works end-to-end
- [x] **Test from production frontend** - Build production frontend and test against production backend
- [x] **Verify error handling** - Test error scenarios don't expose sensitive data

---

## 🟡 IMPORTANT - Before Public Release

### Monitoring & Logging
- [ ] **Set up error tracking** - Configure Sentry, Bugsnag, or similar for frontend and backend
- [ ] **Configure production logging** - `backend/logging_config.py` - Set appropriate log levels (INFO for prod)
- [ ] **Set up monitoring** - Configure health check monitoring and alerting
- [ ] **Verify log aggregation** - Ensure logs are accessible and searchable

### Performance & Reliability
- [ ] **Add rate limiting** - `backend/main.py` - Implement rate limiting middleware
- [ ] **Verify request timeouts** - `backend/main.py:99` - REQUEST_TIMEOUT is set appropriately (default: 300s)
- [ ] **Test under load** - Perform basic load testing to verify performance
- [ ] **Verify connection pooling** - Check Supabase client connection limits

### Mobile App Deployment
- [ ] **Configure App Store Connect** - Set up Apple App Store account, certificates, provisioning profiles
- [ ] **Configure Google Play Console** - Set up Google Play account, signing keys
- [ ] **Prepare app store assets** - Icons, screenshots, descriptions, privacy policy
- [ ] **Configure deep linking** - Update OAuth redirect URLs in Supabase for production
- [ ] **Test OAuth flows** - Verify Google/Apple OAuth works with production URLs
- [ ] **Build production apps** - Create production builds using EAS Build or similar
- [ ] **Test production builds** - Install and test production builds on real devices

### Documentation
- [ ] **Document deployment process** - Create runbook for deploying updates
- [ ] **Document environment variables** - List all required environment variables and their purposes
- [ ] **Create troubleshooting guide** - Document common issues and solutions

---

## 🟢 NICE TO HAVE - Post-Launch

- [ ] **Add APM integration** - Application performance monitoring (Sentry, Datadog)
- [ ] **Add distributed tracing** - Implement request flow tracing
- [ ] **Add caching layer** - Redis caching for frequently accessed data
- [ ] **Add circuit breaker pattern** - For LLM API calls
- [ ] **Add API versioning** - `/api/v1/` prefix for future compatibility
- [ ] **Add metrics endpoint** - `/metrics` for monitoring tools
- [ ] **Load testing** - Comprehensive load testing infrastructure

---

## 📋 Quick Reference

### Environment Variables Checklist

**Backend (.env or production secrets):**
```bash
ENVIRONMENT=production
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
LLM_API_KEY=your_production_key
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
SUPABASE_JWT_SECRET=your_production_jwt_secret
SUPABASE_JWT_PUBLIC_KEY=your_production_jwt_public_key
DEBUG=false
HOST=0.0.0.0
PORT=8000
REQUEST_TIMEOUT=300
```

**Frontend (.env or build configuration):**
```bash
EXPO_PUBLIC_BACKEND_URL=https://your-production-backend.com
EXPO_PUBLIC_SUPABASE_URL=your_production_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
```

### Key Files to Verify

**Backend:**
- `backend/main.py` - CORS, environment checks, middleware
- `backend/settings.py` - Environment variable validation
- `backend/.env` or production secrets - All environment variables

**Frontend:**
- `frontend/src/constants/api.ts` - API configuration (uses env var ✅)
- `frontend/src/constants/index.ts` - API configuration (now uses env var ✅)
- `frontend/app.config.js` - Environment variable loading
- `.env` - Frontend environment variables (lines 37-41)

### Deployment Steps

1. **Backend Deployment:**
   - Set all backend environment variables in production
   - Set `ENVIRONMENT=production`
   - Configure `CORS_ALLOWED_ORIGINS` with production domains
   - Deploy backend to hosting platform (AWS, Google Cloud, etc.)
   - Verify backend is accessible via HTTPS
   - Run smoke tests against production backend

2. **Frontend Build:**
   - Set `EXPO_PUBLIC_BACKEND_URL` to production backend URL
   - Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Build production app using EAS Build or similar
   - Test production build against production backend

3. **App Store Submission:**
   - Configure App Store Connect / Google Play Console
   - Upload production builds
   - Submit for review

### Testing Commands

```bash
# Backend smoke tests
cd backend && pytest tests/test_smoke.py -v

# Backend critical endpoints
cd backend && pytest tests/test_critical_endpoints.py -v

# Backend JWT authentication
cd backend && pytest tests/test_jwt_auth.py -v

# Frontend tests
cd frontend && npm test
```

### Related Documentation

- [Backend Production Readiness](./01_BACKEND.md)
- [Frontend Authentication](./02_FRONTEND_AUTHENTICATION.md)
- [Frontend Onboarding](./03_FRONTEND_ONBOARDING.md)
- [Plan Generation](./04_PLAN_GENERATION.md)
- [Frontend Training](./05_FRONTEND_TRAINING.md)
- [Frontend Insights](./06_FRONTEND_INSIGHTS.md)
- [Frontend Profile](./07_FRONTEND_PROFILE.md)
- [Frontend Chat](./08_FRONTEND_CHAT.md)

---

## ⚠️ Important Notes

1. **Environment Variables**: Just updating `.env` is NOT sufficient. You must also:
   - Fix hardcoded URLs in code (✅ Done: `constants/index.ts`)
   - Set environment variables in your build/deployment system
   - Verify environment variables are loaded correctly in production builds

2. **Mobile Apps**: The frontend is a React Native/Expo app that will be distributed through App Store/Play Store, not hosted like a web app. The backend needs to be hosted separately.

3. **CORS for Mobile Apps**: Mobile apps don't use CORS the same way web apps do. You may need to adjust CORS settings or use a different approach for mobile app authentication.

4. **Secrets Management**: Never commit `.env` files. Use secure secret management services in production.

5. **Testing**: Always test production builds against production backend before releasing to users.

