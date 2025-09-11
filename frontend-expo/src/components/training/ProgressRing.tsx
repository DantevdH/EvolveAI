// Progress Ring Component - Circular progress indicator using react-native-circular-progress
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { colors } from '../../constants/colors';
import { ProgressRingProps } from '../../types/training';

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  total,
  completed,
  size = 44,
  strokeWidth = 4,
  color = colors.primary
}) => {
  const progressPercentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <AnimatedCircularProgress
        size={size}
        width={strokeWidth}
        fill={progressPercentage}
        tintColor={color}
        backgroundColor={color + '30'} // 30% opacity for background
        rotation={-90} // Start from top
        lineCap="round"
        duration={0} // No animation - instant update
      >
        {(fill) => (
          <View style={styles.textContainer}>
            <Text style={styles.progressText}>{progressPercentage}%</Text>
          </View>
        )}
      </AnimatedCircularProgress>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  }
});

export default ProgressRing;