import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/src/context/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/src/config/supabase';
import { validateLoginForm } from '@/src/utils/validation';
import { colors } from '../../constants/designSystem';

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
          autoCapitalize="none"
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
            color="#FFFFFF"
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
      <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>
        <Text style={styles.subtitleRegular}>DESTROY EXCUSES, </Text>
        <Text style={styles.subtitleRegular}>EVOLVE </Text>
        <Text style={styles.subtitleAccent}>YOURSELF</Text>
      </Text>
    </View>
  );
};

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  const { state, signInWithEmail, signInWithGoogle, signInWithApple, /* signInWithFacebook */ clearError } = useAuth();

  // Handle email verification from deep link
  useEffect(() => {

    // If we have access_token and refresh_token in the URL, handle email verification
    if (params.access_token && params.refresh_token) {
      handleEmailVerificationFromLink();
    }
  }, [params]);

  const handleEmailVerificationFromLink = async () => {
    try {

      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token as string,
        refresh_token: params.refresh_token as string,
      });

      if (error) {
        console.error('Error setting session from email verification:', error);
        Alert.alert('Error', 'Invalid or expired verification link. Please try again.');
        return;
      }

      if (data.session && data.user) {

        Alert.alert(
          'Email Verified!',
          'Your email has been verified successfully. You can now sign in.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error handling email verification:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleEmailLogin = async () => {
    // Clear previous validation error
    setValidationError(null);
    
    // Validate form
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setValidationError(validation.errorMessage!);
      return;
    }

    // Clear any previous errors before attempting login
    clearError();

    const success = await signInWithEmail(email, password);
    if (!success && state.error) {
      Alert.alert('Login Failed', state.error);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('🔵 Google login button clicked');
    try {
      clearError();
      console.log('🔵 Calling signInWithGoogle...');
      const success = await signInWithGoogle();
      console.log('🔵 signInWithGoogle returned:', success);
      console.log('🔵 Current error state:', state.error);
      if (!success) {
        const errorMessage = state.error || 'Google sign in failed. Please try again.';
        console.error('❌ Google sign in failed:', errorMessage);
        Alert.alert('Google Sign In Failed', errorMessage);
      } else {
        console.log('✅ Google sign in initiated successfully');
      }
    } catch (error) {
      console.error('❌ Error in handleGoogleLogin:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleAppleLogin = async () => {
    // Apple login disabled for now
    // clearError();
    // const success = await signInWithApple();
    // if (!success && state.error) {
    //   Alert.alert('Apple Sign In Failed', state.error);
    // }
    console.log('🍎 Apple login clicked - disabled for now');
  };

  // Facebook login commented out for now
  // const handleFacebookLogin = async () => {
  //   console.log('🔵 Facebook login button clicked');
  //   try {
  //     clearError();
  //     console.log('🔵 Calling signInWithFacebook...');
  //     const success = await signInWithFacebook();
  //     console.log('🔵 signInWithFacebook returned:', success);
  //     console.log('🔵 Current error state:', state.error);
  //     if (!success) {
  //       const errorMessage = state.error || 'Facebook sign in failed. Please try again.';
  //       console.error('❌ Facebook sign in failed:', errorMessage);
  //       Alert.alert('Facebook Sign In Failed', errorMessage);
  //     } else {
  //       console.log('✅ Facebook sign in initiated successfully');
  //     }
  //   } catch (error) {
  //     console.error('❌ Error in handleFacebookLogin:', error);
  //     Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
              
              {/* Social Login Buttons */}
              <View style={styles.socialSection}>
                <SocialLoginButton
                  iconName="apple.logo"
                  text="Sign In with Apple"
                  onPress={handleAppleLogin}
                  disabled={state.isLoading}
                  isSystemIcon={true}
                  testID="apple-signin-button"
                />
                
                <SocialLoginButton
                  imageSource={require('../../../assets/images/google-logo.webp')}
                  text="Sign In with Google"
                  onPress={handleGoogleLogin}
                  disabled={state.isLoading}
                  testID="google-signin-button"
                />
                
                {/* Facebook login commented out for now */}
                {/* <SocialLoginButton
                  iconName="person.2"
                  text="Sign In with Facebook"
                  onPress={handleFacebookLogin}
                  disabled={state.isLoading}
                  testID="facebook-signin-button"
                /> */}
              </View>
              
              {/* Separator */}
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>OR</Text>
                <View style={styles.separatorLine} />
              </View>
              
              {/* Email & Password Fields */}
              <View style={styles.formSection}>
                <CustomTextField
                  placeholder="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (validationError) setValidationError(null);
                  }}
                  keyboardType="email-address"
                  testID="email-input"
                />
                
                <CustomTextField
                  placeholder="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (validationError) setValidationError(null);
                  }}
                  secureTextEntry
                  testID="password-input"
                />
                
                {/* Validation Error Message */}
                {validationError && (
                  <Text style={styles.validationErrorText}>{validationError}</Text>
                )}
              </View>
              
              {/* Forgot Password */}
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={() => router.push('/forgot-password')} testID="forgot-password-button">
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.spacer} />
              
              {/* Login Button */}
              <View style={styles.loginSection}>
                {state.isLoading ? (
                  <View style={styles.loadingContainer} testID="loading-indicator">
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleEmailLogin}
                    activeOpacity={0.8}
                    testID="login-button">
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </TouchableOpacity>
                )}
                
                {/* Error Message */}
                {state.error && (
                  <Text style={styles.errorText}>{state.error}</Text>
                )}
                
                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/signup')} testID="signup-link">
                    <Text style={styles.signUpLink}>Sign Up</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  subtitleAccent: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1.5,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitleRegular: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(147, 35, 34, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#FFFFFF',
    marginLeft: 12,
  },
  socialButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  socialButtonImage: {
    width: 17,
    height: 17,
    maxWidth: 17,
    maxHeight: 17,
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
    backgroundColor: colors.text,
  },
  separatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
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
  
  // Forgot Password
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Login Section
  loginSection: {
    gap: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  
  // Error Text
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Sign Up Section
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  signUpText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signUpLink: {
    fontSize: 16,
    color: '#932322', // Your evolvePrimary color
    fontWeight: '600',
  },
});
