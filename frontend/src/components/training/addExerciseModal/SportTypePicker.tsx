import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { SPORT_TYPES } from './constants';

interface SportTypePickerProps {
  sportType: string;
  onSelect: (type: string) => void;
  showPicker: boolean;
  onTogglePicker: () => void;
}

export const SportTypePicker: React.FC<SportTypePickerProps> = ({
  sportType,
  onSelect,
  showPicker,
  onTogglePicker,
}) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Sport Type</Text>
      <TouchableOpacity style={styles.picker} onPress={onTogglePicker}>
        <Text style={styles.pickerText}>
          {sportType.charAt(0).toUpperCase() + sportType.slice(1).replace('_', ' ')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.pickerOptions}>
          <ScrollView 
            style={styles.pickerScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {SPORT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerOption,
                  sportType === type && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  onSelect(type);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    sportType === type && styles.pickerOptionTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </Text>
                {sportType === type && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  pickerScrollView: {
    maxHeight: 300,
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

