/**
 * E2E Test: Error Scenarios and Edge Cases
 * Tests: Network failures, validation errors, app crashes, etc.
 */

describe('Error Scenarios', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.launchApp();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should handle network failures during signup', async () => {
    // Disable network
    await device.disableSynchronization();
    
    // Try to signup
    await expect(element(by.id('signup-link'))).toBeVisible();
    await element(by.id('signup-link')).tap();
    
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('Password123!');
    await element(by.id('confirm-password-input')).typeText('Password123!');
    await element(by.id('signup-button')).tap();
    
    // Should show network error
    await waitFor(element(by.text('Network error')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Re-enable network
    await device.enableSynchronization();
  });

  it('should handle validation errors in onboarding', async () => {
    // Navigate to onboarding
    await navigateToOnboarding();
    
    // Test age validation
    await expect(element(by.id('age-input'))).toBeVisible();
    await element(by.id('age-input')).typeText('5'); // Too young
    await element(by.id('next-button')).tap();
    
    // Should show validation error
    await expect(element(by.text('Age must be between 13 and 120'))).toBeVisible();
    
    // Fix age
    await element(by.id('age-input')).clearText();
    await element(by.id('age-input')).typeText('25');
    await element(by.id('next-button')).tap();
  });

  it('should handle physical limitations description validation', async () => {
    await navigateToOnboarding();
    await completeStepsUpToPhysicalLimitations();
    
    // Select "Yes" for limitations
    await expect(element(by.id('limitations-yes-button'))).toBeVisible();
    await element(by.id('limitations-yes-button')).tap();
    
    // Try to proceed without description
    await element(by.id('next-button')).tap();
    
    // Should show validation error
    await expect(element(by.text('Please describe your limitations'))).toBeVisible();
    
    // Add description that's too short
    await expect(element(by.id('limitations-description-input'))).toBeVisible();
    await element(by.id('limitations-description-input')).typeText('Knee injury');
    await element(by.id('next-button')).tap();
    
    // Should show character count error
    await expect(element(by.text('Please provide more details about your limitations'))).toBeVisible();
    
    // Add proper description
    await element(by.id('limitations-description-input')).clearText();
    await element(by.id('limitations-description-input')).typeText('I have a knee injury from running that limits my ability to do high-impact exercises and prevents me from participating in certain activities');
    await element(by.id('next-button')).tap();
  });

  it('should handle app backgrounding and resumption', async () => {
    await navigateToOnboarding();
    await testWelcomeScreen();
    await testExperienceLevelScreen();
    
    // Background the app
    await device.sendToHome();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Resume the app
    await device.launchApp();
    
    // Should resume from where we left off
    await expect(element(by.id('age-input'))).toBeVisible();
  });

  it('should handle rapid user interactions', async () => {
    await navigateToOnboarding();
    
    // Rapidly tap next button multiple times
    await expect(element(by.id('next-button'))).toBeVisible();
    await element(by.id('next-button')).tap();
    await element(by.id('next-button')).tap();
    await element(by.id('next-button')).tap();
    
    // Should handle gracefully and not crash
    await expect(element(by.id('experience-level-option-beginner'))).toBeVisible();
  });

  it('should handle form data persistence across navigation', async () => {
    await navigateToOnboarding();
    
    // Fill out personal info
    await testWelcomeScreen();
    await testExperienceLevelScreen();
    
    await expect(element(by.id('age-input'))).toBeVisible();
    await element(by.id('age-input')).typeText('30');
    await element(by.id('weight-input')).typeText('75');
    await element(by.id('height-input')).typeText('180');
    await element(by.id('gender-female')).tap();
    
    // Go back and forward
    await element(by.id('back-button')).tap();
    await element(by.id('next-button')).tap();
    
    // Data should be preserved
    await expect(element(by.id('age-input'))).toHaveValue('30');
    await expect(element(by.id('weight-input'))).toHaveValue('75');
    await expect(element(by.id('height-input'))).toHaveValue('180');
  });

  it('should handle OAuth login errors', async () => {
    // Try OAuth login with invalid credentials
    await expect(element(by.id('google-signin-button'))).toBeVisible();
    await element(by.id('google-signin-button')).tap();
    
    // Should handle OAuth error gracefully
    await waitFor(element(by.text('Login failed')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should handle profile creation failures', async () => {
    await navigateToOnboarding();
    await completeFullOnboarding();
    
    // Try to create profile (simulate failure)
    await expect(element(by.id('create-plan-button'))).toBeVisible();
    await element(by.id('create-plan-button')).tap();
    
    // Should show error and allow retry
    await waitFor(element(by.text('Profile creation failed')))
      .toBeVisible()
      .withTimeout(10000);
  });

  async function navigateToOnboarding() {
    await waitFor(element(by.id('welcome-subtitle')))
      .toBeVisible()
      .withTimeout(5000);
  }

  async function testWelcomeScreen() {
    await element(by.id('username-input')).typeText('TestUser123');
    await element(by.id('next-button')).tap();
  }

  async function testExperienceLevelScreen() {
    await element(by.id('experience-level-option-beginner')).tap();
    await element(by.id('next-button')).tap();
  }

  async function completeStepsUpToPhysicalLimitations() {
    await testWelcomeScreen();
    await testExperienceLevelScreen();
    
    // Personal Info
    await element(by.id('age-input')).typeText('25');
    await element(by.id('weight-input')).typeText('70');
    await element(by.id('height-input')).typeText('175');
    await element(by.id('gender-male')).tap();
    await element(by.id('next-button')).tap();
    
    // Fitness Goals
    await element(by.id('goal-description-input')).typeText('I want to lose weight and build muscle');
    await element(by.id('next-button')).tap();
    
    // Time Availability
    await element(by.id('next-button')).tap();
    
    // Equipment Access
    await element(by.id('equipment-option-full-gym')).tap();
    await element(by.id('next-button')).tap();
  }

  async function completeFullOnboarding() {
    await testWelcomeScreen();
    await testExperienceLevelScreen();
    
    // Personal Info
    await element(by.id('age-input')).typeText('25');
    await element(by.id('weight-input')).typeText('70');
    await element(by.id('height-input')).typeText('175');
    await element(by.id('gender-male')).tap();
    await element(by.id('next-button')).tap();
    
    // Fitness Goals
    await element(by.id('goal-description-input')).typeText('I want to lose weight and build muscle');
    await element(by.id('next-button')).tap();
    
    // Time Availability
    await element(by.id('next-button')).tap();
    
    // Equipment Access
    await element(by.id('equipment-option-full-gym')).tap();
    await element(by.id('next-button')).tap();
    
    // Physical Limitations
    await element(by.id('limitations-no-button')).tap();
    await element(by.id('next-button')).tap();
  }
});
