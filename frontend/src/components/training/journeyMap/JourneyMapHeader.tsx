/**
 * Journey Map Header Component
 * Displays training plan header with journey statistics
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';
import { TrainingPlan } from '../../../types/training';

interface JourneyMapHeaderProps {
  trainingPlan: TrainingPlan;
}

const JourneyMapHeader: React.FC<JourneyMapHeaderProps> = ({
  trainingPlan,
}) => {
  if (!trainingPlan) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>NO TRAINING PLAN</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text 
        style={styles.title}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {trainingPlan.title.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 0,
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },
});

export default JourneyMapHeader;

