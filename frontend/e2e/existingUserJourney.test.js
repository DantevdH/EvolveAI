/**
 * E2E Test: Existing User Journey (Complete Profile + Plan)
 * Tests: Login → Main App → Home Screen
 * Note: This test assumes user has complete profile and training plan
 */

describe('Existing User Journey (Complete Profile)', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.launchApp();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should login user with complete profile and plan, navigate to main app home screen', async () => {
    // Step 1: Navigate to Login Screen (should be default)
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();

    // Step 2: Fill out login form
    await element(by.id('email-input')).typeText('existinguser@example.com');
    await element(by.id('password-input')).typeText('Password123!');

    // Step 3: Submit login
    await expect(element(by.id('login-button'))).toBeVisible();
    await element(by.id('login-button')).tap();

    // Wait for login to complete (loading indicator should appear)
    await expect(element(by.id('loading-indicator'))).toBeVisible();
    
    // Wait for navigation to main app home screen
    await waitFor(element(by.text('Home')))
      .toBeVisible()
      .withTimeout(10000);

    // Step 4: Verify user is on home screen with existing plan
    await expect(element(by.text('Welcome back'))).toBeVisible();
    await expect(element(by.text('Your Training Plan'))).toBeVisible();
    
    // Step 5: Verify main navigation is available
    await expect(element(by.text('Home'))).toBeVisible();
    await expect(element(by.text('Trainings'))).toBeVisible();
    await expect(element(by.text('Profile'))).toBeVisible();
  });

  it('should handle OAuth login flow', async () => {
    // Step 1: Try Google OAuth login
    await expect(element(by.id('google-signin-button'))).toBeVisible();
    await element(by.id('google-signin-button')).tap();

    // Wait for OAuth flow to complete
    await waitFor(element(by.text('Home')))
      .toBeVisible()
      .withTimeout(15000);

    // Verify successful OAuth login
    await expect(element(by.text('Welcome back'))).toBeVisible();
  });

  it('should handle login errors gracefully', async () => {
    // Step 1: Try login with invalid credentials
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    // Step 2: Verify error message appears
    await waitFor(element(by.text('Invalid email or password')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 3: Verify user stays on login screen
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('should handle password reset flow', async () => {
    // Step 1: Navigate to forgot password
    await expect(element(by.id('forgot-password-button'))).toBeVisible();
    await element(by.id('forgot-password-button')).tap();

    // Step 2: Fill out email for password reset
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('email-input')).typeText('existinguser@example.com');
    
    // Step 3: Submit password reset request
    await expect(element(by.text('Send Reset Email'))).toBeVisible();
    await element(by.text('Send Reset Email')).tap();

    // Step 4: Verify confirmation message
    await waitFor(element(by.text('Password reset email sent')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
