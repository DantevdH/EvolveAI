import React, { useState, useEffect, useRef, memo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

interface AnimatedSpinnerProps {
  coachName?: string;
}

export const AnimatedSpinner: React.FC<AnimatedSpinnerProps> = memo(({ 
  coachName = 'AI Coach' 
}) => {
  const [rotationValue] = useState(new Animated.Value(0));
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

    // Pulse animation for icon container
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Glow animation
    const startGlow = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startRotation();
    startPulse();
    startGlow();
  }, [rotationValue, pulseAnim, glowAnim]);

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Animated Spinner with Gamification */}
      <View style={styles.spinnerContainer}>
        {/* Outer Glow Ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowOpacity,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        
        {/* Animated Spinner Track */}
        <Animated.View
          style={[
            styles.spinner,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <View style={styles.spinnerTrack} />
          <View style={styles.spinnerFillGradient} />
        </Animated.View>
        
        {/* Central Icon with Gradient Background */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[createColorWithOpacity(colors.primary, 0.4), createColorWithOpacity(colors.primary, 0.35)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons 
              name="sparkles" 
              size={36} 
              color={colors.text} 
            />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Informational Text - Gamified */}
      <View style={styles.textContainer}>
        <LinearGradient
          colors={[createColorWithOpacity(colors.primary, 0.2), createColorWithOpacity(colors.primary, 0.15)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.titleBadge}
        >
          <Text style={styles.title}>
            {coachName} is thinking...
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    position: 'relative',
  },
  glowRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    position: 'absolute',
    backgroundColor: createColorWithOpacity(colors.primary, 0.2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  spinner: {
    width: 200,
    height: 200,
    position: 'absolute',
  },
  spinnerTrack: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 12,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spinnerFillGradient: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 12,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    borderRightColor: colors.tertiary,
    borderBottomColor: colors.secondary,
    borderLeftColor: createColorWithOpacity(colors.text, 0.1),
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: createColorWithOpacity(colors.primary, 0.5),
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  titleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.primary, 0.3),
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.fontSizes.md,
  },
});
