import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ForecastAndMilestones } from '@/src/components/insights/forecastAndMilestones';
import { colors } from '@/src/constants/colors';

type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function InsightsScreen() {
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');
  const lastPlanUpdateRef = useRef<string | null>(null);
  
  // Data states
  const [weeklyVolumeData, setWeeklyVolumeData] = useState<any[]>([]);
  const [performanceScoreData, setPerformanceScoreData] = useState<any[]>([]);
  const [topPerformingExercises, setTopPerformingExercises] = useState<any[]>([]);
  const [weakPoints, setWeakPoints] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [milestoneData, setMilestoneData] = useState<any[]>([]);

  const loadAllInsights = useCallback(async () => {
    if (!state.userProfile?.id) return;
    
    setLoading(true);
    try {
      console.log('Loading comprehensive insights...');
      
      // Use local training plan from AuthContext for real-time insights
      const localPlan = state.trainingPlan;
      
      // Load all insights in parallel for better performance
      const [
        weeklyVolumeResult,
        performanceScoreResult,
        topExercisesResult,
        weakPointsResult,
        forecastResult,
        milestoneResult
      ] = await Promise.all([
        InsightsAnalyticsService.getWeeklyVolumeTrend(state.userProfile.id, localPlan),
        InsightsAnalyticsService.getPerformanceScoreTrend(state.userProfile.id, localPlan),
        InsightsAnalyticsService.getTopPerformingExercises(state.userProfile.id, localPlan),
        InsightsAnalyticsService.getWeakPointsAnalysis(state.userProfile.id, localPlan),
        InsightsAnalyticsService.getFourWeekForecast(state.userProfile.id, localPlan),
        InsightsAnalyticsService.getMilestonePredictions(state.userProfile.id, localPlan)
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
  }, [state.userProfile?.id, state.trainingPlan]);

  // Track when to reload insights - reload when training plan changes (new completed trainings)
  useEffect(() => {
    if (state.userProfile?.id) {
      // Create an identifier based on completed trainings count and most recent completion date
      // This detects when new trainings are completed
      let planIdentifier: string | number = 'no-plan';
      
      if (state.trainingPlan) {
        const completedTrainings = state.trainingPlan.weeklySchedules
          .flatMap(w => w.dailyTrainings)
          .filter(d => d.completed && d.completedAt);
        
        if (completedTrainings.length > 0) {
          const mostRecentCompleted = completedTrainings
            .map(d => d.completedAt?.getTime() || 0)
            .sort((a, b) => b - a)[0];
          
          // Combine count and most recent date to detect changes
          planIdentifier = `${completedTrainings.length}-${mostRecentCompleted}`;
        } else {
          planIdentifier = 'no-completed';
        }
      }

      // Only reload if the plan identifier changed (new completed training)
      if (lastPlanUpdateRef.current !== planIdentifier) {
        lastPlanUpdateRef.current = planIdentifier;
        loadAllInsights();
      }
    }
  }, [state.userProfile?.id, state.trainingPlan, loadAllInsights]);

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
            Complete some trainings to unlock your personalized insights and analytics dashboard.
          </Text>
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
          <Text style={styles.subtitle}>Advanced training analytics</Text>
        </View>

        {/* Volume Trend Chart */}
        {weeklyVolumeData.length > 0 && (
          <VolumeTrendChart 
            data={weeklyVolumeData} 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        )}

        {/* Performance Analysis */}
        {performanceScoreData.length > 0 && (
          <PerformanceScoreChart 
            data={performanceScoreData} 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  sectionContainer: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
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