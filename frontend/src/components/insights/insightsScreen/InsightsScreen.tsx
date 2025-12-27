/**
 * Insights Screen - Main orchestrator component
 *
 * Refactored to use InsightsContext for preloaded analytics data.
 * Removed AI insights integration.
 */

import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useInsights } from '@/src/context/InsightsContext';
import { colors } from '@/src/constants/colors';
import { WelcomeHeader } from '@/src/components/home/WelcomeHeader';
import { InsightsContent } from './InsightsContent';
import { InsightsLoadingState } from './InsightsLoadingState';
import { InsightsEmptyState } from './InsightsEmptyState';

export const InsightsScreen: React.FC = () => {
  const { state } = useAuth();
  const { insightsData, refreshInsights, isInsightsLoading } = useInsights();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshInsights();
    setRefreshing(false);
  }, [refreshInsights]);

  // Check if we have any data to display
  const hasData =
    insightsData.performedSportTypes.length > 0 ||
    insightsData.muscleRecoveryStatus.length > 0;

  // Show loading state while insights are being calculated
  if (isInsightsLoading && !hasData) {
    return (
      <SafeAreaView style={styles.container}>
        <WelcomeHeader username={state.userProfile?.username} />
        <InsightsLoadingState />
      </SafeAreaView>
    );
  }

  // Show empty state if no training data
  if (!hasData) {
    return (
      <SafeAreaView style={styles.container}>
        <WelcomeHeader username={state.userProfile?.username} />
        <InsightsEmptyState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WelcomeHeader username={state.userProfile?.username} />
      <InsightsContent
        refreshing={refreshing}
        onRefresh={onRefresh}
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
