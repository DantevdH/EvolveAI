/**
 * Week Node Animations Hook
 * Provides simplified animation values for the current week node
 */

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export interface WeekNodeAnimations {
  glowAnim: Animated.Value;
}

/**
 * Custom hook for week node animations
 * @returns animation values for subtle glow pulse
 */
export const useWeekNodeAnimations = (): WeekNodeAnimations => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowAnim]);

  return {
    glowAnim,
  };
};

