import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { CoolSlider } from '../../onboarding/inputs';
import { SportTypePicker } from './SportTypePicker';
import { UnitPicker } from './UnitPicker';
import { HeartRateZoneSelector } from './HeartRateZoneSelector';
import { getSliderRange } from './constants';

interface EnduranceFormProps {
  sportType: string;
  duration: number;
  unit: string;
  heartRateZone: number;
  name: string;
  description: string;
  availableUnits: string[];
  showSportTypePicker: boolean;
  showUnitPicker: boolean;
  onSportTypeChange: (type: string) => void;
  onUnitChange: (unit: string) => void;
  onDurationChange: (duration: number) => void;
  onHeartRateZoneChange: (zone: number) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onToggleSportTypePicker: () => void;
  onToggleUnitPicker: () => void;
  isValid: boolean;
  onSubmit: () => void;
}

export const EnduranceForm: React.FC<EnduranceFormProps> = ({
  sportType,
  duration,
  unit,
  heartRateZone,
  name,
  description,
  availableUnits,
  showSportTypePicker,
  showUnitPicker,
  onSportTypeChange,
  onUnitChange,
  onDurationChange,
  onHeartRateZoneChange,
  onNameChange,
  onDescriptionChange,
  onToggleSportTypePicker,
  onToggleUnitPicker,
  isValid,
  onSubmit,
}) => {
  const sliderRange = getSliderRange(unit);

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
      <SportTypePicker
        sportType={sportType}
        onSelect={onSportTypeChange}
        showPicker={showSportTypePicker}
        onTogglePicker={onToggleSportTypePicker}
      />

      <UnitPicker
        unit={unit}
        availableUnits={availableUnits}
        onSelect={onUnitChange}
        showPicker={showUnitPicker}
        onTogglePicker={onToggleUnitPicker}
      />

      <View style={styles.field}>
        <View style={styles.sliderContainer}>
          <CoolSlider
            value={duration}
            onValueChange={onDurationChange}
            min={sliderRange.min}
            max={sliderRange.max}
            step={sliderRange.step}
            unit={unit}
            title={unit === 'minutes' ? 'Duration' : 'Volume'}
            size="small"
            style={styles.slider}
          />
        </View>
      </View>

      <HeartRateZoneSelector
        heartRateZone={heartRateZone}
        onSelect={onHeartRateZoneChange}
      />

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={onNameChange}
          placeholder="e.g., Morning Run"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Add any notes about this session..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity 
        style={[
          styles.addButton,
          !isValid && styles.addButtonDisabled
        ]} 
        onPress={onSubmit}
        disabled={!isValid}
      >
        <Text style={[
          styles.addButtonText,
          !isValid && styles.addButtonTextDisabled
        ]}>Add Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  sliderContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  slider: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  textInput: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  addButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  addButtonTextDisabled: {
    color: colors.muted,
  },
});

