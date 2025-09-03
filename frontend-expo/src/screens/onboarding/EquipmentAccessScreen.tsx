/**
 * Equipment Access screen - Sixth step of onboarding
 */

import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionSelector } from '../../components/onboarding';
import { equipmentOptions } from '../../types/onboarding';

export const EquipmentAccessScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();

  const handleEquipmentChange = (values: string[]) => {
    updateData({ equipment: values as any });
  };

  const options = equipmentOptions.map(equipment => ({
    value: equipment.value,
    title: equipment.title,
    description: equipment.description,
    icon: equipment.icon
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
          title="Equipment Access"
          subtitle="What equipment do you have available?"
          scrollable={true}
        >
          <View style={styles.content}>
            <OptionSelector
              options={options}
              selectedValues={state.data.equipment}
              onSelectionChange={handleEquipmentChange}
              multiple={true}
              columns={2}
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
