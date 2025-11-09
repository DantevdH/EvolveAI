import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, borderRadius, spacing, typography, shadows } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

interface ProgressOverlayProps {
  visible: boolean;
  progress: number;
}

const CIRCLE_RADIUS = 56;
const CIRCLE_STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const trackColor = createColorWithOpacity(colors.secondary, 0.18);
const progressColor = colors.secondary;

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ visible, progress }) => {
  if (!visible) {
    return null;
  }

  const clampedProgress = Math.max(0, Math.min(100, progress));

  const { strokeDashoffset } = useMemo(() => {
    const normalized = clampedProgress / 100;
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - normalized),
    };
  }, [clampedProgress]);

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: createColorWithOpacity(colors.overlay, 0.28),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
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
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
});
