import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';
import { ForecastAndMilestonesProps } from './types';
import { ForecastChart } from './ForecastChart';
import { MilestonesList } from './MilestonesList';

export const ForecastAndMilestones: React.FC<ForecastAndMilestonesProps> = ({ 
  forecastData, 
  milestoneData 
}) => {
  return (
    <View style={styles.container}>
      {forecastData && forecastData.length > 0 && (
        <ForecastChart forecastData={forecastData} />
      )}

      {milestoneData && milestoneData.length > 0 && (
        <MilestonesList milestones={milestoneData} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
  },
});

