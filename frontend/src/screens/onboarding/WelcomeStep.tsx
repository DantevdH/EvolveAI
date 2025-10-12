import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { colors } from '../../constants/designSystem';

interface WelcomeStepProps {
  username: string;
  onUsernameChange: (username: string) => void;
  onNext: () => void;
  isValid: boolean;
  error?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  username,
  onUsernameChange,
  onNext,
  isValid,
  error,
}) => {
  const [localUsername, setLocalUsername] = useState(username);

  const handleUsernameChange = (text: string) => {
    setLocalUsername(text);
    onUsernameChange(text);
  };

  const handleNext = () => {
    if (!isValid) {
      Alert.alert('Error', 'Please enter a valid username (3-20 characters)');
      return;
    }
    onNext();
  };

  return (
    <OnboardingCard
      title="Welcome to EvolveAI"
      subtitle="Your personalized training journey starts here"
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.contentArea}>
          {/* Enhanced Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <IconSymbol name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Ready to evolve yourself?</Text>
            <Text style={styles.welcomeSubtitle}>Transform your training journey with AI-powered personalization</Text>
          </View>
          
          {/* Enhanced Username Section */}
          <View style={styles.usernameContainer}>
            <View style={styles.usernameHeader}>
              <IconSymbol name="person.circle" size={16} color={colors.primary} />
              <Text style={styles.usernameLabel}>Choose your username</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.usernameInput,
                  localUsername.length > 0 && localUsername.length < 3 && styles.usernameInputError
                ]}
                value={localUsername}
                onChangeText={handleUsernameChange}
                placeholder="Enter your username"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                autoFocus={true}
              />
              {localUsername.length >= 3 && (
                <View style={styles.successIcon}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success || colors.primary} />
                </View>
              )}
            </View>
            {localUsername.length > 0 && localUsername.length < 3 && (
              <View style={styles.validationContainer}>
                <IconSymbol name="exclamationmark.triangle" size={10} color={colors.error} />
                <Text style={styles.validationText}>
                  Username must be at least 3 characters
                </Text>
              </View>
            )}
            {localUsername.length >= 3 && (
              <View style={styles.validationContainer}>
                <IconSymbol name="checkmark.circle" size={10} color={colors.success || colors.primary} />
                <Text style={styles.validationTextSuccess}>
                  Username is valid
                </Text>
              </View>
            )}
          </View>
          
          {/* Enhanced Features Section */}
          <View style={styles.featuresContainer}>
            <View style={styles.featuresList}>
               <View style={styles.featureRow}>
                 <View style={styles.featureIconWrapper}>
                   <IconSymbol name="brain.head.profile" size={20} color={colors.primary} />
                 </View>
                 <View style={styles.featureContent}>
                   <Text style={styles.featureTitle}>AI-Powered Plans</Text>
                   <Text style={styles.featureDescription}>Personalized trainings tailored to your goals and preferences</Text>
                 </View>
               </View>
               
               <View style={styles.featureRow}>
                 <View style={styles.featureIconWrapper}>
                   <IconSymbol name="chart.line.uptrend.xyaxis" size={20} color={colors.primary} />
                 </View>
                 <View style={styles.featureContent}>
                   <Text style={styles.featureTitle}>Progress Tracking</Text>
                   <Text style={styles.featureDescription}>Monitor your training journey with detailed analytics and insights</Text>
                 </View>
               </View>
               
               <View style={styles.featureRow}>
                 <View style={styles.featureIconWrapper}>
                   <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={colors.primary} />
                 </View>
                 <View style={styles.featureContent}>
                   <Text style={styles.featureTitle}>Adaptive Training</Text>
                   <Text style={styles.featureDescription}>Plans that evolve with your progress and changing needs</Text>
                 </View>
               </View>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <OnboardingNavigation
          onNext={handleNext}
          nextTitle="Get Started"
          nextDisabled={!isValid}
          showBack={false}
          variant="single"
        />
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  contentArea: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  // Username Section
  usernameContainer: {
    marginBottom: 24,
  },
  usernameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  usernameLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  inputWrapper: {
    position: 'relative',
  },
  usernameInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    paddingRight: 40,
    fontSize: 15,
    color: colors.text,
    marginBottom: 6,
  },
  usernameInputError: {
    borderColor: colors.error,
  },
  successIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationText: {
    fontSize: 11,
    color: colors.error,
    marginLeft: 4,
  },
  validationTextSuccess: {
    fontSize: 11,
    color: colors.success || colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  // Features Section
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  featureIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: colors.text,
    opacity: 0.8,
    lineHeight: 15,
  },
  // Error Section
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground || `${colors.error}15`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 6,
    flex: 1,
  },
});
