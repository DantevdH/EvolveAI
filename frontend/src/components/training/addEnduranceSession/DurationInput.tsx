import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { UnitPicker } from '../addExerciseModal/UnitPicker';

interface DurationInputProps {
  duration: string;
  unit: string;
  availableUnits: string[];
  showUnitPicker: boolean;
  onDurationChange: (duration: string) => void;
  onUnitChange: (unit: string) => void;
  onToggleUnitPicker: () => void;
}

export const DurationInput: React.FC<DurationInputProps> = ({
  duration,
  unit,
  availableUnits,
  showUnitPicker,
  onDurationChange,
  onUnitChange,
  onToggleUnitPicker,
}) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Duration</Text>
      <View style={styles.durationRow}>
        <TextInput
          style={styles.numberInput}
          value={duration}
          onChangeText={onDurationChange}
          placeholder="30"
          keyboardType="numeric"
          placeholderTextColor={colors.muted}
        />
        <View style={styles.unitPickerContainer}>
          <TouchableOpacity
            style={styles.picker}
            onPress={onToggleUnitPicker}
          >
            <Text style={styles.pickerText}>{unit}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </TouchableOpacity>
          {showUnitPicker && (
            <View style={styles.pickerOptions}>
              {availableUnits.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.pickerOption,
                    unit === u && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    onUnitChange(u);
                    onToggleUnitPicker();
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      unit === u && styles.pickerOptionTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                  {unit === u && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numberInput: {
    flex: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  unitPickerContainer: {
    flex: 1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  pickerOptions: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.background,
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

