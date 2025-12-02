/**
 * Insights Screen - Main orchestrator component
 * Refactored according to REFACTORING_GUIDE.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { InsightsAnalyticsService } from '../../../services/insightsAnalyticsService';
import { colors } from '../../../constants/colors';
import { logger } from '../../../utils/logger';
import { InsightsHeader } from './InsightsHeader';
import { InsightsContent } from './InsightsContent';
import { InsightsLoadingState } from './InsightsLoadingState';
import { InsightsEmptyState } from './InsightsEmptyState';
import { InsightsData, TimePeriod } from './types';

export const InsightsScreen: React.FC = () => {
  const { state, loadInsightsSummary } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');

  // Data states - insightsSummary comes from context
  const [insightsData, setInsightsData] = useState<InsightsData>({
    weeklyVolumeData: [],
    performanceScoreData: [],
    topPerformingExercises: [],
    weakPoints: [],
    forecastData: [],
    milestoneData: [],
  });

  const loadAllInsights = useCallback(async () => {
    // Validate userProfile.id before API calls
    if (!state.userProfile?.id) {
      logger.error('Cannot load insights: userProfile.id is missing', {
        hasUserProfile: !!state.userProfile,
        userId: state.userProfile?.id
      });
      Alert.alert(
        'Unable to Load Insights',
        'Your profile information is missing. Please sign out and sign in again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Use local training plan from AuthContext for real-time insights
      // Handle missing training plan gracefully - insights can still work with database queries
      const localPlan = state.trainingPlan;
      
      if (!localPlan) {
        logger.info('No local training plan available, will fetch from database', {
          userId: state.userProfile.id
        });
      }

      // Load recovery trend data and weekly volume data for charts
      // Note: insightsSummary is NOT loaded here - only after workout completion
      // This prevents empty LLM insights when there's no training data
      const [
        recoveryTrendResult,
        weeklyVolumeResult,
      ] = await Promise.all([
        InsightsAnalyticsService.getRecoveryTrend(
          state.userProfile.id,
          localPlan
        ),
        InsightsAnalyticsService.getWeeklyVolumeTrend(
          state.userProfile.id,
          localPlan
        ),
      ]);

      // Log any failures for debugging
      const failures: string[] = [];
      if (!recoveryTrendResult.success) failures.push('recovery trend');
      if (!weeklyVolumeResult.success) failures.push('weekly volume');

      if (failures.length > 0) {
        logger.warn('Some insights failed to load', {
          failures,
          userId: state.userProfile.id,
          hasLocalPlan: !!localPlan
        });
      }

      // Set data states (chart data only - insightsSummary comes from workout completion)
      setInsightsData(prev => ({
        ...prev,
        recoveryData: recoveryTrendResult.success ? recoveryTrendResult.data : undefined,
        // Chart data
        weeklyVolumeData: weeklyVolumeResult.success ? weeklyVolumeResult.data || [] : [],
        // Legacy data (empty - not used anymore)
        performanceScoreData: [],
        topPerformingExercises: [],
        weakPoints: [],
        forecastData: [],
        milestoneData: [],
        // Keep existing insightsSummary if it exists (from workout completion)
      }));
    } catch (error) {
      // Handle API failures gracefully with proper error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to load insights', {
        error: errorMessage,
        userId: state.userProfile?.id,
        hasLocalPlan: !!state.trainingPlan,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      Alert.alert(
        'Unable to Load Insights',
        'We couldn\'t load your insights right now. Please check your connection and try again.',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Retry', 
            onPress: () => loadAllInsights(),
            style: 'default'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [state.userProfile?.id, state.trainingPlan]);

  // Sync insights summary from context to local state
  useEffect(() => {
    logger.info('Insights summary changed in context', {
      hasInsights: !!state.insightsSummary,
      hasSummary: !!state.insightsSummary?.summary,
      hasMetrics: !!state.insightsSummary?.metrics
    });
    
    setInsightsData(prev => ({
      ...prev,
      insightsSummary: state.insightsSummary ?? undefined
    }));
  }, [state.insightsSummary]);

  // Ensure insights are loaded when screen mounts (if not already loaded)
  useEffect(() => {
    if (state.userProfile?.id && state.insightsSummary === null && !loading) {
      logger.info('Loading insights on screen mount', { userId: state.userProfile.id });
      loadInsightsSummary();
    }
  }, [state.userProfile?.id, state.insightsSummary, loading, loadInsightsSummary]);

  // Load chart data when component mounts or training plan changes
  useEffect(() => {
    if (!state.userProfile?.id) {
      setLoading(false);
      return;
    }

    loadAllInsights();
  }, [state.userProfile?.id, state.trainingPlan, loadAllInsights]);

  const onRefresh = async () => {
    setRefreshing(true);
    InsightsAnalyticsService.clearCache();
    
    // Reload both chart data and insights summary
    await Promise.all([
      loadAllInsights(),
      loadInsightsSummary() // Reload insights from DB
    ]);
    
    setRefreshing(false);
  };

  const handleExercisePress = (exercise: any) => {
    // TODO: Navigate to exercise detail view
  };

  const handleWeakPointPress = (weakPoint: any) => {
    // TODO: Navigate to exercise detail or show recommendations
  };

  // Check if we have any data at all
  // Insights summary comes from context, chart data from API
  const hasData =
    insightsData.insightsSummary !== undefined ||
    insightsData.weeklyVolumeData.length > 0 ||
    insightsData.performanceScoreData.length > 0 ||
    insightsData.weakPoints.length > 0 ||
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

