# React Native Frontend Rules

## Component Patterns
- Prefer functional components with hooks
- Use custom hooks for reusable logic
- Keep components small and focused
- Extract complex logic into separate functions/hooks
- Use React.memo() for performance optimization when needed

## Testability - Separation of Business Logic
- **Screens should be thin** - Screens should primarily handle UI rendering and user interactions
- **Extract business logic** - All business logic, calculations, and data transformations should be extracted into:
  - **Pure functions** in utility files (e.g., `utils/trainingKPIs.ts`, `utils/trainingPlanTransformer.ts`)
  - **Custom hooks** for stateful logic (e.g., `useTraining`, `useDailyFeedback`)
  - **Service functions** for API calls and data operations (e.g., `services/onboardingService.ts`)
- **Testable functions** - Functions should be pure (no side effects) or clearly separated from UI
- **Example**: Instead of calculating macros in a screen component, extract to `utils/macroCalculator.ts` that can be unit tested
- **Screen structure**: Screen → calls hooks/services → renders UI components

## State Management
- Use React Context for global state (AuthContext, AppContext)
- Use local state (useState) for component-specific state
- Use custom hooks for complex state logic
- Avoid prop drilling - use context or state management library

## Styling
- Use StyleSheet.create() for styles
- Follow design system constants from `src/constants/designSystem.ts`
- Use theme colors from `src/constants/theme.ts`
- Support dark mode when applicable
- Use responsive design patterns

## Navigation
- Use Expo Router for navigation
- Keep navigation logic in `src/navigation/`
- Use typed navigation (TypeScript)
- Handle deep linking appropriately

## Performance
- Use React.memo() for expensive components
- Lazy load screens when possible
- Optimize images and assets
- Avoid unnecessary re-renders
- Use FlatList for long lists

