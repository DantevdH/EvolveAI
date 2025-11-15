import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseSearchResult } from '../../../services/exerciseSwapService';
import { Exercise } from '../../../types/training';

interface SearchResultsProps {
  exercises: Exercise[] | null;
  loadingResults: boolean;
  searchResults: ExerciseSearchResult[];
  onSelectExercise: (exercise: Exercise) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  exercises,
  loadingResults,
  searchResults,
  onSelectExercise,
}) => {
  if (exercises === null || loadingResults) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  if (searchResults.length === 0) {
    return (
      <View style={styles.noResultsContainer}>
        <Ionicons name="search-outline" size={48} color={colors.muted} />
        <Text style={styles.noResultsText}>No exercises found</Text>
        <Text style={styles.noResultsSubtext}>
          Try adjusting your search or filters
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.results}>
      {searchResults.map((result, index) => (
        <TouchableOpacity
          key={`${result.exercise.id}-${index}`}
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
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => onSelectExercise(result.exercise)}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
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
    fontSize: 12,
    color: colors.muted,
  },
  addButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

