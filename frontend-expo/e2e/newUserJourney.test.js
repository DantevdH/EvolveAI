/**
 * E2E Test: New User Complete Journey
 * Tests: Signup → Onboarding → Profile Creation → Main App
 */

describe('New User Journey', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should complete full new user journey from signup to main app', async () => {
    // Step 1: Navigate to Signup Screen
    await expect(element(by.id('signup-link'))).toBeVisible();
    await element(by.id('signup-link')).tap();

    // Step 2: Fill out signup form
    await expect(element(by.id('email-input'))).toBeVisible();
    await element(by.id('email-input')).typeText('testuser@example.com');
    
    await expect(element(by.id('password-input'))).toBeVisible();
    await element(by.id('password-input')).typeText('Password123!');
    
    await expect(element(by.id('confirm-password-input'))).toBeVisible();
    await element(by.id('confirm-password-input')).typeText('Password123!');

    // Step 3: Submit signup
    await expect(element(by.id('signup-button'))).toBeVisible();
    await element(by.id('signup-button')).tap();

    // Wait for signup to complete (loading indicator should appear)
    await expect(element(by.id('loading-indicator'))).toBeVisible();
    
    // Wait for navigation to onboarding
    await waitFor(element(by.id('welcome-subtitle')))
      .toBeVisible()
      .withTimeout(10000);

    // Step 4: Complete Onboarding Flow
    await completeOnboardingFlow();

    // Step 5: Verify navigation to main app
    await expect(element(by.id('create-plan-button'))).toBeVisible();
    
    // Step 6: Create profile and navigate to main app
    await element(by.id('create-plan-button')).tap();
    
    // Wait for profile creation and navigation to main app
    await waitFor(element(by.text('Home')))
      .toBeVisible()
      .withTimeout(15000);
  });

  async function completeOnboardingFlow() {
    // Welcome Screen
    await expect(element(by.id('username-input'))).toBeVisible();
    await element(by.id('username-input')).typeText('TestUser123');
    await element(by.id('next-button')).tap();

    // Experience Level Screen
    await expect(element(by.id('experience-level-option-beginner'))).toBeVisible();
    await element(by.id('experience-level-option-beginner')).tap();
    await element(by.id('next-button')).tap();

    // Personal Info Screen
    await expect(element(by.id('age-input'))).toBeVisible();
    await element(by.id('age-input')).typeText('25');
    
    await expect(element(by.id('weight-input'))).toBeVisible();
    await element(by.id('weight-input')).typeText('70');
    
    await expect(element(by.id('height-input'))).toBeVisible();
    await element(by.id('height-input')).typeText('175');
    
    await expect(element(by.id('gender-male'))).toBeVisible();
    await element(by.id('gender-male')).tap();
    await element(by.id('next-button')).tap();

    // Fitness Goals Screen
    await expect(element(by.id('goal-description-input'))).toBeVisible();
    await element(by.id('goal-description-input')).typeText('I want to lose weight and build muscle through a balanced workout routine');
    await element(by.id('next-button')).tap();

    // Time Availability Screen
    await expect(element(by.id('slider-increase-button'))).toBeVisible();
    // Set days per week to 4
    for (let i = 0; i < 3; i++) {
      await element(by.id('slider-increase-button')).tap();
    }
    
    // Set minutes per session to 60
    for (let i = 0; i < 3; i++) {
      await element(by.id('slider-increase-button')).tap();
    }
    await element(by.id('next-button')).tap();

    // Equipment Access Screen
    await expect(element(by.id('equipment-option-full-gym'))).toBeVisible();
    await element(by.id('equipment-option-full-gym')).tap();
    await element(by.id('next-button')).tap();

    // Physical Limitations Screen
    await expect(element(by.id('limitations-no-button'))).toBeVisible();
    await element(by.id('limitations-no-button')).tap();
    await element(by.id('next-button')).tap();

    // Onboarding Complete Screen
    await expect(element(by.id('create-plan-button'))).toBeVisible();
  }
});
