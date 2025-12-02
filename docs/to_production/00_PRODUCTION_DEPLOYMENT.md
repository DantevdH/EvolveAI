# Production Deployment - Final Checklist

**Status**: Pre-Production | Last Updated: 2025-01-27

This document consolidates all critical items needed to deploy EvolveAI to production. Complete all 🔴 items before deploying to production.

---

## 🔴 CRITICAL - Environment Configuration

### Backend Environment Variables
- [ ] **Set production backend URL** - Update `.env` file (or production environment):
  - `EXPO_PUBLIC_BACKEND_URL` - Your hosted backend URL (e.g., `https://api.evolveai.com`)
- [ ] **Set backend environment** - `backend/.env` or production environment:
  - `ENVIRONMENT=production` - Must be set to "production" for security checks
  - `CORS_ALLOWED_ORIGINS` - Set to your production frontend domains (mobile apps may need special handling)
- [ ] **Configure all backend secrets** - `backend/.env` or production secret management:
  - `LLM_API_KEY` - Your LLM provider API key
  - `SUPABASE_URL` - Production Supabase project URL
  - `SUPABASE_ANON_KEY` - Production Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Production Supabase service role key
  - `SUPABASE_JWT_SECRET` - JWT secret for token verification
  - `SUPABASE_JWT_PUBLIC_KEY` - JWT public key (if using asymmetric signing)
- [ ] **Verify CORS configuration** - `backend/main.py:79` - Ensure `CORS_ALLOWED_ORIGINS` is set correctly (not `*` in production)

### Frontend Environment Variables
- [ ] **Set frontend environment variables** - `.env` file (lines 37-41) or build configuration:
  - `EXPO_PUBLIC_BACKEND_URL` - Production backend URL (must match your hosted backend)
  - `EXPO_PUBLIC_SUPABASE_URL` - Production Supabase project URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Production Supabase anonymous key
- [ ] **Fix hardcoded backend URL** - `frontend/src/constants/index.ts:5-7` - ✅ FIXED: Now uses `EXPO_PUBLIC_BACKEND_URL` environment variable
- [ ] **Verify environment variable usage** - All API calls should use `EXPO_PUBLIC_BACKEND_URL`:
  - `frontend/src/constants/api.ts:7` - ✅ Already uses env var
  - `frontend/src/services/onboardingService.ts:14` - ✅ Already uses env var
  - `frontend/src/services/apiClient.ts:28` - ✅ Uses API_CONFIG from api.ts (correct)

---

## 🔴 CRITICAL - Code Configuration

- [ ] **Remove hardcoded production URLs** - `frontend/src/constants/index.ts:7` - ✅ FIXED: Now uses environment variable with fallback
- [ ] **Verify backend production mode** - `backend/main.py:83` - Backend checks `ENVIRONMENT=production` for security warnings
- [ ] **Test environment variable loading** - `frontend/app.config.js` - Verify `.env` file is loaded correctly in production builds
- [ ] **Configure app.json/app.config.js** - Verify bundle identifiers, app names, icons, and splash screens are production-ready

---

## 🔴 CRITICAL - Security

- [ ] **Verify HTTPS/SSL** - Backend must use HTTPS in production
- [ ] **Verify CORS restrictions** - `backend/main.py:79-93` - CORS must not allow `*` in production
- [ ] **Verify JWT validation** - `backend/core/training/training_api.py:174-214` - JWT signature verification is enabled
- [ ] **Verify no sensitive data in errors** - `backend/main.py:51-74` - Error responses don't expose sensitive data
- [ ] **Verify secrets are not committed** - Ensure `.env` files are in `.gitignore` and never committed
- [ ] **Set up secure secret management** - Use AWS Secrets Manager, Google Secret Manager, or similar for production secrets

---

## 🔴 CRITICAL - Database & Infrastructure

- [ ] **Verify production database connection** - Test Supabase connection from production backend
- [ ] **Run database migrations** - Ensure all migrations are applied to production database
- [ ] **Verify database backups** - Ensure automated backups are configured
- [ ] **Test database operations** - Verify save, retrieve, and update operations work correctly

---

## 🔴 CRITICAL - Testing

- [ ] **Run backend smoke tests** - `backend/tests/test_smoke.py` - Verify health check, API connectivity, database connection
- [ ] **Test critical API endpoints** - Verify all endpoints work with production configuration:
  - `/api/trainingplan/initial-questions`
  - `/api/trainingplan/generate/`
  - `/api/trainingplan/feedback/`
  - `/api/trainingplan/playbook/{user_id}`
- [ ] **Test authentication flow** - Verify JWT authentication works end-to-end
- [ ] **Test from production frontend** - Build production frontend and test against production backend
- [ ] **Verify error handling** - Test error scenarios don't expose sensitive data

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

