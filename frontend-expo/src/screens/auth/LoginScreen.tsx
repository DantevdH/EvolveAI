import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/src/config/supabase';
import { validateLoginForm } from '@/src/utils/validation';
import { colors } from '../../constants/colors';

// Custom Text Input Component (matching Swift design)
const CustomTextField: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}> = ({ placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default' }) => {
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
        />
      ) : (
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
    </View>
  );
};

// Social Login Button Component (matching Swift design)
const SocialLoginButton: React.FC<{
  iconName: string;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  isSystemIcon?: boolean;
}> = ({ iconName, text, onPress, disabled = false, isSystemIcon = false }) => {
  return (
    <TouchableOpacity
      style={[styles.socialButton, disabled && styles.socialButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}>
      <View style={styles.socialButtonContent}>
        <IconSymbol
          name={iconName as any}
          size={20}
          color="#FFFFFF"
        />
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
      <Text style={styles.subtitle}>Your Personal Fitness Journey</Text>
    </View>
  );
};

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  const { state, signInWithEmail, signInWithGoogle, signInWithApple, signInWithFacebook, clearError } = useAuth();

  // Handle email verification from deep link
  useEffect(() => {
    console.log('Login screen params:', params);
    
    // If we have access_token and refresh_token in the URL, handle email verification
    if (params.access_token && params.refresh_token) {
      handleEmailVerificationFromLink();
    }
  }, [params]);

  const handleEmailVerificationFromLink = async () => {
    try {
      console.log('Handling email verification from login screen...');
      
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
        console.log('Email verified successfully!');
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
    if (!success && state.errorMessage) {
      Alert.alert('Login Failed', state.errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    const success = await signInWithGoogle();
    if (!success && state.errorMessage) {
      Alert.alert('Google Sign In Failed', state.errorMessage);
    }
  };

  const handleAppleLogin = async () => {
    clearError();
    const success = await signInWithApple();
    if (!success && state.errorMessage) {
      Alert.alert('Apple Sign In Failed', state.errorMessage);
    }
  };

  const handleFacebookLogin = async () => {
    clearError();
    const success = await signInWithFacebook();
    if (!success && state.errorMessage) {
      Alert.alert('Facebook Sign In Failed', state.errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
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
                  text="Sign In with Apple (Coming Soon)"
                  onPress={handleAppleLogin}
                  disabled={true}
                  isSystemIcon={true}
                />
                
                <SocialLoginButton
                  iconName="globe"
                  text="Sign In with Google"
                  onPress={handleGoogleLogin}
                />
                
                <SocialLoginButton
                  iconName="person.2"
                  text="Sign In with Facebook"
                  onPress={handleFacebookLogin}
                />
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
                />
                
                <CustomTextField
                  placeholder="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (validationError) setValidationError(null);
                  }}
                  secureTextEntry
                />
                
                {/* Validation Error Message */}
                {validationError && (
                  <Text style={styles.validationErrorText}>{validationError}</Text>
                )}
              </View>
              
              {/* Forgot Password */}
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.spacer} />
              
              {/* Login Button */}
              <View style={styles.loginSection}>
                {state.isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleEmailLogin}
                    activeOpacity={0.8}>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </TouchableOpacity>
                )}
                
                {/* Error Message */}
                {state.errorMessage && (
                  <Text style={styles.errorText}>{state.errorMessage}</Text>
                )}
                
                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/signup')}>
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
