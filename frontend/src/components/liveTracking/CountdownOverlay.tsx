/**
 * CountdownOverlay - 3-second countdown before tracking starts
 *
 * Full-screen overlay with animated countdown number.
 * Gives user time to prepare before tracking begins.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/designSystem';

interface CountdownOverlayProps {
  seconds: number;
  sportType: string;
  onCancel: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  seconds,
  sportType,
  onCancel,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset and animate on each second change
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [seconds]);

  const formatSportName = (type: string): string => {
    const names: Record<string, string> = {
      running: 'Run',
      cycling: 'Ride',
      swimming: 'Swim',
      rowing: 'Row',
      hiking: 'Hike',
      walking: 'Walk',
      elliptical: 'Elliptical',
      stair_climbing: 'Climb',
      jump_rope: 'Jump Rope',
      other: 'Workout',
    };
    return names[type] || 'Workout';
  };

  return (
    <View style={styles.overlay}>
      {/* Cancel Button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={28} color={colors.card} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.prepareText}>Get Ready</Text>

        {/* Animated Countdown Number */}
        <Animated.View
          style={[
            styles.countdownContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.countdownNumber}>{seconds}</Text>
        </Animated.View>

        <Text style={styles.sportText}>
          Starting {formatSportName(sportType)}...
        </Text>
      </View>

      {/* Hint */}
      <View style={styles.hintContainer}>
        <Ionicons name="information-circle-outline" size={18} color={colors.card} />
        <Text style={styles.hintText}>
          GPS tracking will begin automatically
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    position: 'absolute',
    top: spacing.xxxl + spacing.xl,
    right: spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  prepareText: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium as any,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xxl,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  countdownContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  countdownNumber: {
    fontSize: 80,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.card,
    fontVariant: ['tabular-nums'],
  },
  sportText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.card,
  },
  hintContainer: {
    position: 'absolute',
    bottom: spacing.xxxl + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  hintText: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
