import { Exercise } from '../../../types/training';
import { ExerciseSearchResult, ExerciseSearchFilters } from '../../../services/exerciseSwapService';

export const filterExercises = (
  allExercises: Exercise[] | null,
  searchQuery: string,
  filters: ExerciseSearchFilters
): ExerciseSearchResult[] => {
  if (!allExercises || allExercises.length === 0) {
    return [];
  }

  let filtered = [...allExercises];

  // Apply text search
  if (searchQuery.trim()) {
    const queryLower = searchQuery.toLowerCase();
    filtered = filtered.filter(ex => 
      ex.name?.toLowerCase().includes(queryLower) ||
      ex.target_area?.toLowerCase().includes(queryLower) ||
      ex.equipment?.toLowerCase().includes(queryLower)
    );
  }

  // Apply filters
  if (filters.target_area) {
    filtered = filtered.filter(ex => ex.target_area === filters.target_area);
  }

  if (filters.equipment) {
    filtered = filtered.filter(ex => ex.equipment === filters.equipment);
  }

  if (filters.difficulty) {
    filtered = filtered.filter(ex => ex.difficulty === filters.difficulty);
  }

  // Sort alphabetically
  filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Convert to ExerciseSearchResult format
  return filtered.map(ex => ({
    exercise: ex,
    relevanceScore: 1, // Not used for client-side filtering
  }));
};

