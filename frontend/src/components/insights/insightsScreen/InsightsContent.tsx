/**
 * Insights Content Component - Main scrollable content area
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { VolumeTrendChart } from '../VolumeTrendChart';
import { InsightsData, TimePeriod } from './types';

interface InsightsContentProps {
  data: InsightsData;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onExercisePress: (exercise: any) => void;
  onWeakPointPress: (weakPoint: any) => void;
}

export const InsightsContent: React.FC<InsightsContentProps> = ({
  data,
  selectedPeriod,
  onPeriodChange,
  refreshing,
  onRefresh,
  onExercisePress,
  onWeakPointPress,
}) => {
  // Use new simplified insights if available
  const insightsSummary = data.insightsSummary;
  const { summary, metrics } = insightsSummary || { summary: null, metrics: null };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* AI Summary Card */}
      <View style={styles.chartCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>AI INSIGHTS</Text>
        </View>
        <View style={styles.cardContent}>
          {summary ? (
            <>
              <Text style={styles.summaryText}>{summary.summary}</Text>
              
              {/* Findings Section */}
              {summary.findings && summary.findings.length > 0 && (
                <View style={styles.findingsSection}>
                  <Text style={styles.findingsLabel}>Findings:</Text>
                  {summary.findings.slice(0, 3).map((finding, index) => (
                    <View key={index} style={styles.findingItem}>
                      <Ionicons name="bulb" size={16} color={colors.secondary} />
                      <Text style={styles.findingText}>{finding}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Recommendations Section */}
              {summary.recommendations && summary.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsLabel}>Recommendations:</Text>
                  {summary.recommendations.slice(0, 3).map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}
        </View>
      </View>

      {/* Volume Progress Card */}
      {data.weeklyVolumeData && data.weeklyVolumeData.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>VOLUME PROGRESS</Text>
          </View>
          <View style={styles.cardContent}>
            <VolumeTrendChart
              data={data.weeklyVolumeData}
              hideTitle={true}
              height={180}
            />
          </View>
        </View>
      )}

      {/* Training Intensity Card */}
      {data.recoveryData && data.recoveryData.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="speedometer" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>TRAINING INTENSITY</Text>
          </View>
          <View style={styles.cardContent}>
            {/* Transform RPE data to match VolumeTrendChart format */}
            <VolumeTrendChart
              data={data.recoveryData.map((rpe) => ({
                week: rpe.week,
                volume: rpe.avgRPE, // Use RPE values directly (1-5 scale)
                trainings: 1,
                exercises: 0
              }))}
              hideTitle={true}
              height={180}
            />
          </View>
        </View>
      )}

      {/* Focus Areas Card (Simplified MSI) */}
      {metrics && metrics.weak_points && metrics.weak_points.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="fitness" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>FOCUS AREAS</Text>
          </View>
          <View style={styles.cardContent}>
            {metrics.weak_points.slice(0, 3).map((wp, index) => (
              <View key={index} style={styles.focusAreaItem}>
                <View style={styles.focusAreaHeader}>
                  <Text style={styles.focusAreaMuscle}>{wp.muscle_group}</Text>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: wp.severity === 'high' ? colors.error : wp.severity === 'medium' ? colors.warning : colors.muted }
                  ]}>
                    <Text style={styles.severityText}>{wp.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.focusAreaIssue}>{wp.issue.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Training Frequency (shown in AI text, not as separate card per requirements) */}
      
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  chartCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  findingsSection: {
    marginTop: 16,
  },
  findingsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  findingText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  sectionHeaderGradient: {
    // Gradient background for header
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bottomSpacing: {
    height: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.border, 0.5),
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 20,
  },
  summaryText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  prioritySection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
    borderRadius: 12,
    marginBottom: 16,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  recommendationsSection: {
    marginTop: 8,
  },
  recommendationsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  metricText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  recoveryTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  focusAreaItem: {
    padding: 12,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.05),
    borderRadius: 12,
    marginBottom: 8,
  },
  focusAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  focusAreaMuscle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.card,
    letterSpacing: 0.5,
  },
  focusAreaIssue: {
    fontSize: 13,
    color: colors.muted,
    textTransform: 'capitalize',
  },
});

