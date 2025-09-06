/**
 * Time Availability screen - Seventh step of onboarding
 */

import { ImageBackground, StyleSheet, Text, View } from 'react-native';;
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, DaysPerWeekSlider, MinutesPerSessionSlider, OnboardingBackground } from '../../components/onboarding';

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
      <OnboardingBackground />
        
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
          </View>

          <OnboardingNavigation />
        </OnboardingCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
