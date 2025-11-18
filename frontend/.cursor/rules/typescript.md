# TypeScript Frontend Rules

## Code Style
- Use TypeScript for all new files
- Use proper TypeScript types, avoid `any`
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use strict TypeScript settings
- Enable all strict type checking options

## React Native Best Practices
- Prefer functional components with hooks
- Use React hooks for state management
- Follow React best practices for component structure
- Use proper TypeScript types for props and state
- Avoid inline styles when possible - use StyleSheet

## Component Structure
- Components in `src/components/`
- Screens in `src/screens/`
- Services in `src/services/`
- Hooks in `src/hooks/`
- Types in `src/types/`

## Testability & Separation of Concerns
- **Extract business logic from screens/components** - Screens should be thin and focus on UI/presentation
- **Separate pure functions** - Business logic should be in separate functions/modules that can be tested independently
- **Use custom hooks** - Extract complex state logic and side effects into custom hooks (e.g., `useTraining`, `useAuth`)
- **Use service layer** - API calls and data transformations should be in service files (e.g., `onboardingService`, `trainingService`)
- **Keep screens simple** - Screens should primarily compose hooks, services, and UI components
- **Pure functions for calculations** - Extract calculations, validations, and transformations into pure functions that can be unit tested
- **Example pattern**: Screen → Hook → Service → API, where each layer is testable independently

## Expo/React Native Specific
- Use Expo Router for navigation
- Follow Expo best practices
- Use platform-specific code when needed (`.ios.tsx`, `.android.tsx`)
- Handle platform differences gracefully

## Error Handling
- Always handle errors gracefully
- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors appropriately (don't log sensitive data)

