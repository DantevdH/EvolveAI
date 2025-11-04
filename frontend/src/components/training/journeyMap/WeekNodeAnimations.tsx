/**
 * Week Node Animations Hook
 * Provides animation values for the current week node
 */

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export interface WeekNodeAnimations {
  bounceAnim: Animated.Value;
  glowAnim: Animated.Value;
  ring1Rotation: Animated.Value;
  ring2Rotation: Animated.Value;
}

/**
 * Custom hook for week node animations
 * @returns animation values for bounce, glow, and rotating rings
 */
export const useWeekNodeAnimations = (): WeekNodeAnimations => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ring1Rotation = useRef(new Animated.Value(0)).current;
  const ring2Rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ring rotations (opposite directions)
    Animated.loop(
      Animated.timing(ring1Rotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(ring2Rotation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, [bounceAnim, glowAnim, ring1Rotation, ring2Rotation]);

  return {
    bounceAnim,
    glowAnim,
    ring1Rotation,
    ring2Rotation,
  };
};

