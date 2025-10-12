import React, { useState, useEffect, memo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/designSystem';

interface AnimatedSpinnerProps {
  coachName?: string;
}

export const AnimatedSpinner: React.FC<AnimatedSpinnerProps> = memo(({ 
  coachName = 'AI Coach' 
}) => {
  const [rotationValue] = useState(new Animated.Value(0));

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

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
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
          <Ionicons 
            name="hardware-chip" 
            size={40} 
            color={colors.text} 
            style={styles.icon}
          />
        </View>
      </View>

      {/* Informational Text */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {coachName} is thinking...
        </Text>
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
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
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
    borderColor: colors.borderLight,
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
  icon: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.fontSizes.md,
  },
});
