# E2E Testing with Detox

This directory contains End-to-End (E2E) tests for the EvolveAI app using Detox.

## 🎯 Test Coverage

### 1. New User Journey (`newUserJourney.test.js`)
- Complete signup flow
- Full onboarding process (8 steps)
- Profile creation
- Navigation to main app

### 2. Existing User Journey (`existingUserJourney.test.js`)
- Login with email/password (complete profile + plan)
- OAuth login (Google, Apple, Facebook)
- Navigation to main app home screen
- Password reset flow
- Error handling

### 3. Existing User Scenarios (`existingUserScenarios.test.js`)
- **User with Account but No Profile** → Onboarding flow
- **User with Profile but No Plan** → Generate Plan screen
- **User with Complete Profile + Plan** → Main App Home
- Error handling for each scenario

### 4. Onboarding Flow (`onboardingFlow.test.js`)
- All 8 onboarding steps
- Form validation
- Back/forward navigation
- Data persistence
- App backgrounding/resumption

### 5. Error Scenarios (`errorScenarios.test.js`)
- Network failures
- Validation errors
- App crashes and recovery
- Rapid user interactions
- OAuth errors
- Profile creation failures

## 🚀 Running E2E Tests

### Prerequisites
1. **iOS Simulator** (for iOS tests)
2. **Android Emulator** (for Android tests)
3. **Xcode** (for iOS builds)
4. **Android Studio** (for Android builds)

### Commands

```bash
# Build the app for testing
npm run detox:build

# Run all E2E tests
npm run detox:test

# Run iOS tests only
npm run detox:test:ios

# Run Android tests only
npm run detox:test:android

# Run specific test file
detox test e2e/newUserJourney.test.js

# Run with specific configuration
detox test --configuration ios.sim.debug
```

### First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the app:**
   ```bash
   npm run detox:build
   ```

3. **Run tests:**
   ```bash
   npm run detox:test
   ```

## 📱 Test Scenarios

### Critical User Flows
- ✅ New user signup → onboarding → profile creation
- ✅ **Existing user with no profile** → onboarding flow
- ✅ **Existing user with profile but no plan** → generate plan screen
- ✅ **Existing user with complete profile + plan** → main app home
- ✅ Complete onboarding journey
- ✅ OAuth authentication
- ✅ Password reset

### Error Handling
- ✅ Network connectivity issues
- ✅ Form validation errors
- ✅ App backgrounding/resumption
- ✅ Rapid user interactions
- ✅ Authentication failures

### Data Persistence
- ✅ Onboarding progress saving
- ✅ Form data persistence
- ✅ User session management
- ✅ App state restoration

## 🔧 Configuration

### Detox Configuration (`.detoxrc.js`)
- iOS Simulator: iPhone 15
- Android Emulator: Pixel 3a API 30
- Test timeout: 120 seconds
- Setup timeout: 120 seconds

### Jest Configuration (`e2e/jest.config.js`)
- Test timeout: 120 seconds
- Max workers: 1 (for stability)
- Verbose output enabled

## 📊 Test Results

### Expected Outcomes
- **New User Journey**: Complete signup → onboarding → main app
- **Existing User Journey**: Login → home screen with existing plan
- **Onboarding Flow**: All 8 steps with validation
- **Error Scenarios**: Graceful error handling and recovery

### Performance Targets
- **App Launch**: <3 seconds
- **Screen Transitions**: <1 second
- **Form Submissions**: <2 seconds
- **Test Execution**: <5 minutes total

## 🐛 Troubleshooting

### Common Issues

1. **Simulator not found:**
   ```bash
   # List available simulators
   xcrun simctl list devices
   
   # Boot simulator
   xcrun simctl boot "iPhone 15"
   ```

2. **Build failures:**
   ```bash
   # Clean build
   npm run detox:build -- --clean
   
   # Reset Metro cache
   npx react-native start --reset-cache
   ```

3. **Test timeouts:**
   - Increase timeout in `.detoxrc.js`
   - Check for slow animations
   - Verify test selectors are correct

4. **Element not found:**
   - Verify `testID` attributes in components
   - Check element visibility
   - Use `waitFor` for dynamic content

### Debug Mode

```bash
# Run with debug output
detox test --loglevel verbose

# Run single test with debug
detox test e2e/newUserJourney.test.js --loglevel verbose
```

## 📝 Writing New Tests

### Test Structure
```javascript
describe('Test Suite', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should test specific functionality', async () => {
    // Test steps
    await expect(element(by.id('element-id'))).toBeVisible();
    await element(by.id('element-id')).tap();
  });
});
```

### Best Practices
1. Use descriptive test names
2. Test one scenario per test
3. Use `waitFor` for dynamic content
4. Clean up after tests
5. Use meaningful `testID` attributes

### Element Selection
```javascript
// By testID (preferred)
await element(by.id('username-input')).typeText('test');

// By text
await element(by.text('Sign In')).tap();

// By label
await element(by.label('Email input')).typeText('test@example.com');
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build app
        run: npm run detox:build
      - name: Run E2E tests
        run: npm run detox:test:ios
```

## 📈 Metrics & Reporting

### Test Metrics
- **Pass Rate**: Target 95%+
- **Execution Time**: <5 minutes
- **Flakiness**: <5% retry rate
- **Coverage**: All critical user flows

### Reporting
- Jest HTML reporter for detailed results
- Screenshots on test failures
- Video recordings for debugging
- Performance metrics tracking
