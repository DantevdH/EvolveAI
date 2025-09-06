/**
 * Welcome screen - First step of onboarding
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';;
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingBackground } from '../../components/onboarding';
import { validateUsername } from '../../utils/onboardingValidation';
import { colors } from '../../constants/designSystem';

export const WelcomeScreen: React.FC = () => {
  const { state, updateData, nextStep } = useOnboarding();
  const [username, setUsername] = useState(state.data.username);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setValidationError(null);
    
    // Update context data
    updateData({ username: text });
  };

  const handleNext = () => {
    // Validate username (5+ characters like Swift version)
    if (username.trim().length < 5) {
      setValidationError('Username must be at least 5 characters');
      return;
    }

    // Username is valid, update data and proceed to next step
    updateData({ username });
    nextStep();
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      
      <View style={styles.cardContainer}>
          {/* Top section with icon and input */}
          <View style={styles.topSection}>
            {/* Modern fitness/AI icon and tagline */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="barbell" size={44} color="white" style={styles.dumbbellIcon} />
              </View>
              {/* Tagline */}
              <Text style={styles.tagline} testID="welcome-subtitle">Science Based. Improved Results.</Text>
            </View>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>What should we call you?</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.textInput,
                    validationError && styles.textInputError
                  ]}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="Your username"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={20}
                  testID="username-input"
                />
              </View>
              
              {validationError && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}
              
              {username.length > 0 && username.length < 5 && (
                <Text style={styles.hintText}>
                  Username must be at least 5 characters
                </Text>
              )}
            </View>
          </View>

          {/* Bottom section with button aligned to navigation */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[
                styles.startButton,
                (username.trim().length < 5 || validationError) && styles.startButtonDisabled
              ]}
              onPress={handleNext}
              disabled={username.trim().length < 5 || !!validationError}
              activeOpacity={0.8}
              testID="next-button"
            >
              <Text style={[
                styles.startButtonText,
                (username.trim().length < 5 || validationError) && styles.startButtonTextDisabled
              ]}>
                Start
              </Text>
            </TouchableOpacity>
          </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  bottomSection: {
    width: '100%',
    paddingVertical: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTransparent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryTransparentLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  dumbbellIcon: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },

  tagline: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 18,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 20,
    color: 'white',
    paddingVertical: 10,
    textAlign: 'left',
  },
  textInputError: {
    borderColor: colors.error,
    backgroundColor: colors.primaryTransparentLight,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  startButtonTextDisabled: {
    color: colors.muted,
  },
});
