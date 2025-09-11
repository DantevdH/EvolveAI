import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/designSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OnboardingBackground = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const gridAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for scanning effect
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

    // Grid animation for tech feel
    Animated.loop(
      Animated.timing(gridAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const gridOpacity = gridAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  return (
    <View style={styles.container}>
      {/* Background using the lighter black from colors */}
      <View style={[styles.background, { backgroundColor: colors.background }]} />

      {/* Scanning grid overlay */}
      <Animated.View style={[styles.gridContainer, { opacity: gridOpacity }]}>
        {/* Horizontal grid lines */}
        {Array.from({ length: 12 }, (_, i) => (
          <View
            key={`h-${i}`}
            style={[
              styles.gridLine,
              {
                top: (screenHeight / 12) * i,
                width: screenWidth,
                height: 1,
              },
            ]}
          />
        ))}
        {/* Vertical grid lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <View
            key={`v-${i}`}
            style={[
              styles.gridLine,
              {
                left: (screenWidth / 8) * i,
                width: 1,
                height: screenHeight,
              },
            ]}
          />
        ))}
      </Animated.View>



      {/* Scanning dots/beacons */}
      <View style={styles.scanningDots}>
        {Array.from({ length: 6 }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.scanningDot,
              {
                left: 50 + (i * 60),
                top: 150 + (i % 2) * 300,
                opacity: pulseOpacity,
              },
            ]}
          />
        ))}
      </View>


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
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: colors.primary, // Using the bold red color
    opacity: 0.2,
  },

  scanningDots: {
    ...StyleSheet.absoluteFillObject,
  },
  scanningDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: colors.primary, // Using the bold red color
    borderRadius: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },

});

export { OnboardingBackground };