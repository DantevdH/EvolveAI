import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseSearchResult } from '../../../services/exerciseSwapService';
import { Exercise } from '../../../types/training';
import { SearchBar } from '../addExerciseModal/SearchBar';
import { FiltersSection } from '../addExerciseModal/FiltersSection';
import { FilterOptions } from '../addExerciseModal/types';

interface SearchTabProps {
  searchQuery: string;
  filters: any;
  showFilters: boolean;
  filterOptions: FilterOptions;
  searchResults: ExerciseSearchResult[];
  loadingSearch: boolean;
  onQueryChange: (query: string) => void;
  onToggleFilters: () => void;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  searchQuery,
  filters,
  showFilters,
  filterOptions,
  searchResults,
  loadingSearch,
  onQueryChange,
  onToggleFilters,
  onFilterChange,
  onClearFilters,
  onSelectExercise,
}) => {
  return (
    <View style={styles.container}>
      <SearchBar
        searchQuery={searchQuery}
        onQueryChange={onQueryChange}
        onToggleFilters={onToggleFilters}
      />
      <FiltersSection
        showFilters={showFilters}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {loadingSearch ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching exercises...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          searchResults.map((result) => (
            <TouchableOpacity
              key={result.exercise.id}
              style={styles.resultCard}
              onPress={() => onSelectExercise(result.exercise)}
            >
              <View style={styles.resultHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">
                    {result.exercise.name}
                  </Text>
                  <Text style={styles.exerciseDetails}>
                    {result.exercise.equipment} • {result.exercise.difficulty}
                  </Text>
                  {result.exercise.target_area && (
                    <Text style={styles.targetArea}>{result.exercise.target_area}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={() => onSelectExercise(result.exercise)}
                >
                  <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : searchQuery.trim() ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color={colors.muted} />
            <Text style={styles.noResultsText}>No exercises found</Text>
            <Text style={styles.noResultsSubtext}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color={colors.muted} />
            <Text style={styles.noResultsText}>Search for exercises</Text>
            <Text style={styles.noResultsSubtext}>Enter a name, muscle group, or equipment type</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 16,
  },
  results: {
    paddingHorizontal: 16,
  },
  resultCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: colors.muted,
  },
  targetArea: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  swapButton: {
    padding: 8,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});

