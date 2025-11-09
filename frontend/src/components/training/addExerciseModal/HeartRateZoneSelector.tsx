import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';

interface HeartRateZoneSelectorProps {
  heartRateZone: number;
  onSelect: (zone: number) => void;
}

export const HeartRateZoneSelector: React.FC<HeartRateZoneSelectorProps> = ({
  heartRateZone,
  onSelect,
}) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Heart Rate Zone</Text>
      <View style={styles.zoneContainer}>
        {[1, 2, 3, 4, 5].map((zone) => (
          <TouchableOpacity
            key={zone}
            style={[
              styles.zoneButton,
              heartRateZone === zone && styles.zoneButtonActive,
            ]}
            onPress={() => onSelect(zone)}
          >
            <Text
              style={[
                styles.zoneButtonText,
                heartRateZone === zone && styles.zoneButtonTextActive,
              ]}
            >
              {zone}
            </Text>
            {heartRateZone === zone && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
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
  zoneContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  zoneButton: {
    flex: 1,
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 8,
  },
  zoneButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  zoneButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  zoneButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

