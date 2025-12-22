/**
 * Endurance Details Component
 * Displays endurance session details with rich card layout, sport icons, and color-coded zones
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { typography, spacing } from '../../../constants/designSystem';
import { getSportIcon } from '../../../constants/sportIcons';
import { getZoneBadgeStyle, getZoneLabel } from '../../../utils/heartRateZoneUtils';

interface EnduranceDetailsProps {
  enduranceSession?: {
    name?: string;
    sportType?: string;
    trainingVolume?: number;
    unit?: string;
    heartRateZone?: number;
  };
}

const EnduranceDetails: React.FC<EnduranceDetailsProps> = ({ enduranceSession }) => {
  const sportType = enduranceSession?.sportType || '';
  const iconName = getSportIcon(sportType);
  const zone = enduranceSession?.heartRateZone || 1;
  const zoneStyle = getZoneBadgeStyle(zone);
  const zoneLabel = getZoneLabel(zone);
  const trainingVolume = enduranceSession?.trainingVolume;
  const unit = enduranceSession?.unit || '';

  return (
    <View style={styles.enduranceContainer}>
      {/* Horizontal layout: Icon | Details | Zone Badge */}
      <View style={styles.enduranceContent}>
        {/* Sport Icon - Left */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name={iconName as any} 
            size={28} 
            color={colors.primary} 
          />
        </View>

        {/* Exercise Details - Center */}
        <View style={styles.detailsContainer}>
          {/* Training Volume */}
          <View style={styles.volumeContainer}>
            <Text style={styles.volumeLabel}>VOLUME</Text>
            <Text style={styles.volumeValue}>
              {trainingVolume !== undefined && trainingVolume !== null 
                ? `${trainingVolume} ${unit}` 
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Heart Rate Zone Badge - Right */}
        <View style={[styles.zoneBadge, { backgroundColor: zoneStyle.backgroundColor }]}>
          <Text style={[styles.zoneLabel, { color: zoneStyle.color }]}>
            {zoneLabel}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  enduranceContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  enduranceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailsContainer: {
    flex: 1,
    minWidth: 0, // Allows text to shrink
  },
  volumeContainer: {
    gap: 2,
  },
  volumeLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  volumeValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  zoneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    flexShrink: 0,
  },
  zoneLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default EnduranceDetails;

