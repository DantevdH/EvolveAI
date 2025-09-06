/**
 * Equipment Access screen - Sixth step of onboarding
 */

import React, { useEffect } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';;
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingCard, OnboardingNavigation, OptionSelector, OnboardingBackground } from '../../components/onboarding';
import { equipmentOptions, EquipmentType } from '../../types/onboarding';

export const EquipmentAccessScreen: React.FC = () => {
  const { state, updateData } = useOnboarding();

  // Auto-select first equipment option if none is selected
  useEffect(() => {
    if (state.data.equipment.length === 0 && equipmentOptions.length > 0) {
      updateData({ equipment: [equipmentOptions[0].value] });
    }
  }, [state.data.equipment, updateData]);

  const handleEquipmentChange = (values: string[]) => {
    // Only allow single selection - take the first value if multiple are selected
    if (values.length > 0) {
      updateData({ equipment: [values[0] as EquipmentType] });
    } else {
      updateData({ equipment: [] });
    }
  };

  const options = equipmentOptions.map(equipment => ({
    value: equipment.value,
    title: equipment.title,
    description: equipment.description,
    icon: equipment.icon
  }));

  return (
    <View style={styles.container}>
      <OnboardingBackground />
        
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
              multiple={false}
              columns={2}
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
