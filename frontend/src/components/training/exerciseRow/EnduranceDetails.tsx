/**
 * Endurance Details Component
 * Displays endurance session details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';

interface EnduranceDetailsProps {
  enduranceSession?: {
    sportType?: string;
    trainingVolume?: number;
    unit?: string;
    heartRateZone?: number;
  };
}

const EnduranceDetails: React.FC<EnduranceDetailsProps> = ({ enduranceSession }) => {
  return (
    <View style={styles.enduranceContainer}>
      <View style={styles.enduranceDetails}>
        {/* Type */}
        <View style={styles.enduranceDetailItemVertical}>
          <Text style={styles.enduranceDetailLabelSmall}>TYPE</Text>
          <Text style={styles.enduranceDetailValueSmall}>
            {enduranceSession?.sportType || 'N/A'}
          </Text>
        </View>
        
        {/* Volume */}
        <View style={styles.enduranceDetailItemVertical}>
          <Text style={styles.enduranceDetailLabelSmall}>VOLUME</Text>
          <Text style={styles.enduranceDetailValueSmall}>
            {enduranceSession?.trainingVolume || 'N/A'} {enduranceSession?.unit || ''}
          </Text>
        </View>
        
        {/* Heart Zone */}
        <View style={styles.enduranceDetailItemVertical}>
          <Text style={styles.enduranceDetailLabelSmall}>HEART ZONE</Text>
          <Text style={styles.enduranceDetailValueSmall}>
            Zone {enduranceSession?.heartRateZone || 'N/A'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  enduranceContainer: {
    paddingVertical: 8,
    gap: 16
  },
  enduranceDetails: {
    gap: 8
  },
  enduranceDetailItemVertical: {
    gap: 4
  },
  enduranceDetailLabelSmall: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.muted,
    textTransform: 'uppercase'
  },
  enduranceDetailValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
});

export default EnduranceDetails;

