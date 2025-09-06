import React, { useState, useEffect } from 'react';
import { , ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';;
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors } from '../../constants/designSystem';


export const EmailVerificationScreen: React.FC = () => {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const params = useLocalSearchParams();

  const { state, resendVerificationEmail } = useAuth();

  const user = state.user;
  const email = params.email as string || user?.email;

  useEffect(() => {
    // Start cooldown timer when component mounts
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);



  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !email) return;

    setIsResending(true);
    try {
      const success = await resendVerificationEmail(email);
      
      if (success) {
        Alert.alert(
          'Email Sent',
          'A new verification email has been sent to your email address.',
          [{ text: 'OK' }]
        );
        
        // Reset cooldown
        setResendCooldown(20);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Alert.alert('Error', state.error || 'Failed to resend verification email. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };



  const handleBackToLogin = () => {
    // Navigate back to login screen
    router.replace('/login');
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
              
              {/* Header with Checkmark */}
              <View style={styles.headerContainer}>
                <View style={styles.checkmarkContainer}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={80}
                    color="#932322"
                  />
                </View>
                <Text style={styles.mainTitle}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                  We've sent a verification email to:
                </Text>
                <Text style={styles.emailText}>
                  {email || 'your email address'}
                </Text>
              </View>
              
              <View style={styles.spacer} />
              
              {/* Instructions */}
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsTitle}>What's next?</Text>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>1</Text>
                  <Text style={styles.instructionText}>
                    Check your email inbox (and spam folder)
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>2</Text>
                  <Text style={styles.instructionText}>
                    Click the verification link in the email
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>3</Text>
                  <Text style={styles.instructionText}>
                    Return to the app and continue
                  </Text>
                </View>
              </View>
              
              <View style={styles.spacer} />
              
              {/* Actions */}
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={[styles.resendButton, (resendCooldown > 0 || isResending) && styles.resendButtonDisabled]}
                  onPress={handleResendEmail}
                  disabled={resendCooldown > 0 || isResending}
                  activeOpacity={0.8}>
                  {isResending ? (
                    <ActivityIndicator size="small" color="#932322" />
                  ) : (
                    <Text style={[styles.resendButtonText, (resendCooldown > 0 || isResending) && styles.resendButtonTextDisabled]}>
                      {resendCooldown > 0
                        ? `Resend Email (${resendCooldown}s)`
                        : 'Resend Verification Email'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToLogin}
                  activeOpacity={0.8}>
                  <Text style={styles.backButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
              
              {/* Help Text */}
              <View style={styles.helpSection}>
                <Text style={styles.helpText}>
                  Didn't receive the email? Check your spam folder or try resending.
                  Make sure you entered the correct email address.
                </Text>
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
  
  // Header Section
  headerContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  checkmarkContainer: {
    marginBottom: 20,
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
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#932322',
    textAlign: 'center',
  },
  
  // Spacing
  spacer: {
    flex: 1,
  },
  
  // Instructions Section
  instructionsSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    width: 300,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    flexShrink: 0,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'left',
  },
  
  // Actions Section
  actionsSection: {
    gap: 15,
    paddingBottom: 40,
  },
  resendButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resendButtonTextDisabled: {
    color: colors.muted,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Help Section
  helpSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  helpText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
