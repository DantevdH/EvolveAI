/**
 * AI Insights Card Component - Shows three KPIs: This Week's Volume, ETI, and MSI
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface AIInsightsCardProps {
  weeklyVolume?: number;
  eti?: number;
  msi?: number;
  onViewInsights?: () => void;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  weeklyVolume,
  eti,
  msi,
  onViewInsights,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Insights</Text>
        {onViewInsights && (
          <TouchableOpacity style={styles.viewButton} onPress={onViewInsights}>
            <Text style={styles.viewButtonText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.kpiContainer}>
        {/* This Week's Volume */}
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>This Week's Volume</Text>
          {weeklyVolume !== undefined ? (
            <Text style={styles.kpiValue}>
              {weeklyVolume >= 1000 ? `${Math.round(weeklyVolume / 1000)}K` : Math.round(weeklyVolume).toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.noData}>(No data)</Text>
          )}
        </View>
        
        {/* ETI */}
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>ETI</Text>
          {eti !== undefined ? (
            <Text style={styles.kpiValue}>
              {Math.round(eti)}
            </Text>
          ) : (
            <Text style={styles.noData}>(No data)</Text>
          )}
        </View>
        
        {/* MSI */}
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>MSI</Text>
          {msi !== undefined ? (
            <Text style={styles.kpiValue}>
              {Math.round(msi)}
            </Text>
          ) : (
            <Text style={styles.noData}>(No data)</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 6,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  noData: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.muted,
  },
});
