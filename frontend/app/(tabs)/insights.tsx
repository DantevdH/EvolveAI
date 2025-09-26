import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { InsightsAnalyticsService } from '@/src/services/insightsAnalyticsService';
import { VolumeTrendChart } from '@/src/components/insights/VolumeTrendChart';
import { PerformanceScoreChart } from '@/src/components/insights/PerformanceScoreChart';
import { TopPerformingExercises } from '@/src/components/insights/TopPerformingExercises';
import { WeakPointsAnalysis } from '@/src/components/insights/WeakPointsAnalysis';
import { ForecastAndMilestones } from '@/src/components/insights/ForecastAndMilestones';
import { colors } from '@/src/constants/colors';

export default function InsightsScreen() {
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [weeklyVolumeData, setWeeklyVolumeData] = useState<any[]>([]);
  const [performanceScoreData, setPerformanceScoreData] = useState<any[]>([]);
  const [topPerformingExercises, setTopPerformingExercises] = useState<any[]>([]);
  const [weakPoints, setWeakPoints] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [milestoneData, setMilestoneData] = useState<any[]>([]);

  useEffect(() => {
    if (state.userProfile?.id) {
      loadAllInsights();
    }
  }, [state.userProfile?.id]);

  const loadAllInsights = async () => {
    if (!state.userProfile?.id) return;
    
    setLoading(true);
    try {
      console.log('Loading comprehensive insights...');
      
      // Load all insights in parallel for better performance
      const [
        weeklyVolumeResult,
        performanceScoreResult,
        topExercisesResult,
        weakPointsResult,
        forecastResult,
        milestoneResult
      ] = await Promise.all([
        InsightsAnalyticsService.getWeeklyVolumeTrend(state.userProfile.id),
        InsightsAnalyticsService.getPerformanceScoreTrend(state.userProfile.id),
        InsightsAnalyticsService.getTopPerformingExercises(state.userProfile.id),
        InsightsAnalyticsService.getWeakPointsAnalysis(state.userProfile.id),
        InsightsAnalyticsService.getFourWeekForecast(state.userProfile.id),
        InsightsAnalyticsService.getMilestonePredictions(state.userProfile.id)
      ]);

      // Set data states
      if (weeklyVolumeResult.success) setWeeklyVolumeData(weeklyVolumeResult.data || []);
      if (performanceScoreResult.success) setPerformanceScoreData(performanceScoreResult.data || []);
      if (topExercisesResult.success) setTopPerformingExercises(topExercisesResult.data || []);
      if (weakPointsResult.success) setWeakPoints(weakPointsResult.data || []);
      if (forecastResult.success) setForecastData(forecastResult.data || []);
      if (milestoneResult.success) setMilestoneData(milestoneResult.data || []);

      console.log('Insights loaded successfully');
      
    } catch (error) {
      console.error('Error loading insights:', error);
      Alert.alert('Error', 'Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Clear cache before refreshing
    InsightsAnalyticsService.clearCache();
    await loadAllInsights();
    setRefreshing(false);
  };

  const handleExercisePress = (exercise: any) => {
    console.log('Exercise pressed:', exercise.name);
    // TODO: Navigate to exercise detail view
  };

  const handleWeakPointPress = (weakPoint: any) => {
    console.log('Weak point pressed:', weakPoint.exercise.name);
    // TODO: Navigate to exercise detail or show recommendations
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading comprehensive insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if we have any data at all
  const hasData = weeklyVolumeData.length > 0 || topPerformingExercises.length > 0;

  if (!hasData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>
            Complete some workouts to unlock your personalized insights and analytics dashboard.
          </Text>
          <View style={styles.emptyActions}>
            <Text style={styles.emptyActionText}>
              📊 Volume trends and progress charts
            </Text>
            <Text style={styles.emptyActionText}>
              🎯 Performance analysis and weak points
            </Text>
            <Text style={styles.emptyActionText}>
              🔮 Predictive insights and milestones
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights Dashboard</Text>
          <Text style={styles.subtitle}>Advanced fitness analytics and predictions</Text>
        </View>

        {/* Volume Trend Chart */}
        {weeklyVolumeData.length > 0 && (
          <VolumeTrendChart data={weeklyVolumeData} />
        )}

        {/* Performance Analysis */}
        {performanceScoreData.length > 0 && (
          <PerformanceScoreChart data={performanceScoreData} />
        )}


        {/* Top Performing Exercises */}
        {topPerformingExercises.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>AI Top Performers</Text>
            </View>
            <TopPerformingExercises 
              data={topPerformingExercises}
              onExercisePress={handleExercisePress}
            />
          </View>
        )}

        {/* Weak Points Analysis */}
        <WeakPointsAnalysis 
          data={weakPoints}
          onExercisePress={handleWeakPointPress}
        />

        {/* Forecast and Milestones */}
        {(forecastData.length > 0 || milestoneData.length > 0) && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>AI Predictions & Milestones</Text>
            </View>
            <ForecastAndMilestones 
              forecastData={forecastData}
              milestoneData={milestoneData}
            />
          </View>
        )}


        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyActions: {
    gap: 8,
  },
  emptyActionText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
  },
  sectionContainer: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 100,
  },
});