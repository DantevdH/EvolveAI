import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseSearchFilters } from '../../../services/exerciseSwapService';
import { FilterOptions } from './types';

interface FiltersSectionProps {
  showFilters: boolean;
  filters: ExerciseSearchFilters;
  filterOptions: FilterOptions;
  onFilterChange: (filters: ExerciseSearchFilters) => void;
  onClearFilters: () => void;
}

export const FiltersSection: React.FC<FiltersSectionProps> = ({
  showFilters,
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
}) => {
  if (!showFilters) {
    return null;
  }

  const handleFilterToggle = (type: 'target_area' | 'equipment' | 'difficulty', value: string) => {
    onFilterChange({
      ...filters,
      [type]: filters[type] === value ? undefined : value,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Target Area:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterOptions.targetAreas.map((area) => (
            <TouchableOpacity
              key={area}
              style={[
                styles.filterChip,
                filters.target_area === area && styles.filterChipActive,
              ]}
              onPress={() => handleFilterToggle('target_area', area)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.target_area === area && styles.filterChipTextActive,
                ]}
              >
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Equipment:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterOptions.equipment.map((equip) => (
            <TouchableOpacity
              key={equip}
              style={[
                styles.filterChip,
                filters.equipment === equip && styles.filterChipActive,
              ]}
              onPress={() => handleFilterToggle('equipment', equip)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.equipment === equip && styles.filterChipTextActive,
                ]}
              >
                {equip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Difficulty:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterOptions.difficulties.map((diff) => (
            <TouchableOpacity
              key={diff}
              style={[
                styles.filterChip,
                filters.difficulty === diff && styles.filterChipActive,
              ]}
              onPress={() => handleFilterToggle('difficulty', diff)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.difficulty === diff && styles.filterChipTextActive,
                ]}
              >
                {diff}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.clearButton} onPress={onClearFilters}>
        <Ionicons name="close-circle" size={16} color={colors.muted} />
        <Text style={styles.clearText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.muted,
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 14,
    color: colors.muted,
  },
});

