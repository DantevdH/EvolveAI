/**
 * Enhanced Home Screen - Main dashboard with Swift HomeView structure
 */

import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { ExpoNavigation } from '@/src/utils/expoNavigationHelpers';
import { useHomeData } from '@/src/hooks/useHomeData';

// Home Components
import { WelcomeHeader } from '@/src/components/home/WelcomeHeader';
import { ProgressSummary } from '@/src/components/home/ProgressSummary';
import { TodaysWorkout } from '@/src/components/home/TodaysWorkout';
import { AIInsightsCard } from '@/src/components/home/AIInsightsCard';
import { RecentActivity } from '@/src/components/home/RecentActivity';

export const HomeScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const homeData = useHomeData();
  const router = useRouter();


  const handleStartWorkout = () => {
    console.log('Starting workout...');
    ExpoNavigation.goToWorkouts();
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

  // No workout plan state - matches Swift implementation
  if (!authState.workoutPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="home" size={60} color={colors.primary} />
          <Text style={styles.emptyTitle}>Welcome to EvolveAI!</Text>
          <Text style={styles.emptySubtitle}>
            Let's get started by creating your first workout plan.
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
          weeklyWorkouts={homeData.weeklyWorkouts}
          goalProgress={homeData.goalProgress}
        />
        <TodaysWorkout 
          workout={homeData.todaysWorkout}
          onStartWorkout={handleStartWorkout}
        />
        <AIInsightsCard onViewInsights={handleViewInsights} />
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
