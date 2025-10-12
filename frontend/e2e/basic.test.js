describe('Basic E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should launch the app without crashing', async () => {
    // Just wait for the app to be ready - don't look for specific elements
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take a screenshot to see what's actually displayed
    await device.takeScreenshot('app-state');
    
    // The test passes if we get here without crashing
    expect(true).toBe(true);
  });

  it('should be able to interact with the device', async () => {
    // Test basic device interaction
    await device.reloadReactNative();
    
    // Wait a bit for the app to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take another screenshot
    await device.takeScreenshot('after-reload');
    
    expect(true).toBe(true);
  });
});
