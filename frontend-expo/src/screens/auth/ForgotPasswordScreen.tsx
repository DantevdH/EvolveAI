import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { validateForgotPasswordForm } from '@/src/utils/validation';
import { colors } from '../../constants/colors';

// Custom Text Input Component (matching Swift design)
const CustomTextField: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address';
}> = ({ placeholder, value, onChangeText, keyboardType = 'default' }) => {
  return (
    <View style={styles.textFieldContainer}>
      {value === '' && (
        <Text style={styles.placeholderText}>{placeholder}</Text>
      )}
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

// Main Title Component
const MainTitleView: React.FC = () => {
  return (
    <View style={styles.titleContainer}>
      <Text style={styles.mainTitle}>Evolve</Text>
      <Text style={styles.subtitle}>Reset Your Password</Text>
    </View>
  );
};

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  const { state, resetPassword } = useAuth();

  const handleResetPassword = async () => {
    // Clear previous validation error
    setValidationError(null);
    
    // Validate email format
    const validation = validateForgotPasswordForm(email);
    if (!validation.isValid) {
      setValidationError(validation.errorMessage!);
      return;
    }

    const success = await resetPassword(email);
    if (success) {
      setIsEmailSent(true);
    } else if (state.errorMessage) {
      Alert.alert('Reset Failed', state.errorMessage);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  if (isEmailSent) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
          style={styles.backgroundImage}
          resizeMode="cover">
          
          <View style={styles.dimmingOverlay} />
          
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.successContent}>
              <View style={styles.successSection}>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successMessage}>
                  If an account with the email{'\n'}
                  <Text style={styles.emailText}>{email}</Text>{'\n'}
                  exists, we've sent a password reset link.
                </Text>
                <Text style={styles.instructionsText}>
                  Please check your email and follow the instructions to reset your password.
                  If you don't see the email, check your spam folder.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToLogin}
                activeOpacity={0.8}>
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

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
            
            <View style={styles.content}>
              {/* Main Title */}
              <MainTitleView />
              
              <View style={styles.spacer} />
              
              {/* Form */}
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
                
                {/* Validation Error Message */}
                {validationError && (
                  <Text style={styles.validationErrorText}>{validationError}</Text>
                )}
              </View>
              
              <View style={styles.spacer} />
              
              {/* Reset Button */}
              <View style={styles.resetSection}>
                {state.isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetPassword}
                    activeOpacity={0.8}>
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  </TouchableOpacity>
                )}
                
                {/* Error Message */}
                {state.errorMessage && (
                  <Text style={styles.errorText}>{state.errorMessage}</Text>
                )}
                
                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={handleBackToLogin}
                  activeOpacity={0.8}>
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
              
            </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
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
  
  // Form Section
  formSection: {
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
  
  // Reset Section
  resetSection: {
    gap: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resetButton: {
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
  resetButtonText: {
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
  
  // Back to Login
  backToLoginButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Success Screen
  successContent: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  emailText: {
    fontWeight: '600',
    color: colors.primary,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
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
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
});
