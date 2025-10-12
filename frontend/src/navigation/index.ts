/**
 * Navigation Index - Export all navigation components
 */

export { AuthNavigator } from './AuthNavigator';
export { OnboardingNavigator } from './OnboardingNavigator';
export { TrainingNavigator } from './TrainingNavigator';
export { AppNavigator } from './AppNavigator';

// Export types
export type { AuthStackParamList } from './AuthNavigator';
export type { OnboardingStackParamList } from './OnboardingNavigator';
export type { TrainingStackParamList as TrainingNavigatorParamList } from './TrainingNavigator';
export type { RootStackParamList } from './AppNavigator';
