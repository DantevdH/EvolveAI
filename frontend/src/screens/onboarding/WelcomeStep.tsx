import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, useWindowDimensions, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
import { IconSymbol } from '../../../components/ui/IconSymbol';

interface WelcomeStepProps {
  username: string;
  onUsernameChange: (username: string) => void;
  gender?: 'male' | 'female' | 'other';
  onGenderChange?: (gender: 'male' | 'female' | 'other') => void;
  onNext: () => void;
  isValid: boolean;
  error?: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  username,
  onUsernameChange,
  gender,
  onGenderChange,
  onNext,
  isValid,
  error,
}) => {
  const [localUsername, setLocalUsername] = useState(username);
  const [localGender, setLocalGender] = useState<'male' | 'female' | 'other'>(gender || 'male');
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const handleUsernameChange = (text: string) => {
    setLocalUsername(text);
    onUsernameChange(text);
  };

  const handleGenderChange = (selectedGender: 'male' | 'female' | 'other') => {
    setLocalGender(selectedGender);
    onGenderChange?.(selectedGender);
  };

  const handleNext = () => {
    if (!isValid) {
      Alert.alert('Error', 'Please enter a valid username (3-20 characters)');
      return;
    }
    onNext();
  };

  // Dynamic spacing and sizing based on screen size
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 650;
  const sectionSpacing = isVerySmallScreen ? 8 : isSmallScreen ? 10 : 12; // Reduced spacing
  const cardPadding = screenWidth < 375 ? 16 : 20;
  
  // Dynamic font sizes - Reduced icon size significantly
  const heroIconSize = isVerySmallScreen ? 16 : isSmallScreen ? 18 : 20; // Much smaller icon
  const heroTitleSize = isVerySmallScreen ? 18 : isSmallScreen ? 20 : 22;
  const heroSubtitleSize = isVerySmallScreen ? 12 : 14;
  const featureCardPadding = isVerySmallScreen ? 8 : 10;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingCard
        title="Ready to evolve yourself?"
        subtitle="Your personalized training journey starts here"
        scrollable={false}
      >
        <View style={styles.flexContainer}>
          {/* Content Area - Takes available space */}
          <View style={[styles.contentArea, { paddingHorizontal: cardPadding, paddingBottom: 100, paddingTop: 4 }]}>
            {/* Gamified Hero Section - Compact */}
            <View style={[styles.heroSection, { marginBottom: sectionSpacing - 4 }]}>
              <LinearGradient
                colors={[createColorWithOpacity(colors.primary, 0.4), createColorWithOpacity(colors.primary, 0.35)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.iconContainer, { width: heroIconSize + 16, height: heroIconSize + 16, borderRadius: (heroIconSize + 16) / 2 }]}
              >
                <Ionicons name="sparkles" size={heroIconSize} color={colors.text} />
              </LinearGradient>
            </View>
            
            {/* Gender Section - Above username */}
            {onGenderChange && (
              <View style={[styles.genderSection, { marginBottom: sectionSpacing }]}>
                <View style={styles.genderHeader}>
                  <LinearGradient
                    colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.genderHeaderBadge}
                  >
                    <Ionicons name="person-circle" size={14} color={colors.text} />
                    <Text style={styles.genderLabel}>Gender</Text>
                  </LinearGradient>
                </View>
                <View style={styles.genderOptions}>
                  <TouchableOpacity
                    style={styles.genderOptionContainer}
                    onPress={() => handleGenderChange('male')}
                    activeOpacity={0.7}
                  >
                    {localGender === 'male' ? (
                      <LinearGradient
                        colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.genderOptionGradient}
                      >
                        <IconSymbol name="person.fill" size={14} color={colors.text} />
                        <Text style={styles.genderOptionTextActive}>Male</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.genderOption}>
                        <IconSymbol name="person.fill" size={14} color={colors.muted} />
                        <Text style={styles.genderOptionText}>Male</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.genderOptionContainer}
                    onPress={() => handleGenderChange('female')}
                    activeOpacity={0.7}
                  >
                    {localGender === 'female' ? (
                      <LinearGradient
                        colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.genderOptionGradient}
                      >
                        <IconSymbol name="person.fill" size={14} color={colors.text} />
                        <Text style={styles.genderOptionTextActive}>Female</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.genderOption}>
                        <IconSymbol name="person.fill" size={14} color={colors.muted} />
                        <Text style={styles.genderOptionText}>Female</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.genderOptionContainer}
                    onPress={() => handleGenderChange('other')}
                    activeOpacity={0.7}
                  >
                    {localGender === 'other' ? (
                      <LinearGradient
                        colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.genderOptionGradient}
                      >
                        <IconSymbol name="person.2.fill" size={14} color={colors.text} />
                        <Text style={styles.genderOptionTextActive}>Other</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.genderOption}>
                        <IconSymbol name="person.2.fill" size={14} color={colors.muted} />
                        <Text style={styles.genderOptionText}>Other</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Gamified Username Section */}
            <View style={[styles.usernameContainer, { marginBottom: sectionSpacing }]}>
              <View style={styles.usernameHeader}>
                <LinearGradient
                  colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.usernameHeaderBadge}
                >
                  <Ionicons name="person-circle" size={14} color={colors.text} />
                  <Text style={styles.usernameLabel}>Choose your username</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.usernameInput,
                    localUsername.length > 0 && localUsername.length < 3 && styles.usernameInputError,
                    localUsername.length >= 3 && styles.usernameInputSuccess
                  ]}
                  value={localUsername}
                  onChangeText={handleUsernameChange}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.inputPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  autoFocus={true}
                />
                {localUsername.length >= 3 && (
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.tertiary} />
                  </View>
                )}
              </View>
              
              {/* Validation container with fixed height to prevent layout shift */}
              <View style={styles.validationWrapper}>
                {localUsername.length > 0 && localUsername.length < 3 && (
                  <View style={styles.validationContainer}>
                    <Ionicons name="alert-circle" size={10} color={colors.primary} />
                    <Text style={styles.validationText}>
                      Username must be at least 3 characters
                    </Text>
                  </View>
                )}
                {localUsername.length >= 3 && (
                  <View style={styles.validationContainer}>
                    <Ionicons name="checkmark-circle" size={10} color={colors.tertiary} />
                    <Text style={styles.validationTextSuccess}>
                      Username is valid
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Gamified Features Section - Compact */}
            <View style={[styles.featuresContainer, { marginTop: 4, marginBottom: 0 }]}>
              <View style={styles.featuresList}>
                <FeatureCard
                  icon="barbell"
                  title="Strength Training Programs"
                  description="Complete workout plans with exercises, sets, reps, and progressions"
                  color={colors.primary}
                  compact={isVerySmallScreen}
                  padding={featureCardPadding}
                />
                
                <FeatureCard
                  icon="fitness"
                  title="Endurance Training"
                  description="Running, cycling, swimming, and cardio plans tailored to your goals"
                  color={colors.tertiary}
                  compact={isVerySmallScreen}
                  padding={featureCardPadding}
                />
                
                <FeatureCard
                  icon="trophy"
                  title="Sport Athlete Support"
                  description="Supplemental strength & conditioning that fits around your practice schedule"
                  color={colors.secondary}
                  compact={isVerySmallScreen}
                  padding={featureCardPadding}
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

        </View>
        
        {/* Get Started Button - Absolutely positioned at bottom, fully transparent */}
        <View style={styles.buttonContainer}>
          <OnboardingNavigation
            onNext={handleNext}
            nextTitle="Get Started"
            nextDisabled={!isValid}
            showBack={false}
            variant="single"
          />
        </View>
      </OnboardingCard>
    </KeyboardAvoidingView>
  );
};

// Reusable Feature Card Component
interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  compact?: boolean;
  padding?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color, compact = false, padding = 10 }) => {
  return (
    <View style={styles.featureCard}>
      <LinearGradient
        colors={[createColorWithOpacity(color, 0.3), createColorWithOpacity(color, 0.2)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.featureGradient, { padding }]}
      >
        <View style={[styles.featureIconWrapper, compact && styles.featureIconWrapperCompact]}>
          <Ionicons name={icon} size={compact ? 14 : 16} color={color} />
        </View>
        <View style={styles.featureContent}>
          <Text style={[styles.featureTitle, compact && styles.featureTitleCompact]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.featureDescription, compact && styles.featureDescriptionCompact]} numberOfLines={2}>{description}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
    minHeight: 0, // Important for flex children to shrink
  },
  contentArea: {
    flex: 1,
    paddingVertical: 8, // Reduced from 12
    justifyContent: 'flex-start',
    minHeight: 0, // Allows flex shrinking
  },
  // Hero Section - Gamified and Compact
  heroSection: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0, // Removed bottom margin
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  welcomeTitle: {
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  // Username Section - Gamified
  usernameContainer: {
    marginBottom: 0, // Will be set dynamically
  },
  usernameHeader: {
    marginBottom: 12,
  },
  usernameHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  usernameLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  usernameInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    padding: 16,
    paddingRight: 48,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  usernameInputError: {
    borderColor: colors.primary, // Match Strength Training Programs color
    backgroundColor: createColorWithOpacity(colors.primary, 0.2), // Match feature card opacity
  },
  usernameInputSuccess: {
    borderColor: colors.tertiary, // Match Endurance Training color
    backgroundColor: createColorWithOpacity(colors.tertiary, 0.2), // Match feature card opacity
  },
  successIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  validationWrapper: {
    minHeight: 20, // Fixed height to prevent layout shift
    marginTop: 4,
    justifyContent: 'center',
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validationText: {
    fontSize: 11,
    color: colors.primary, // Match Strength Training Programs color
    fontWeight: '500',
  },
  validationTextSuccess: {
    fontSize: 11,
    color: colors.tertiary, // Match Endurance Training color
    fontWeight: '600',
  },
  // Features Section - Gamified Cards (Compact)
  featuresContainer: {
    flexShrink: 1, // Can shrink if needed
    marginTop: 8, // Reduced spacing
    marginBottom: 12, // Reduced spacing
    justifyContent: 'center',
    minHeight: 0, // Allows flex shrinking
    maxHeight: 200, // Constrain maximum height to ensure button is visible
  },
  featuresList: {
    gap: 6, // Reduced gap between cards
    justifyContent: 'center',
  },
  featureCard: {
    borderRadius: 10, // Smaller radius
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  featureGradient: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically center icons
    gap: 10, // Reduced gap
  },
  featureIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: createColorWithOpacity(colors.text, 0.08), // Lighter background
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.text, 0.12), // Lighter border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Softer shadow
    shadowRadius: 2,
    elevation: 1, // Lower elevation
    flexShrink: 0, // Don't shrink icon
  },
  featureIconWrapperCompact: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  featureContent: {
    flex: 1,
    paddingTop: 0, // No top padding
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  featureTitleCompact: {
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 15,
  },
  featureDescription: {
    fontSize: 10,
    color: colors.muted,
    lineHeight: 14,
    fontWeight: '400',
  },
  featureDescriptionCompact: {
    fontSize: 9,
    lineHeight: 13,
  },
  // Error Section
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.error, 0.15),
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.error, 0.3),
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
    fontWeight: '500',
  },
  // Button Container - Absolutely positioned at bottom, matching navigation buttons height
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20, // Match OnboardingNavigation marginTop
    paddingBottom: 0, // Match OnboardingNavigation marginBottom
    zIndex: 10, // Ensure it's on top
    backgroundColor: 'transparent', // Fully transparent
  },
  // Gender Section - Gamified with consistent sizing
  genderSection: {
    marginBottom: 0, // Will be set dynamically
  },
  genderHeader: {
    marginBottom: 12,
  },
  genderHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOptionContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 70, // Fixed minimum height for consistency
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 70, // Match container height
  },
  genderOptionGradient: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 70, // Match container height
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  genderOptionTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
});

