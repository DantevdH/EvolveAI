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
import { supabase } from '@/src/config/supabase';
import { colors } from '../src/constants/colors';

// Custom Text Input Component
const CustomTextField: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
}> = ({ placeholder, value, onChangeText, secureTextEntry = false }) => {
  return (
    <View style={styles.textFieldContainer}>
      {value === '' && (
        <Text style={styles.placeholderText}>{placeholder}</Text>
      )}
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const { state, updatePassword } = useAuth();
  const params = useLocalSearchParams();

  // Check if we have the necessary tokens from the URL
  useEffect(() => {
    console.log('Reset password params:', params);
    
    // If we have access_token and refresh_token in the URL, set the session
    if (params.access_token && params.refresh_token) {
      handlePasswordResetFromEmail();
    }
  }, [params]);

  const handlePasswordResetFromEmail = async () => {
    try {
      console.log('Setting session from password reset URL...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token as string,
        refresh_token: params.refresh_token as string,
      });

      if (error) {
        console.error('Error setting session:', error);
        Alert.alert('Error', 'Invalid or expired reset link. Please request a new password reset.');
        router.replace('/forgot-password');
        return;
      }

      if (data.session) {
        console.log('Session set successfully, user can now reset password');
        // The user is now authenticated and can reset their password
      }
    } catch (error) {
      console.error('Error handling password reset:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      router.replace('/forgot-password');
    }
  };

  const handleResetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsResetting(true);

    try {
      const success = await updatePassword(password);
      
      if (success) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully. You can now sign in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', state.errorMessage || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsResetting(false);
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
              
              {/* Header */}
              <View style={styles.headerContainer}>
                <Text style={styles.mainTitle}>Reset Password</Text>
                <Text style={styles.subtitle}>Enter your new password</Text>
              </View>
              
              <View style={styles.spacer} />
              
              {/* Password Fields */}
              <View style={styles.formSection}>
                <CustomTextField
                  placeholder="New Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                
                <CustomTextField
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
              
              <View style={styles.spacer} />
              
              {/* Reset Button */}
              <View style={styles.resetSection}>
                {isResetting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetPassword}
                    activeOpacity={0.8}>
                    <Text style={styles.resetButtonText}>Reset Password</Text>
                  </TouchableOpacity>
                )}
                
                {/* Back to Login */}
                <View style={styles.backToLoginContainer}>
                  <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.backToLoginText}>Back to Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

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
  
  // Header Section
  headerContainer: {
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
  
  // Back to Login
  backToLoginContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  backToLoginText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
});
