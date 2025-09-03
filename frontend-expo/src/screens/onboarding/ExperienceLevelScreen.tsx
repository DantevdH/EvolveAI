/**
 * Experience Level screen - Fifth step of onboarding
 */

import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionList } from '../../components/onboarding';
import { experienceLevels } from '../../types/onboarding';
import { colors } from '../../constants/colors';

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
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dimmingOverlay} />
        
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
});
