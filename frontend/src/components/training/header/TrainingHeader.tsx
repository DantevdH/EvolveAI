/**
 * Training Header Component
 * Main orchestrator for the training header with progress and weekday selection
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import BackButton from './BackButton';
import ProgressSection from './ProgressSection';
import WeekdayPath from './WeekdayPath';
import { TrainingHeaderComponentProps } from './types';

const TrainingHeader: React.FC<TrainingHeaderComponentProps> = ({
  progressRing,
  onBackToMap,
  dayIndicators,
  onDaySelect,
  currentWeek,
  hideWeekTitle,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {onBackToMap && <BackButton onPress={onBackToMap} />}
        <ProgressSection
          progressRing={progressRing}
          currentWeek={currentWeek}
          hideWeekTitle={hideWeekTitle}
        />
        <WeekdayPath dayIndicators={dayIndicators} onDaySelect={onDaySelect} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 24, // Increased from 20 for more rounded corners (matching home page)
    padding: 20,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    backgroundColor: colors.card,
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: {
      width: 0,
      height: 4, // Increased from 2 for better elevation
    },
    shadowOpacity: 0.15, // Increased for deeper shadow
    shadowRadius: 12, // Increased for softer shadow spread
    elevation: 5, // Increased for Android elevation
    position: 'relative',
  },
});

export default TrainingHeader;

