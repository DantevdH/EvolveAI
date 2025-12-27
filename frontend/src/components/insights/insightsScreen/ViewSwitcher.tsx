/**
 * View Switcher Component - Toggle between Performance and Recovery views
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';

export type InsightsView = 'performance' | 'recovery';

interface ViewSwitcherProps {
  selectedView: InsightsView;
  onViewChange: (view: InsightsView) => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  selectedView,
  onViewChange,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          selectedView === 'performance' && styles.tabButtonActive,
        ]}
        onPress={() => onViewChange('performance')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trending-up"
          size={18}
          color={selectedView === 'performance' ? colors.secondary : colors.muted}
        />
        <Text
          style={[
            styles.tabText,
            selectedView === 'performance' && styles.tabTextActive,
          ]}
        >
          Performance
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          selectedView === 'recovery' && styles.tabButtonActive,
        ]}
        onPress={() => onViewChange('recovery')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="heart"
          size={18}
          color={selectedView === 'recovery' ? colors.secondary : colors.muted}
        />
        <Text
          style={[
            styles.tabText,
            selectedView === 'recovery' && styles.tabTextActive,
          ]}
        >
          Recovery
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: createColorWithOpacity(colors.secondary, 0.05),
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.15),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.12),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
});

