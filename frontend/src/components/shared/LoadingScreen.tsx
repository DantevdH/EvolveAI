/**
 * Welcome Back Loading Screen Component
 * Beautiful loading screen that matches the app's design system
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SimpleSpinner } from '../ui/SimpleSpinner';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
import { IconSymbol } from '../../../components/ui/IconSymbol';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Welcome back! Getting everything ready for you...'
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern} />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[createColorWithOpacity(colors.primary, 0.4), createColorWithOpacity(colors.primary, 0.35)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeIcon}
          >
            <IconSymbol name="person.fill" size={32} color={colors.text} />
          </LinearGradient>
          <Text style={styles.welcomeTitle}>
            Welcome back!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {message}
          </Text>
        </View>

        {/* Simple Spinner */}
        <View style={styles.spinnerSection}>
          <SimpleSpinner size={60} color={colors.primary} strokeWidth={4} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    // Add subtle gradient overlay
    opacity: 0.1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl * 2,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  welcomeTitle: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSizes.lg,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.fontSizes.lg,
  },
  spinnerSection: {
    marginBottom: spacing.xxxl * 2,
  },
  stepsContainer: {
    width: '100%',
    gap: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  stepText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
    flex: 1,
  },
  stepTextDisabled: {
    color: colors.muted,
  },
});
