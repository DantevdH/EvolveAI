/**
 * Remove Button Component
 * Top-right remove button for exercise
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';

interface RemoveButtonProps {
  onPress: () => void;
}

const RemoveButton: React.FC<RemoveButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.removeButtonTopRight}
      onPress={onPress}
    >
      <Ionicons name="close" size={16} color={colors.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  removeButtonTopRight: {
    position: 'absolute',
    top: -12, // Half outside to sit on border
    right: -12, // Half outside to sit on border
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});

export default RemoveButton;

