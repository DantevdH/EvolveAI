/**
 * Lazy loading configuration for screens
 * This reduces the initial bundle size by only loading screens when needed
 */

import { lazy } from 'react';

// Auth screens - loaded when user needs authentication
export const LazyLoginScreen = lazy(() => import('./auth/LoginScreen').then(module => ({ default: module.LoginScreen })));
export const LazySignupScreen = lazy(() => import('./auth/SignupScreen').then(module => ({ default: module.SignupScreen })));
export const LazyForgotPasswordScreen = lazy(() => import('./auth/ForgotPasswordScreen').then(module => ({ default: module.ForgotPasswordScreen })));
export const LazyEmailVerificationScreen = lazy(() => import('./auth/EmailVerificationScreen').then(module => ({ default: module.EmailVerificationScreen })));

// Onboarding screens - loaded when user needs to complete onboarding
export const LazyWelcomeScreen = lazy(() => import('./onboarding/WelcomeScreen').then(module => ({ default: module.WelcomeScreen })));
export const LazyExperienceLevelScreen = lazy(() => import('./onboarding/ExperienceLevelScreen').then(module => ({ default: module.ExperienceLevelScreen })));
export const LazyPersonalInfoScreen = lazy(() => import('./onboarding/PersonalInfoScreen').then(module => ({ default: module.PersonalInfoScreen })));
export const LazyFitnessGoalsScreen = lazy(() => import('./onboarding/FitnessGoalsScreen').then(module => ({ default: module.FitnessGoalsScreen })));
export const LazyTimeAvailabilityScreen = lazy(() => import('./onboarding/TimeAvailabilityScreen').then(module => ({ default: module.TimeAvailabilityScreen })));
export const LazyEquipmentAccessScreen = lazy(() => import('./onboarding/EquipmentAccessScreen').then(module => ({ default: module.EquipmentAccessScreen })));
export const LazyPhysicalLimitationsScreen = lazy(() => import('./onboarding/PhysicalLimitationsScreen').then(module => ({ default: module.PhysicalLimitationsScreen })));
export const LazyOnboardingCompleteScreen = lazy(() => import('./onboarding/OnboardingCompleteScreen').then(module => ({ default: module.OnboardingCompleteScreen })));

// Main app screens - loaded when user has completed onboarding
export const LazyHomeScreen = lazy(() => import('./HomeScreen').then(module => ({ default: module.HomeScreen })));
export const LazyWorkoutScreen = lazy(() => import('./WorkoutScreen').then(module => ({ default: module.WorkoutScreen })));
export const LazyProfileScreen = lazy(() => import('./ProfileScreen').then(module => ({ default: module.ProfileScreen })));
export const LazyGeneratePlanScreen = lazy(() => import('./GeneratePlanScreen').then(module => ({ default: module.GeneratePlanScreen })));

// Onboarding flow - loaded when user needs to complete onboarding
export const LazyOnboardingFlow = lazy(() => import('./onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })));
