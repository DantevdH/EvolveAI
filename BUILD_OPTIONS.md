# Expo Build Options: Quick Comparison Guide

## Three Ways to Run Your Expo App

### 1. Expo Go (Development - Current)
**What it is:** Sandboxed development app from App Store  
**Setup:** `npx expo start` → Scan QR code (instant)

**Pros:** Instant setup, hot reload, perfect for quick testing  
**Cons:** Deep links don't work (`about:blank`), OAuth needs manual open, limited to Expo SDK

**Use when:** Building UI, basic testing, team onboarding - **don't need native features**

---

### 2. Development Build (Recommended for Now)
**What it is:** Custom native build with dev client embedded  
**Setup:** Build once (5-15 min) → `npx expo start --dev-client` (daily, instant)

**Pros:** 
- ✅ Deep links work perfectly (no `about:blank`)
- ✅ OAuth redirects automatic
- ✅ All native modules supported
- ✅ **Hot reload works** - updates instantly like Expo Go!
- ✅ No rebuild for code changes

**Rebuild only when:** Adding native modules, changing app.json, modifying native code

**Use when:** Testing OAuth, deep links, email verification - **need native features + fast dev**

---

### 3. Production Build (Final Release)
**What it is:** Final optimized app for App Store/Play Store  
**Setup:** `eas build --platform ios --profile production` (10-30 min)

**Pros:** Optimized, store-ready, all features work  
**Cons:** No hot reload, rebuild for every change

**Use when:** Ready to release, submitting to stores, beta testing

---

## Quick Comparison

| Feature | Expo Go | Dev Build | Production |
|---------|---------|-----------|------------|
| **Setup** | Instant | 5-15 min (once) | 10-30 min |
| **Daily Start** | Instant | Instant | N/A |
| **Deep Links** | ❌ No | ✅ Yes | ✅ Yes |
| **OAuth** | ⚠️ Manual | ✅ Auto | ✅ Auto |
| **Hot Reload** | ✅ Yes | ✅ Yes | ❌ No |
| **Native Modules** | ❌ Limited | ✅ Yes | ✅ Yes |
| **Store Ready** | ❌ No | ❌ No | ✅ Yes |

---

## Can You Use All at the Same Time?

**Yes, on different devices!**

- **Expo Go** on device A → `npx expo start` → Scan QR
- **Dev Build** on device B → `npx expo start --dev-client` → Auto connects
- Both get hot reload from same dev server

**Same device:** Only one app version at a time (uninstall Expo Go before installing Dev Build)

### Typical Workflow
1. **Expo Go** → Quick UI dev (Day 1-2)
2. **Dev Build** → Test native features (when needed)
3. **Production Build** → Release to stores

---

## When to Use What

**Expo Go:** UI development, basic testing - **no native features needed**  
**Dev Build:** OAuth testing, deep links, email verification - **native features + fast dev**  
**Production:** Ready to ship - **App Store/Play Store submission**

---

## Quick Commands

### Expo Go
```bash
npx expo start
# Scan QR code
```

### Development Build
```bash
# First time (once)
npx expo run:ios

# Daily use
npx expo start --dev-client
# Hot reload works - changes update instantly!
```

### Production Build
```bash
eas build --platform ios --profile production
```

---

## From Production Build to App Store

### Step 1: Build Production App
```bash
cd frontend
eas build --platform ios --profile production
```
Wait for build to complete (10-30 min).

### Step 2: Submit to TestFlight (Beta Testing)

1. **Get Apple Developer Account** (if you don't have one)
   - Go to [developer.apple.com](https://developer.apple.com)
   - Sign up ($99/year)

2. **Upload Build to App Store Connect**
   ```bash
   eas submit --platform ios
   ```
   - Or manually: Download build from Expo dashboard
   - Upload via Xcode → Window → Organizer
   - Or via [App Store Connect](https://appstoreconnect.apple.com) → TestFlight → iOS Builds

3. **Configure TestFlight**
   - Go to App Store Connect → Your App → TestFlight
   - Add testers (internal or external)
   - Fill in required info (privacy policy, description, etc.)

4. **Test on TestFlight**
   - Testers receive email invitation
   - Install TestFlight app
   - Download and test your app
   - Provide feedback

### Step 3: Submit to App Store

1. **Prepare Store Listing**
   - App Store Connect → Your App → App Store
   - Screenshots (required: 6.5" and 6.7" iPhone)
   - App description, keywords, categories
   - Privacy policy URL
   - Support URL

2. **Set Up Pricing & Availability**
   - Price (or free)
   - Countries
   - Availability date

3. **Submit for Review**
   - App Store Connect → App Store → Version
   - Select build from TestFlight
   - Answer export compliance questions
   - Submit for review

4. **Review Process**
   - Usually takes 1-3 days
   - Apple reviews app functionality and guidelines
   - You'll get notification when approved/rejected

5. **Release**
   - Once approved, choose release date
   - App goes live on App Store!

### Useful Commands
```bash
# Build for production
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios

# Check build status
eas build:list

# View submission status
eas submit:list
```

### Timeline
- **Build:** 10-30 minutes
- **TestFlight Upload:** 5-15 minutes
- **TestFlight Testing:** 1-7 days (your choice)
- **App Store Review:** 1-3 days (Apple)
- **Total:** ~1-2 weeks from production build to App Store

---

## What Are Deep Links?

**Deep Links** are special URLs that open your app to a specific screen.

**Examples:** `frontendexpo2://login`, `frontendexpo2://oauth/callback`

**In your app:** Configured in `app.json` (`"scheme": "frontendexpo2"`), used for OAuth callbacks and email verification.

**Why Expo Go can't use:** Doesn't register your scheme with iOS/Android → shows `about:blank`

---

## What Are Native Modules?

**Native Modules** are packages using platform-specific code (iOS/Android native libraries).

**Examples:** `expo-web-browser`, `expo-secure-store`, `react-native-reanimated`

**In your app:** You use many (expo-*, react-native-* packages) for OAuth, secure storage, animations, etc.

**Why Expo Go is limited:** Has fixed set of pre-built modules - Dev Build/Production includes ALL your modules

---

## Summary

**Expo Go** = Fast dev, no native features  
**Dev Build** = Native features + fast dev (hot reload!)  
**Production** = Final app, store-ready

**Your app:** Uses deep links (OAuth, email verification) + many native modules → **Need Dev Build**

