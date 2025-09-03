/**
 * Generate Plan Screen - Shows loading animation while AI generates workout plan
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';

export const GeneratePlanScreen: React.FC = () => {
  const { state, generateWorkoutPlan } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [rotationValue] = useState(new Animated.Value(0));
  const router = useRouter();

  useEffect(() => {
    // Start the rotation animation
    const startRotation = () => {
      rotationValue.setValue(0);
      Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    };

    startRotation();
  }, [rotationValue]);

  useEffect(() => {
    // Auto-start generation when screen loads
    if (state.userProfile && !state.workoutPlan && !isGenerating) {
      handleGeneratePlan();
    }
  }, [state.userProfile, state.workoutPlan, isGenerating]);

  useEffect(() => {
    // Navigate to main app when workout plan is generated
    if (state.workoutPlan) {
      router.replace('/(tabs)');
    }
  }, [state.workoutPlan, router]);

  const handleGeneratePlan = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    
    try {
      const success = await generateWorkoutPlan();
      
      if (!success) {
        Alert.alert(
          'Generation Failed',
          'We couldn\'t create your plan. Please check your connection and try again.',
          [
            {
              text: 'Retry',
              onPress: () => handleGeneratePlan(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Plan generation error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const coachName = state.userProfile?.primaryGoal || 'AI Coach';

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
        <View style={styles.content}>
          {/* Animated Spinner */}
          <View style={styles.spinnerContainer}>
            <Animated.View
              style={[
                styles.spinner,
                {
                  transform: [{ rotate: rotation }],
                },
              ]}
            >
              <View style={styles.spinnerTrack} />
              <View style={styles.spinnerFill} />
            </Animated.View>
            
            {/* Central Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🧠</Text>
            </View>
          </View>

          {/* Informational Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {coachName} is thinking...
            </Text>
            
            <Text style={styles.subtitle}>
              This might take a few moments. Feel free to close the app, we'll notify you when it's ready.
            </Text>
          </View>

          {/* Loading Indicator */}
          {isGenerating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={styles.loadingText}>Generating your plan...</Text>
            </View>
          )}
        </View>
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
    paddingHorizontal: 40,
  },
  spinnerContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  spinner: {
    width: 180,
    height: 180,
    position: 'absolute',
  },
  spinnerTrack: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 10,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'absolute',
  },
  spinnerFill: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 10,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    position: 'absolute',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTransparent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconText: {
    fontSize: 40,
    color: colors.text,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
});

