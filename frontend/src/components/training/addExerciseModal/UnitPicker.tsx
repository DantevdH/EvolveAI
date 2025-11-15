import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';

interface UnitPickerProps {
  unit: string;
  availableUnits: string[];
  onSelect: (unit: string) => void;
  showPicker: boolean;
  onTogglePicker: () => void;
}

export const UnitPicker: React.FC<UnitPickerProps> = ({
  unit,
  availableUnits,
  onSelect,
  showPicker,
  onTogglePicker,
}) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Unit</Text>
      <TouchableOpacity style={styles.picker} onPress={onTogglePicker}>
        <Text style={styles.pickerText}>{unit}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.pickerOptions}>
          {availableUnits.map((u) => (
            <TouchableOpacity
              key={u}
              style={[
                styles.pickerOption,
                unit === u && styles.pickerOptionActive,
              ]}
              onPress={() => {
                onSelect(u);
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
    maxHeight: 300,
    overflow: 'hidden',
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

