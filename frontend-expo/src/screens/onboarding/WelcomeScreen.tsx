/**
 * Welcome screen - First step of onboarding
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ImageBackground, Alert } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation } from '../../components/onboarding';
import { validateUsername } from '../../utils/onboardingValidation';
import { colors } from '../../constants/colors';

export const WelcomeScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();
  const [username, setUsername] = useState(state.data.username);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setValidationError(null);
    
    // Update context data
    updateData({ username: text });
  };

  const handleNext = () => {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setValidationError(validation.error!);
      return;
    }

    // Username is valid, proceed to next step
    updateData({ username });
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
        <OnboardingCard
          title="Welcome to Evolve"
          subtitle="Let's create your personalized fitness journey"
          scrollable={false}
        >
          <View style={styles.content}>
            {/* Welcome Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Text style={styles.iconText}>💪</Text>
              </View>
            </View>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>What should we call you?</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationError && styles.textInputError
                ]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="Enter your username"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              
              {validationError && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}
              
              {username.length > 0 && username.length < 3 && (
                <Text style={styles.hintText}>
                  Username must be at least 3 characters
                </Text>
              )}
            </View>

            {/* Welcome Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>
                We're excited to help you achieve your fitness goals! 
                This quick setup will help us create a personalized plan just for you.
              </Text>
            </View>
          </View>

          <OnboardingNavigation
            onNext={handleNext}
            nextText="Get Started"
            showProgress={false}
          />
        </OnboardingCard>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryTransparent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryTransparentLight,
  },
  iconText: {
    fontSize: 48,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    textAlign: 'center',
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
  messageContainer: {
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
