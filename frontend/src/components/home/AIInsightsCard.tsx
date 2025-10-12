/**
 * AI Insights Card Component - AI insights with brain icon
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface AIInsightsCardProps {
  insight?: string;
  onViewInsights?: () => void;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  insight = "Great consistency this week! Your squat strength has improved by 8%. Consider adding more protein to support your muscle growth goals.",
  onViewInsights,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <Ionicons name="bulb" size={20} color={colors.primary} /> */}
        <Text style={styles.title}>AI Insights</Text>
        {onViewInsights && (
          <TouchableOpacity style={styles.viewButton} onPress={onViewInsights}>
            <Text style={styles.viewButtonText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.insightText}>{insight}</Text>
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
  insightText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
