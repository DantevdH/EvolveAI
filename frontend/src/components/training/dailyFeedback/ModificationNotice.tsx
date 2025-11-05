import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/designSystem';

interface ModificationNoticeProps {
  count: number;
}

export const ModificationNotice: React.FC<ModificationNoticeProps> = ({ count }) => {
  if (count === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="information-circle" size={20} color={colors.primary} />
      <Text style={styles.text}>
        {count} modification{count > 1 ? 's' : ''} detected - ACE will learn from this!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}10`,
    padding: 14,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    opacity: 0.9,
  },
});

