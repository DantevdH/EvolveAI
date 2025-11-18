import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { ExerciseTab } from './types';

interface TabNavigationProps {
  selectedTab: ExerciseTab;
  onTabChange: (tab: ExerciseTab) => void;
}

const tabIcon = (tab: ExerciseTab): string => {
  switch (tab) {
    case ExerciseTab.General: return 'information-circle';
    case ExerciseTab.Instructions: return 'list';
    case ExerciseTab.History: return 'trending-up';
    default: return 'information-circle';
  }
};

export const TabNavigation: React.FC<TabNavigationProps> = ({ selectedTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      {Object.values(ExerciseTab).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabButton,
            selectedTab === tab && styles.tabButtonActive
          ]}
          onPress={() => onTabChange(tab)}
        >
          <Ionicons
            name={tabIcon(tab) as any}
            size={16}
            color={selectedTab === tab ? colors.secondary : colors.muted}
          />
          <Text style={[
            styles.tabText,
            selectedTab === tab && styles.tabTextActive
          ]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: createColorWithOpacity(colors.secondary, 0.05),
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
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
  },
  tabButtonActive: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.12),
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
});

