/**
 * Exercise Info Component
 * Displays exercise name and details
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseInfoProps } from './types';

const ExerciseInfo: React.FC<ExerciseInfoProps> = ({
  displayName,
  equipmentLabel,
  numSets,
  isEndurance,
  enduranceSession,
  isExpanded,
  isLocked,
  onToggleExpand,
}) => {
  return (
    <View style={styles.exerciseInfo}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {displayName}
        </Text>
      </View>
      
      <View style={styles.exerciseDetails}>
        {isEndurance ? (
          <Text style={styles.setsText}>
            {enduranceSession?.trainingVolume || 'N/A'} {enduranceSession?.unit || ''} • zone {enduranceSession?.heartRateZone || 'N/A'}
          </Text>
        ) : (
          <Text style={styles.setsText}>
            {equipmentLabel} • {numSets} {numSets === 1 ? 'set' : 'sets'}
          </Text>
        )}
        
        <TouchableOpacity
          style={[styles.expandButton, isLocked && styles.expandButtonLocked]}
          onPress={isLocked ? undefined : onToggleExpand}
          disabled={isLocked}
        >
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={isLocked ? colors.muted : colors.primary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseInfo: {
    flex: 1,
    gap: 4,
    padding: 4
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    minHeight: 32,
    gap: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 100,
    maxWidth: '100%'
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  setsText: {
    fontSize: 11,
    color: colors.muted
  },
  expandButton: {
    // No additional styling needed
  },
  expandButtonLocked: {
    opacity: 0.5
  },
});

export default ExerciseInfo;

