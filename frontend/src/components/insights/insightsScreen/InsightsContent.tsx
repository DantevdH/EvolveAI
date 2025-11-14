/**
 * Insights Content Component - Main scrollable content area
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { VolumeTrendChart } from '../VolumeTrendChart';
import { PerformanceScoreChart } from '../PerformanceScoreChart';
import { TopPerformingExercises } from '../TopPerformingExercises';
import { WeakPointsAnalysis } from '../WeakPointsAnalysis';
import { ForecastAndMilestones } from '../forecastAndMilestones';
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
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Volume Trend Chart */}
      {data.weeklyVolumeData.length > 0 && (
        <View style={styles.chartCard}>
          <VolumeTrendChart
            data={data.weeklyVolumeData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
          />
        </View>
      )}

      {/* Performance Analysis */}
      {data.performanceScoreData.length > 0 && (
        <View style={styles.chartCard}>
          <PerformanceScoreChart
            data={data.performanceScoreData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
          />
        </View>
      )}

      {/* Top Performing Exercises */}
      {data.topPerformingExercises.length > 0 && (
        <View style={styles.sectionCard}>
          <LinearGradient
            colors={[
              createColorWithOpacity(colors.secondary, 0.08),
              createColorWithOpacity(colors.secondary, 0.03),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionHeaderGradient}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>AI TOP PERFORMERS</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={styles.sectionContent}>
            <TopPerformingExercises
              data={data.topPerformingExercises}
              onExercisePress={onExercisePress}
            />
          </View>
        </View>
      )}

      {/* Weak Points Analysis */}
      <View style={styles.chartCard}>
        <WeakPointsAnalysis
          data={data.weakPoints}
          onExercisePress={onWeakPointPress}
        />
      </View>

      {/* Forecast and Milestones */}
      {(data.forecastData.length > 0 || data.milestoneData.length > 0) && (
        <View style={styles.sectionCard}>
          <LinearGradient
            colors={[
              createColorWithOpacity(colors.secondary, 0.08),
              createColorWithOpacity(colors.secondary, 0.03),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionHeaderGradient}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>AI PREDICTIONS & MILESTONES</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={styles.sectionContent}>
            <ForecastAndMilestones
              forecastData={data.forecastData}
              milestoneData={data.milestoneData}
            />
          </View>
        </View>
      )}

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
});

