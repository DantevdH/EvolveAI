/**
 * Insights Screen - Main orchestrator component
 * Refactored according to REFACTORING_GUIDE.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { InsightsAnalyticsService } from '../../../services/insightsAnalyticsService';
import { colors } from '../../../constants/colors';
import { InsightsHeader } from './InsightsHeader';
import { InsightsContent } from './InsightsContent';
import { InsightsLoadingState } from './InsightsLoadingState';
import { InsightsEmptyState } from './InsightsEmptyState';
import { InsightsData, TimePeriod } from './types';

export const InsightsScreen: React.FC = () => {
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');
  const lastPlanUpdateRef = useRef<string | null>(null);

  // Data states
  const [insightsData, setInsightsData] = useState<InsightsData>({
    weeklyVolumeData: [],
    performanceScoreData: [],
    topPerformingExercises: [],
    weakPoints: [],
    forecastData: [],
    milestoneData: [],
  });

  const loadAllInsights = useCallback(async () => {
    if (!state.userProfile?.id) return;

    setLoading(true);
    try {
      // Use local training plan from AuthContext for real-time insights
      const localPlan = state.trainingPlan;

      // Load all insights in parallel for better performance
      const [
        weeklyVolumeResult,
        performanceScoreResult,
        topExercisesResult,
        weakPointsResult,
        forecastResult,
        milestoneResult,
      ] = await Promise.all([
        InsightsAnalyticsService.getWeeklyVolumeTrend(
          state.userProfile.id,
          localPlan
        ),
        InsightsAnalyticsService.getPerformanceScoreTrend(
          state.userProfile.id,
          localPlan
        ),
        InsightsAnalyticsService.getTopPerformingExercises(
          state.userProfile.id,
          localPlan
        ),
        InsightsAnalyticsService.getWeakPointsAnalysis(
          state.userProfile.id,
          localPlan
        ),
        InsightsAnalyticsService.getFourWeekForecast(
          state.userProfile.id,
          localPlan
        ),
        InsightsAnalyticsService.getMilestonePredictions(
          state.userProfile.id,
          localPlan
        ),
      ]);

      // Set data states
      setInsightsData({
        weeklyVolumeData: weeklyVolumeResult.success
          ? weeklyVolumeResult.data || []
          : [],
        performanceScoreData: performanceScoreResult.success
          ? performanceScoreResult.data || []
          : [],
        topPerformingExercises: topExercisesResult.success
          ? topExercisesResult.data || []
          : [],
        weakPoints: weakPointsResult.success
          ? weakPointsResult.data || []
          : [],
        forecastData: forecastResult.success
          ? forecastResult.data || []
          : [],
        milestoneData: milestoneResult.success
          ? milestoneResult.data || []
          : [],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [state.userProfile?.id, state.trainingPlan]);

  // Track when to reload insights - reload when training plan changes
  useEffect(() => {
    if (state.userProfile?.id) {
      let planIdentifier: string | number = 'no-plan';

      if (state.trainingPlan) {
        const completedTrainings = state.trainingPlan.weeklySchedules
          .flatMap((w) => w.dailyTrainings)
          .filter((d) => d.completed && d.completedAt);

        if (completedTrainings.length > 0) {
          const mostRecentCompleted = completedTrainings
            .map((d) => d.completedAt?.getTime() || 0)
            .sort((a, b) => b - a)[0];

          planIdentifier = `${completedTrainings.length}-${mostRecentCompleted}`;
        } else {
          planIdentifier = 'no-completed';
        }
      }

      // Only reload if the plan identifier changed
      if (lastPlanUpdateRef.current !== planIdentifier) {
        lastPlanUpdateRef.current = planIdentifier;
        loadAllInsights();
      }
    }
  }, [state.userProfile?.id, state.trainingPlan, loadAllInsights]);

  const onRefresh = async () => {
    setRefreshing(true);
    InsightsAnalyticsService.clearCache();
    await loadAllInsights();
    setRefreshing(false);
  };

  const handleExercisePress = (exercise: any) => {
    // TODO: Navigate to exercise detail view
  };

  const handleWeakPointPress = (weakPoint: any) => {
    // TODO: Navigate to exercise detail or show recommendations
  };

  // Check if we have any data at all
  const hasData =
    insightsData.weeklyVolumeData.length > 0 ||
    insightsData.topPerformingExercises.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InsightsHeader username={state.userProfile?.username} />
        <InsightsLoadingState />
      </SafeAreaView>
    );
  }

  if (!hasData) {
    return (
      <SafeAreaView style={styles.container}>
        <InsightsHeader username={state.userProfile?.username} />
        <InsightsEmptyState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InsightsHeader username={state.userProfile?.username} />
      <InsightsContent
        data={insightsData}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onExercisePress={handleExercisePress}
        onWeakPointPress={handleWeakPointPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

