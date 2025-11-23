/**
 * Insights Screen - Main orchestrator component
 * Refactored according to REFACTORING_GUIDE.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
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

  // Function to load cached insights without triggering LLM
  const loadCachedInsights = useCallback(async () => {
    if (!state.userProfile?.id) return;
    
    try {
      // Load cached insights summary (backend cache should have it)
      const insightsResult = await InsightsAnalyticsService.getInsightsSummary(
        state.userProfile.id,
        state.trainingPlan
      );
      
      if (insightsResult.success && insightsResult.data) {
        setInsightsData(prev => ({
          ...prev,
          insightsSummary: insightsResult.data
        }));
      }
    } catch (error) {
      logger.warn('Failed to load cached insights', error);
    }
  }, [state.userProfile?.id, state.trainingPlan]);

  // Track when to reload insights - reload when training plan changes
  useEffect(() => {
    if (!state.userProfile?.id) return;

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
  }, [state.userProfile?.id, state.trainingPlan, loadAllInsights]);

  // Refresh insights when screen comes into focus (handles navigation back from training)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure training plan state is updated
      const timeoutId = setTimeout(() => {
        if (state.userProfile?.id && state.trainingPlan) {
          // Check if insights are being generated (from workout completion)
          const isGenerating = (global as any).__aiInsightsGenerating === true;
          
          if (isGenerating) {
            // Set loading state to show spinner
            setAiInsightsLoading(true);
            
            // Poll for insights to be ready (check every 2 seconds, max 30 seconds)
            let pollCount = 0;
            const maxPolls = 15; // 30 seconds max
            
            const pollForInsights = async () => {
              try {
                // Try to load cached insights (backend should have them by now)
                const insightsResult = await InsightsAnalyticsService.getInsightsSummary(
                  state.userProfile!.id,
                  state.trainingPlan
                );
                
                if (insightsResult.success && insightsResult.data) {
                  // Insights are ready!
                  setInsightsData(prev => ({
                    ...prev,
                    insightsSummary: insightsResult.data
                  }));
                  setAiInsightsLoading(false);
                  
                  // Clear the generating flag
                  (global as any).__aiInsightsGenerating = false;
                } else if (pollCount < maxPolls) {
                  // Not ready yet, poll again
                  pollCount++;
                  setTimeout(pollForInsights, 2000);
                } else {
                  // Timeout - stop loading
                  setAiInsightsLoading(false);
                  (global as any).__aiInsightsGenerating = false;
                }
              } catch (error) {
                logger.warn('Error polling for insights', error);
                setAiInsightsLoading(false);
                (global as any).__aiInsightsGenerating = false;
              }
            };
            
            // Start polling after a short delay
            setTimeout(pollForInsights, 1000);
          } else {
            // Not generating, just check for new completed trainings
            const completedTrainings = state.trainingPlan.weeklySchedules
              .flatMap((w) => w.dailyTrainings)
              .filter((d) => d.completed && d.completedAt);
            
            if (completedTrainings.length > 0) {
              const mostRecentCompleted = completedTrainings
                .map((d) => d.completedAt?.getTime() || 0)
                .sort((a, b) => b - a)[0];
              
              const currentIdentifier = `${completedTrainings.length}-${mostRecentCompleted}`;
              
              // Reload if identifier changed or if we haven't loaded yet
              if (lastPlanUpdateRef.current !== currentIdentifier || lastPlanUpdateRef.current === null) {
                // Try to load cached insights without triggering API
                loadCachedInsights();
              }
            }
          }
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }, [state.userProfile?.id, state.trainingPlan, loadAllInsights, loadCachedInsights])
  );

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
  // Check if we have new simplified insights or legacy data
  // Also check if we're loading AI insights (show content with loading spinner)
  const hasData =
    insightsData.insightsSummary !== undefined ||
    aiInsightsLoading ||
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
        aiInsightsLoading={aiInsightsLoading}
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

