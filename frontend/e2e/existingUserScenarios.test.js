/**
 * E2E Test: Existing User Scenarios Based on Profile State
 * Tests: 3 distinct user states after login
 */

describe('Existing User Scenarios', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.launchApp();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('User with Account but No Profile (→ Onboarding)', () => {
    it('should redirect to onboarding after login when no profile exists', async () => {
      // Step 1: Login with user who has account but no profile
      await expect(element(by.id('email-input'))).toBeVisible();
      await element(by.id('email-input')).typeText('newuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      // Wait for login to complete
      await expect(element(by.id('loading-indicator'))).toBeVisible();
      
      // Step 2: Should redirect to onboarding (not main app)
      await waitFor(element(by.id('welcome-subtitle')))
        .toBeVisible()
        .withTimeout(10000);

      // Step 3: Verify we're in onboarding flow
      await expect(element(by.id('username-input'))).toBeVisible();
      await expect(element(by.id('next-button'))).toBeVisible();
      
      // Step 4: Complete onboarding to create profile
      await completeOnboardingFlow();
      
      // Step 5: After onboarding, should go to generate plan screen
      await waitFor(element(by.text('Generate Your Plan')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle OAuth login for user without profile', async () => {
      // Step 1: OAuth login for new user
      await expect(element(by.id('google-signin-button'))).toBeVisible();
      await element(by.id('google-signin-button')).tap();

      // Step 2: Should redirect to onboarding after OAuth
      await waitFor(element(by.id('welcome-subtitle')))
        .toBeVisible()
        .withTimeout(15000);

      // Step 3: Verify onboarding flow
      await expect(element(by.id('username-input'))).toBeVisible();
    });
  });

  describe('User with Profile but No Plan (→ Generate Plan)', () => {
    it('should redirect to generate plan screen after login when profile exists but no plan', async () => {
      // Step 1: Login with user who has profile but no training plan
      await expect(element(by.id('email-input'))).toBeVisible();
      await element(by.id('email-input')).typeText('profileuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      // Wait for login to complete
      await expect(element(by.id('loading-indicator'))).toBeVisible();
      
      // Step 2: Should redirect to generate plan screen (not onboarding, not main app)
      await waitFor(element(by.text('Generate Your Plan')))
        .toBeVisible()
        .withTimeout(10000);

      // Step 3: Verify generate plan screen elements
      await expect(element(by.text('AI is creating your personalized training plan'))).toBeVisible();
      await expect(element(by.id('animated-spinner'))).toBeVisible();
      
      // Step 4: Wait for plan generation to complete
      await waitFor(element(by.text('Your Plan is Ready!')))
        .toBeVisible()
        .withTimeout(30000);

      // Step 5: Should navigate to main app after plan generation
      await waitFor(element(by.text('Home')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should allow user to regenerate plan if needed', async () => {
      // Login and navigate to generate plan screen
      await element(by.id('email-input')).typeText('profileuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.text('Generate Your Plan')))
        .toBeVisible()
        .withTimeout(10000);

      // Wait for plan generation
      await waitFor(element(by.text('Your Plan is Ready!')))
        .toBeVisible()
        .withTimeout(30000);

      // Should have option to regenerate or proceed
      await expect(element(by.text('Regenerate Plan'))).toBeVisible();
      await expect(element(by.text('View My Plan'))).toBeVisible();
    });
  });

  describe('User with Complete Profile and Plan (→ Main App Home)', () => {
    it('should redirect to main app home screen after login when user has complete profile and plan', async () => {
      // Step 1: Login with user who has complete profile and training plan
      await expect(element(by.id('email-input'))).toBeVisible();
      await element(by.id('email-input')).typeText('completeuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      // Wait for login to complete
      await expect(element(by.id('loading-indicator'))).toBeVisible();
      
      // Step 2: Should redirect directly to main app home screen
      await waitFor(element(by.text('Home')))
        .toBeVisible()
        .withTimeout(10000);

      // Step 3: Verify home screen elements
      await expect(element(by.text('Welcome back'))).toBeVisible();
      await expect(element(by.text('Your Training Plan'))).toBeVisible();
      await expect(element(by.text('Today\'s Training'))).toBeVisible();
      
      // Step 4: Verify main navigation is available
      await expect(element(by.text('Home'))).toBeVisible();
      await expect(element(by.text('Trainings'))).toBeVisible();
      await expect(element(by.text('Profile'))).toBeVisible();
      await expect(element(by.text('Settings'))).toBeVisible();
    });

    it('should display user\'s training plan and progress', async () => {
      // Login and navigate to home
      await element(by.id('email-input')).typeText('completeuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.text('Home')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify training plan details are displayed
      await expect(element(by.text('Week 1'))).toBeVisible();
      await expect(element(by.text('Day 1'))).toBeVisible();
      await expect(element(by.text('Progress'))).toBeVisible();
      
      // Verify coach information is displayed
      await expect(element(by.text('Your Coach'))).toBeVisible();
      await expect(element(by.text('Sarah Johnson'))).toBeVisible(); // Coach name
    });

    it('should allow navigation to different app sections', async () => {
      // Login and navigate to home
      await element(by.id('email-input')).typeText('completeuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.text('Home')))
        .toBeVisible()
        .withTimeout(10000);

      // Test navigation to Trainings section
      await element(by.text('Trainings')).tap();
      await expect(element(by.text('Training Library'))).toBeVisible();
      await expect(element(by.text('My Trainings'))).toBeVisible();

      // Test navigation to Profile section
      await element(by.text('Profile')).tap();
      await expect(element(by.text('Profile Settings'))).toBeVisible();
      await expect(element(by.text('Edit Profile'))).toBeVisible();

      // Test navigation back to Home
      await element(by.text('Home')).tap();
      await expect(element(by.text('Welcome back'))).toBeVisible();
    });
  });

  describe('Error Scenarios for Existing Users', () => {
    it('should handle login errors gracefully', async () => {
      // Try login with invalid credentials
      await element(by.id('email-input')).typeText('invalid@example.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('login-button')).tap();

      // Should show error message
      await waitFor(element(by.text('Invalid email or password')))
        .toBeVisible()
        .withTimeout(5000);

      // Should stay on login screen
      await expect(element(by.id('email-input'))).toBeVisible();
    });

    it('should handle network errors during login', async () => {
      // Disable network
      await device.disableSynchronization();
      
      // Try to login
      await element(by.id('email-input')).typeText('completeuser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      // Should show network error
      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Re-enable network
      await device.enableSynchronization();
    });

    it('should handle profile loading errors', async () => {
      // Login with user who has corrupted profile data
      await element(by.id('email-input')).typeText('corrupteduser@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('login-button')).tap();

      // Should handle profile loading error gracefully
      await waitFor(element(by.text('Profile loading failed')))
        .toBeVisible()
        .withTimeout(10000);

      // Should offer option to retry or start over
      await expect(element(by.text('Retry'))).toBeVisible();
      await expect(element(by.text('Start Over'))).toBeVisible();
    });
  });

  // Helper function to complete onboarding flow
  async function completeOnboardingFlow() {
    // Welcome Screen
    await element(by.id('username-input')).typeText('TestUser123');
    await element(by.id('next-button')).tap();

    // Experience Level Screen
    await element(by.id('experience-level-option-beginner')).tap();
    await element(by.id('next-button')).tap();

    // Personal Info Screen
    await element(by.id('age-input')).typeText('25');
    await element(by.id('weight-input')).typeText('70');
    await element(by.id('height-input')).typeText('175');
    await element(by.id('gender-male')).tap();
    await element(by.id('next-button')).tap();

    // training Goals Screen
    await element(by.id('goal-description-input')).typeText('I want to lose weight and build muscle');
    await element(by.id('next-button')).tap();

    // Time Availability Screen
    await element(by.id('next-button')).tap();

    // Equipment Access Screen
    await element(by.id('equipment-option-full-gym')).tap();
    await element(by.id('next-button')).tap();

    // Physical Limitations Screen
    await element(by.id('limitations-no-button')).tap();
    await element(by.id('next-button')).tap();

    // Onboarding Complete Screen
    await expect(element(by.id('create-plan-button'))).toBeVisible();
    await element(by.id('create-plan-button')).tap();
  }
});
