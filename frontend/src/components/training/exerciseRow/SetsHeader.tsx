/**
 * Sets Header Component
 * Header for sets section with add/remove controls
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';

interface SetsHeaderProps {
  onAddSet: () => void;
  onRemoveSet: () => void;
  canRemoveSet: boolean;
  isLocked?: boolean;
}

const SetsHeader: React.FC<SetsHeaderProps> = ({ onAddSet, onRemoveSet, canRemoveSet, isLocked = false }) => {
  return (
    <View style={styles.setsHeader}>
      <Text style={[styles.setsTitle, isLocked && styles.lockedText]}>Sets</Text>
      
      {/* Add/Remove set buttons */}
      {!isLocked && (
        <View style={styles.setControls}>
          <TouchableOpacity style={styles.setButton} onPress={onAddSet}>
            <Ionicons name="add-circle" size={20} color={colors.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.setButton}
            onPress={onRemoveSet}
            disabled={!canRemoveSet}
          >
            <Ionicons 
              name="remove-circle" 
              size={20} 
              color={canRemoveSet ? colors.secondary : colors.border} 
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  setsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted
  },
  setControls: {
    flexDirection: 'row',
    gap: 8
  },
  setButton: {
    // No additional styling needed
  },
  lockedText: {
    opacity: 0.5,
  },
});

export default SetsHeader;

