import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { colors, createColorWithOpacity } from '../../constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OnboardingBackground = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.background, { backgroundColor: colors.background }]} />
      <Animated.View style={[styles.ring, { opacity: pulseOpacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  ring: {
    position: 'absolute',
    top: screenHeight * 0.15,
    left: -screenWidth * 0.2,
    width: screenWidth * 1.4,
    height: screenWidth * 1.4,
    borderRadius: screenWidth * 0.7,
    borderWidth: 36,
    borderColor: createColorWithOpacity(colors.secondary, 0.15),
  },
});

export { OnboardingBackground };