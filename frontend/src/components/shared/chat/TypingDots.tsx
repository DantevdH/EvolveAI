import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';

interface TypingDotsProps {
  dotColor?: string;
}

export const TypingDots: React.FC<TypingDotsProps> = ({ dotColor = colors.primary }) => {
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const createPulseAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createPulseAnimation(dot1, 0);
    const animation2 = createPulseAnimation(dot2, 200);
    const animation3 = createPulseAnimation(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.dot, { opacity: dot1, color: dotColor }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot2, color: dotColor }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot3, color: dotColor }]}>•</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dot: {
    fontSize: 24,
    marginHorizontal: 3,
    fontWeight: 'bold',
  },
});

