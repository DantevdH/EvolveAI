import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/src/constants/colors';
import { createColorWithOpacity } from '@/src/constants/colors';

interface InlineProgressIndicatorProps {
  progress: number;
}

const CIRCLE_RADIUS = 40;
const CIRCLE_STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const trackColor = createColorWithOpacity(colors.secondary, 0.18);
const progressColor = colors.secondary;

export const InlineProgressIndicator: React.FC<InlineProgressIndicatorProps> = ({ progress }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const { strokeDashoffset } = useMemo(() => {
    const normalized = clampedProgress / 100;
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - normalized),
    };
  }, [clampedProgress]);

  return (
    <View style={styles.container}>
      <View style={styles.circleContainer}>
        <Svg width={(CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH) * 2} height={(CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH) * 2}>
          <Circle
            cx={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
            cy={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
            r={CIRCLE_RADIUS}
            stroke={trackColor}
            strokeWidth={CIRCLE_STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
            cy={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
            r={CIRCLE_RADIUS}
            stroke={progressColor}
            strokeWidth={CIRCLE_STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH} ${CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH})`}
            fill="none"
          />
        </Svg>
        <View style={styles.circleLabelContainer}>
          <Text style={styles.circlePercent}>{Math.round(clampedProgress)}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercent: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
