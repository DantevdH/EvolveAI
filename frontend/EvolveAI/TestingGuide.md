# Testing Guide for EvolveAI

## Manual Testing with Mock Scenarios

The app now uses scenario-based testing instead of build phases. This makes it easier to test different user flows without changing code.

### How to Test Different Scenarios

#### Option 1: Launch Arguments (Recommended)
Add these arguments to your Xcode scheme:

1. **New User Flow** (default):
   - No arguments needed (defaults to new user)

2. **Existing User (has profile, needs plan)**:
   - Add: `--mock-existing-user`

3. **Onboarded User (has profile, no plan)**:
   - Add: `--mock-onboarded-user`

4. **User with Complete Plan**:
   - Add: `--mock-user-with-plan`

5. **Network Error Simulation**:
   - Add: `--mock-network-error`

#### How to Set Launch Arguments in Xcode:
1. Edit your scheme (Product → Scheme → Edit Scheme)
2. Select "Run" → "Arguments"
3. Add arguments to "Arguments Passed On Launch"
4. Run the app

### Scenario Descriptions

- **New User**: No profile, needs to complete onboarding
- **Existing User**: Has profile but no workout plan
- **Onboarded User**: Has profile, no plan (similar to existing user)
- **User with Plan**: Complete user with workout plan
- **Network Error**: Simulates network failures

### Benefits of This Approach

✅ **Easy to switch scenarios** - Just change launch arguments
✅ **No code changes needed** - Test different flows without modifying code
✅ **Realistic responses** - Each scenario returns appropriate API responses
✅ **Better developer experience** - Clear what each scenario represents
✅ **Standard iOS practice** - Uses launch arguments like production apps

### Next Steps for Automated Testing

Once manual testing is working well, you can add:

1. **Unit Tests**: Test individual components with mock scenarios
2. **UI Tests**: Test complete user flows
3. **Integration Tests**: Test the full app with different scenarios

### Example Test Scenarios

```swift
// Unit test example
func testNewUserFlow() {
    // Set up mock scenario
    // Test that user goes to onboarding
}

func testExistingUserFlow() {
    // Set up mock scenario  
    // Test that user goes to plan generation
}
``` 