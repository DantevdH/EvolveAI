/**
 * Navigation Index - Export all navigation components
 */

export { AuthNavigator } from './AuthNavigator';
export { OnboardingNavigator } from './OnboardingNavigator';
export { MainTabNavigator } from './MainTabNavigator';
export { WorkoutNavigator } from './WorkoutNavigator';
export { AppNavigator } from './AppNavigator';

// Export types
export type { AuthStackParamList } from './AuthNavigator';
export type { OnboardingStackParamList } from './OnboardingNavigator';
export type { MainTabParamList, HomeStackParamList, WorkoutStackParamList, ProfileStackParamList } from './MainTabNavigator';
export type { WorkoutStackParamList as WorkoutNavigatorParamList } from './WorkoutNavigator';
export type { RootStackParamList } from './AppNavigator';
