import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { validateExerciseSearch } from '../../../utils/validation';

interface SearchBarProps {
  searchQuery: string;
  onQueryChange: (query: string) => void;
  onToggleFilters: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onQueryChange,
  onToggleFilters,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.input}
          placeholder="Search for exercises..."
          value={searchQuery}
          onChangeText={(text) => {
            // Validate search input
            const validationResult = validateExerciseSearch(text);
            if (validationResult.isValid) {
              onQueryChange(validationResult.searchTerm || text);
            } else {
              // If invalid, use empty string (validation allows empty search)
              onQueryChange('');
            }
          }}
          placeholderTextColor={colors.muted}
          maxLength={100}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onQueryChange('')}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity style={styles.filterButton} onPress={onToggleFilters}>
        <Ionicons name="options-outline" size={20} color={colors.secondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

