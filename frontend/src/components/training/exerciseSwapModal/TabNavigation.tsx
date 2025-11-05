import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';

interface TabNavigationProps {
  activeTab: 'ai' | 'search';
  onTabChange: (tab: 'ai' | 'search') => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'ai' && styles.tabButtonActive]}
        onPress={() => onTabChange('ai')}
      >
        <Ionicons
          name="sparkles"
          size={20}
          color={activeTab === 'ai' ? colors.primary : colors.muted}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'ai' && styles.tabButtonTextActive,
          ]}
        >
          AI Recommendations
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'search' && styles.tabButtonActive]}
        onPress={() => onTabChange('search')}
      >
        <Ionicons
          name="search"
          size={20}
          color={activeTab === 'search' ? colors.primary : colors.muted}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'search' && styles.tabButtonTextActive,
          ]}
        >
          Search
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
});

