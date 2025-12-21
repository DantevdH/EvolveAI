import React, { useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/src/context/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { validateSignupForm } from '@/src/utils/validation';
import { IS_LOCAL_DEV } from '@/src/config/env';
import { colors, secondary, createColorWithOpacity } from '../../constants/colors';

// Complete auth session if needed (recommended by Expo)
WebBrowser.maybeCompleteAuthSession();

// Custom Text Input Component (matching Swift design)
const CustomTextField: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  testID?: string;
}> = ({ placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default', testID }) => {
  return (
    <View style={styles.textFieldContainer}>
      {value === '' && (
        <Text style={styles.placeholderText}>{placeholder}</Text>
      )}
      {secureTextEntry ? (
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          testID={testID}
        />
      ) : (
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          testID={testID}
        />
      )}
    </View>
  );
};

// Social Login Button Component (matching Swift design)
const SocialLoginButton: React.FC<{
  iconName?: string;
  imageSource?: any;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  isSystemIcon?: boolean;
  testID?: string;
}> = ({ iconName, imageSource, text, onPress, disabled = false, isSystemIcon = false, testID }) => {
  return (
    <TouchableOpacity
      style={[styles.socialButton, disabled && styles.socialButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      testID={testID}>
      <View style={styles.socialButtonContent}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.socialButtonImage}
            resizeMode="cover"
          />
        ) : (
        <IconSymbol
          name={iconName as any}
          size={20}
          color={secondary}
        />
        )}
        <Text style={[styles.socialButtonText, disabled && styles.socialButtonTextDisabled]}>
          {text}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Main Title Component
const MainTitleView: React.FC = () => {
  return (
    <View style={styles.titleContainer}>
      <Text style={styles.mainTitle}>Evolve</Text>
      <Text style={styles.subtitle}></Text>
    </View>
  );
};

export const SignupScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  const { state, signUpWithEmail, signInWithGoogle, signInWithApple, /* signInWithFacebook */ } = useAuth();

  // Clear validation error when user starts typing
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (validationError) setValidationError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (validationError) setValidationError(null);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (validationError) setValidationError(null);
  };

  const handleEmailSignup = async () => {
    console.log('🔵 [Signup] Create Account button clicked');
    
    // Clear previous validation error
    setValidationError(null);
    
    console.log('🔵 [Signup] Validating form...');
    // Validate form with comprehensive checks
    const validation = validateSignupForm(email, password, confirmPassword);
    if (!validation.isValid) {
      console.log('❌ [Signup] Validation failed:', validation.errorMessage);
      setValidationError(validation.errorMessage!);
      return;
    }

    console.log('✅ [Signup] Validation passed, calling signUpWithEmail...');
    console.log('🔵 [Signup] Email:', email);
    console.log('🔵 [Signup] Loading state:', state.isLoading);
    
    try {
      const success = await signUpWithEmail(email, password, email.split('@')[0]); // Use email prefix as name
      console.log('🔵 [Signup] signUpWithEmail returned:', success);
      console.log('🔵 [Signup] Error state:', state.error);
      
      if (success) {
        console.log('✅ [Signup] Signup successful, navigating to email verification...');
        // Navigate to email verification screen with the email address
        router.push({
          pathname: '/email-verification',
          params: { email: email }
        });
      } else {
        console.log('❌ [Signup] Signup failed');
        if (state.error) {
          console.log('❌ [Signup] Error:', state.error);
          Alert.alert('Sign Up Failed', state.error);
        } else {
          Alert.alert('Sign Up Failed', 'An error occurred. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ [Signup] Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleGoogleSignup = async () => {
    const success = await signInWithGoogle();
    if (!success && state.error) {
      Alert.alert('Google Sign Up Failed', state.error);
    }
  };

  const handleAppleSignup = async () => {
    // Apple signup disabled for now
    // const success = await signInWithApple();
    // if (!success && state.error) {
    //   Alert.alert('Apple Sign Up Failed', state.error);
    // }
    console.log('🍎 Apple signup clicked - disabled for now');
  };

  // Facebook signup commented out for now
  // const handleFacebookSignup = async () => {
  //   const success = await signInWithFacebook();
  //   if (!success && state.error) {
  //     Alert.alert('Facebook Sign Up Failed', state.error);
  //   }
  // };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <ImageBackground
        source={require('../../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover">
        
        {/* Dimming Overlay */}
        <View style={styles.dimmingOverlay} />
        
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}>
            
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              
              {/* Main Title */}
              <MainTitleView />
              
              <View style={styles.spacer} />
              
              {/* Social Signup Buttons - Hidden in local dev */}
              {!IS_LOCAL_DEV && (
                <>
                  <View style={styles.socialSection}>
                    <SocialLoginButton
                      iconName="apple.logo"
                      text="Sign Up with Apple"
                      onPress={handleAppleSignup}
                      disabled={state.isLoading}
                      isSystemIcon={true}
                      testID="apple-signup-button"
                    />
                    
                    <SocialLoginButton
                      imageSource={require('../../../assets/images/google-logo.webp')}
                      text="Sign Up with Google"
                      onPress={handleGoogleSignup}
                      disabled={state.isLoading}
                      testID="google-signup-button"
                    />
                    
                    {/* Facebook signup commented out for now */}
                    {/* <SocialLoginButton
                      iconName="person.2"
                      text="Sign Up with Facebook"
                      onPress={handleFacebookSignup}
                      disabled={state.isLoading}
                      testID="facebook-signup-button"
                    /> */}
                  </View>
                  
                  {/* Separator */}
                  <View style={styles.separator}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>OR</Text>
                    <View style={styles.separatorLine} />
                  </View>
                </>
              )}
              
              {/* Local Dev Info */}
              {IS_LOCAL_DEV && (
                <View style={styles.devNoteContainer}>
                  <Text style={styles.devNoteText}>
                    💡 Local dev: Use dev@test.com / testpass123 to login
                  </Text>
                </View>
              )}
              
              {/* Signup Form */}
              <View style={styles.formSection}>
                <CustomTextField
                  placeholder="Email"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  testID="email-input"
                />
                
                <CustomTextField
                  placeholder="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                  testID="password-input"
                />
                
                <CustomTextField
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry
                  testID="confirm-password-input"
                />
                
                {/* Validation Error Message */}
                {validationError && (
                  <Text style={styles.validationErrorText}>{validationError}</Text>
                )}
              </View>
              
              <View style={styles.spacer} />
              
              {/* Signup Button */}
              <View style={styles.signupSection}>
                {state.isLoading ? (
                  <View style={styles.loadingContainer} testID="loading-indicator">
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={handleEmailSignup}
                    disabled={state.isLoading}
                    activeOpacity={0.85}
                    testID="signup-button">
                    <LinearGradient
                      colors={[createColorWithOpacity(secondary, 0.55), createColorWithOpacity(secondary, 0.25)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientButton}>
                      <Text style={styles.signupButtonText}>Create Account</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                
                {/* Error Message */}
                {state.error && (
                  <Text style={styles.errorText}>{state.error}</Text>
                )}
                
                {/* Terms and Privacy */}
                <View style={styles.termsSection}>
                  <Text style={styles.termsText}>
                    By creating an account, you agree to our{' '}
                    <Text style={styles.linkText}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                  </Text>
                </View>
                
                {/* Sign In Link */}
                <View style={styles.signInContainer}>
                  <Text style={styles.signInText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/login')} testID="login-link">
                    <Text style={styles.signInLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
    backgroundColor: 'rgba(248, 248, 248, 0.85)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
  },
  
  // Title Section
  titleContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  
  // Spacing
  spacer: {
    flex: 1,
  },
  
  // Social Login Section
  socialSection: {
    gap: 15,
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  socialButtonTextDisabled: {
    color: colors.muted,
  },
  socialButtonImage: {
    width: 10,
    height: 10,
    maxWidth: 10,
    maxHeight: 10,
  },
  
  // Separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.muted,
    marginHorizontal: 16,
  },
  
  // Form Section
  formSection: {
    gap: 15,
    marginBottom: 20,
  },
  textFieldContainer: {
    position: 'relative',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  placeholderText: {
    position: 'absolute',
    left: 16,
    top: 16,
    fontSize: 16,
    color: colors.inputPlaceholder,
    zIndex: 1,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    padding: 0,
    minHeight: 20,
  },
  validationErrorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  
  // Signup Section
  signupSection: {
    gap: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  signupButton: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 48,
  },
  gradientButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: createColorWithOpacity(secondary, 0.45),
  },
  signupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  
  // Error Text
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Terms Section
  termsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Sign In Section
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  signInText: {
    fontSize: 16,
    color: colors.muted,
  },
  signInLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Local Dev Note
  devNoteContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devNoteText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
});
