/**
 * Enhanced Home Screen - Main dashboard with Swift HomeView structure
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StyleSheet, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { ExpoNavigation } from '@/src/utils/expoNavigationHelpers';
import { useHomeData } from '@/src/hooks/useHomeData';
import { InsightsAnalyticsService } from '@/src/services/insightsAnalyticsService';

// Home Components
import { WelcomeHeader } from '@/src/components/home/WelcomeHeader';
import { ProgressSummary } from '@/src/components/home/ProgressSummary';
import { TodaysTraining } from '@/src/components/home/TodaysTraining';
import { AIInsightsCard } from '@/src/components/home/AIInsightsCard';
import { RecentActivity } from '@/src/components/home/RecentActivity';

export const HomeScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const homeData = useHomeData();
  const router = useRouter();
  const [insightsData, setInsightsData] = useState<{
    weeklyVolume: number | undefined;
    eti: number | undefined;
    msi: number | undefined;
  }>({
    weeklyVolume: undefined,
    eti: undefined,
    msi: undefined,
  });

  const loadInsights = useCallback(async () => {
    if (!authState.userProfile?.id) return;

    try {
      const localPlan = authState.trainingPlan;
      
      const [
        weeklyVolumeResult,
        performanceScoreResult,
        weakPointsResult,
      ] = await Promise.all([
        InsightsAnalyticsService.getWeeklyVolumeTrend(authState.userProfile.id, localPlan),
        InsightsAnalyticsService.getPerformanceScoreTrend(authState.userProfile.id, localPlan),
        InsightsAnalyticsService.getWeakPointsAnalysis(authState.userProfile.id, localPlan),
      ]);

      const weeklyVolume = weeklyVolumeResult.success && weeklyVolumeResult.data && weeklyVolumeResult.data.length > 0
        ? weeklyVolumeResult.data[weeklyVolumeResult.data.length - 1]?.volume
        : undefined;

      const eti = performanceScoreResult.success && performanceScoreResult.data && performanceScoreResult.data.length > 0
        ? performanceScoreResult.data[performanceScoreResult.data.length - 1]?.score
        : undefined;

      const msi = weakPointsResult.success && weakPointsResult.data && weakPointsResult.data.length > 0
        ? weakPointsResult.data.reduce((sum, item) => {
            const strengthScore = 100 - item.metrics.current;
            return sum + strengthScore;
          }, 0) / weakPointsResult.data.length
        : undefined;

      setInsightsData({ weeklyVolume, eti, msi });
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  }, [authState.userProfile?.id, authState.trainingPlan]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleStartTraining = () => {
    console.log('Starting training...');
    ExpoNavigation.goToTrainings();
  };

  const handleViewInsights = () => {
    console.log('Navigating to insights...');
    router.push('/(tabs)/insights');
  };


  // Loading state - matches Swift implementation
  if (homeData.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No training plan state - matches Swift implementation
  if (!authState.trainingPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="home" size={60} color={colors.primary} />
          <Text style={styles.emptyTitle}>Welcome to EvolveAI!</Text>
          <Text style={styles.emptySubtitle}>
            Let's get started by creating your first training plan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main content - matches Swift HomeContentView
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <WelcomeHeader username={authState.userProfile?.username} />
        <ProgressSummary 
          streak={homeData.streak}
          weeklyTrainings={homeData.weeklyTrainings}
          goalProgress={homeData.goalProgress}
        />
        <TodaysTraining 
          training={homeData.todaysTraining}
          onStartTraining={handleStartTraining}
        />
        <AIInsightsCard 
          weeklyVolume={insightsData.weeklyVolume}
          eti={insightsData.eti}
          msi={insightsData.msi}
          onViewInsights={handleViewInsights} 
        />
        <RecentActivity activities={homeData.recentActivity} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
