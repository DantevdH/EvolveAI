/**
 * Progress Section Component
 * Displays progress ring and week title
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';
import ProgressRing from '../ProgressRing';
import { ProgressSectionProps } from './types';

const ProgressSection: React.FC<ProgressSectionProps> = ({
  progressRing,
  currentWeek,
}) => {
  return (
    <View style={styles.progressSection}>
      {progressRing && (
        <View style={styles.progressContainer}>
          <ProgressRing
            progress={progressRing.progress}
            total={progressRing.total}
            completed={progressRing.completed}
            size={65}
            strokeWidth={5}
            color={progressRing.color}
          />
        </View>
      )}

      {/* Week Title */}
      <Text style={styles.weekTitle}>Week {currentWeek}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.5,
  },
});

export default ProgressSection;

