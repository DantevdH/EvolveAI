/**
 * Training Header Component
 * Main orchestrator for the training header with progress and weekday selection
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <LinearGradient
        colors={[
          colors.card,
          createColorWithOpacity(colors.card, 0.95),
          colors.card
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        {/* Floating Back Button */}
        {onBackToMap && <BackButton onPress={onBackToMap} />}

        {/* Progress Ring Section */}
        <ProgressSection 
          progressRing={progressRing} 
          currentWeek={currentWeek}
          hideWeekTitle={hideWeekTitle}
        />

        {/* Connected Weekday Path */}
        <WeekdayPath dayIndicators={dayIndicators} onDaySelect={onDaySelect} />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  gradientCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
});

export default TrainingHeader;

