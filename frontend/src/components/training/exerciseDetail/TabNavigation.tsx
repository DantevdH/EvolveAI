import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
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
            color={selectedTab === tab ? colors.primary : colors.muted}
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
    backgroundColor: colors.card,
    margin: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
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
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
  },
});

