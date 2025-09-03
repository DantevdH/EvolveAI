/**
 * Time Availability screen - Seventh step of onboarding
 */

import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, DaysPerWeekSlider, MinutesPerSessionSlider } from '../../components/onboarding';

export const TimeAvailabilityScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();

  const handleDaysPerWeekChange = (days: number) => {
    updateData({ daysPerWeek: days });
  };

  const handleMinutesPerSessionChange = (minutes: number) => {
    updateData({ minutesPerSession: minutes });
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
        <OnboardingCard
          title="Time Availability"
          subtitle="How much time can you dedicate to fitness?"
          scrollable={true}
        >
          <View style={styles.content}>
            {/* Days Per Week */}
            <View style={styles.sliderContainer}>
              <DaysPerWeekSlider
                value={state.data.daysPerWeek}
                onValueChange={handleDaysPerWeekChange}
              />
            </View>

            {/* Minutes Per Session */}
            <View style={styles.sliderContainer}>
              <MinutesPerSessionSlider
                value={state.data.minutesPerSession}
                onValueChange={handleMinutesPerSessionChange}
              />
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Your Schedule</Text>
                <Text style={styles.summaryText}>
                  {state.data.daysPerWeek} {state.data.daysPerWeek === 1 ? 'day' : 'days'} per week
                </Text>
                <Text style={styles.summaryText}>
                  {state.data.minutesPerSession} minutes per session
                </Text>
                <Text style={styles.summaryTotal}>
                  Total: {state.data.daysPerWeek * state.data.minutesPerSession} minutes per week
                </Text>
              </View>
            </View>
          </View>

          <OnboardingNavigation />
        </OnboardingCard>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sliderContainer: {
    marginBottom: 32,
  },
  summaryContainer: {
    marginTop: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(147, 35, 34, 0.2)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(147, 35, 34, 0.3)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#932322',
    textAlign: 'center',
    marginTop: 8,
  },
});
