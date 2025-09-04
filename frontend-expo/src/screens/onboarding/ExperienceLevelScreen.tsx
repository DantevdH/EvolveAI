/**
 * Experience Level screen - Fifth step of onboarding
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionList, OnboardingBackground } from '../../components/onboarding';
import { experienceLevels } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

export const ExperienceLevelScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();

  const handleExperienceChange = (values: string[]) => {
    if (values.length > 0) {
      updateData({ experienceLevel: values[0] as any });
    }
  };

  const options = experienceLevels.map(level => ({
    value: level.value,
    title: level.title,
    description: level.description,
    icon: 'dumbbell.fill'
  }));

  return (
    <View style={styles.container}>
      <OnboardingBackground />
        
        <OnboardingCard
          title="Experience Level"
          subtitle="How would you describe your fitness experience?"
          scrollable={true}
        >
          <View style={styles.content}>
            <OptionList
              options={options}
              selectedValues={state.data.experienceLevel ? [state.data.experienceLevel] : []}
              onSelectionChange={handleExperienceChange}
              multiple={false}
            />
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
});
