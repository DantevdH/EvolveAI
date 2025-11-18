# Frontend Testing Rules

## Test Structure
- Tests in `src/__tests__/` directory
- Mirror source structure in test directory
- Use Jest for testing
- Use React Native Testing Library for component tests

## Testability Requirements
- **Business logic must be testable** - All business logic should be extracted from screens/components into:
  - Pure functions (can be tested without React)
  - Custom hooks (can be tested with React Testing Library)
  - Service functions (can be mocked and tested)
- **Screens should be easy to test** - If a screen has complex logic, extract it first
- **Test pure functions independently** - Functions like calculations, validations, transformations should be unit tested without React
- **Test hooks separately** - Custom hooks can be tested using `@testing-library/react-hooks` or similar

## Test Best Practices
- Test user interactions, not implementation details
- Mock external dependencies (API calls, Supabase)
- Use test utilities from `src/__tests__/setup.ts`
- Keep tests focused and isolated
- **Test business logic separately from UI** - Test the extracted functions/hooks, not just the screen rendering

## Writing Tests
- Write tests for critical user flows
- Test error states and edge cases
- Use descriptive test names
- Keep tests maintainable and readable
- Mock Supabase client in tests
- **Unit test pure functions** - Test calculation, validation, and transformation functions independently
- **Integration test hooks** - Test custom hooks with their dependencies mocked

## Test Utilities
- Use mock Supabase client from `src/config/supabase.mock.ts`
- Use test setup files for common configuration
- Create reusable test utilities when needed

