/**
 * E2E Test: Complete Onboarding Flow
 * Tests: All 8 onboarding steps with validation and navigation
 */

describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.launchApp();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should complete all 8 onboarding steps successfully', async () => {
    // Navigate to onboarding (assuming user is signed up)
    await navigateToOnboarding();

    // Step 1: Welcome Screen
    await testWelcomeScreen();

    // Step 2: Experience Level Screen
    await testExperienceLevelScreen();

    // Step 3: Personal Info Screen
    await testPersonalInfoScreen();

    // Step 4: Fitness Goals Screen
    await testFitnessGoalsScreen();

    // Step 5: Time Availability Screen
    await testTimeAvailabilityScreen();

    // Step 6: Equipment Access Screen
    await testEquipmentAccessScreen();

    // Step 7: Physical Limitations Screen
    await testPhysicalLimitationsScreen();

    // Step 8: Onboarding Complete Screen
    await testOnboardingCompleteScreen();
  });

  it('should handle onboarding validation errors', async () => {
    await navigateToOnboarding();

    // Test username validation
    await expect(element(by.id('username-input'))).toBeVisible();
    await element(by.id('username-input')).typeText('ab'); // Too short
    await element(by.id('next-button')).tap();
    
    // Should show validation error
    await expect(element(by.text('Username must be at least 5 characters'))).toBeVisible();
    
    // Fix username
    await element(by.id('username-input')).clearText();
    await element(by.id('username-input')).typeText('ValidUser123');
    await element(by.id('next-button')).tap();
  });

  it('should handle back navigation in onboarding', async () => {
    await navigateToOnboarding();

    // Complete first few steps
    await testWelcomeScreen();
    await testExperienceLevelScreen();

    // Go back to previous step
    await expect(element(by.id('back-button'))).toBeVisible();
    await element(by.id('back-button')).tap();

    // Should be back on experience level screen
    await expect(element(by.id('experience-level-option-beginner'))).toBeVisible();
  });

  it('should handle app backgrounding during onboarding', async () => {
    await navigateToOnboarding();
    await testWelcomeScreen();
    await testExperienceLevelScreen();

    // Background the app
    await device.sendToHome();
    await device.launchApp();

    // Should resume from where we left off
    await expect(element(by.id('age-input'))).toBeVisible();
  });

  async function navigateToOnboarding() {
    // This would typically be after signup or login
    // For testing, we'll assume we're already in onboarding
    await waitFor(element(by.id('welcome-subtitle')))
      .toBeVisible()
      .withTimeout(5000);
  }

  async function testWelcomeScreen() {
    await expect(element(by.id('welcome-subtitle'))).toBeVisible();
    await expect(element(by.id('username-input'))).toBeVisible();
    
    await element(by.id('username-input')).typeText('TestUser123');
    await element(by.id('next-button')).tap();
  }

  async function testExperienceLevelScreen() {
    await expect(element(by.id('experience-level-option-beginner'))).toBeVisible();
    await expect(element(by.id('experience-level-option-intermediate'))).toBeVisible();
    await expect(element(by.id('experience-level-option-advanced'))).toBeVisible();
    
    await element(by.id('experience-level-option-beginner')).tap();
    await element(by.id('next-button')).tap();
  }

  async function testPersonalInfoScreen() {
    await expect(element(by.id('age-input'))).toBeVisible();
    await element(by.id('age-input')).typeText('25');
    
    await expect(element(by.id('weight-input'))).toBeVisible();
    await element(by.id('weight-input')).typeText('70');
    
    await expect(element(by.id('height-input'))).toBeVisible();
    await element(by.id('height-input')).typeText('175');
    
    await expect(element(by.id('gender-male'))).toBeVisible();
    await element(by.id('gender-male')).tap();
    
    await element(by.id('next-button')).tap();
  }

  async function testFitnessGoalsScreen() {
    await expect(element(by.id('goal-description-input'))).toBeVisible();
    await element(by.id('goal-description-input')).typeText('I want to lose weight and build muscle through a balanced workout routine');
    
    await element(by.id('next-button')).tap();
  }

  async function testTimeAvailabilityScreen() {
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
  }

  async function testEquipmentAccessScreen() {
    await expect(element(by.id('equipment-option-full-gym'))).toBeVisible();
    await expect(element(by.id('equipment-option-home-gym'))).toBeVisible();
    await expect(element(by.id('equipment-option-dumbbells-only'))).toBeVisible();
    await expect(element(by.id('equipment-option-bodyweight-only'))).toBeVisible();
    
    await element(by.id('equipment-option-full-gym')).tap();
    await element(by.id('next-button')).tap();
  }

  async function testPhysicalLimitationsScreen() {
    await expect(element(by.id('limitations-no-button'))).toBeVisible();
    await expect(element(by.id('limitations-yes-button'))).toBeVisible();
    
    await element(by.id('limitations-no-button')).tap();
    await element(by.id('next-button')).tap();
  }

  async function testOnboardingCompleteScreen() {
    await expect(element(by.id('create-plan-button'))).toBeVisible();
    await expect(element(by.id('edit-profile-button'))).toBeVisible();
    
    // Verify summary data is displayed
    await expect(element(by.text('TestUser123'))).toBeVisible();
    await expect(element(by.text('Beginner'))).toBeVisible();
    await expect(element(by.text('4 days/week'))).toBeVisible();
  }
});
