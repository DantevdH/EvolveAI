// Exercise Swap Modal - AI recommendations and exercise search
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Exercise } from '../../types/training';
import { ExerciseSwapService, ExerciseRecommendation, ExerciseSearchResult, ExerciseSearchFilters } from '../../services/exerciseSwapService';
import ConfirmationDialog from '../shared/ConfirmationDialog';

// Constants
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_RECOMMENDATION_LIMIT = 3;

interface ExerciseSwapModalProps {
  visible: boolean;
  currentExercise: Exercise;
  onClose: () => void;
  onSwapExercise: (newExercise: Exercise) => void;
  scheduledExerciseIds?: string[];
  scheduledExerciseNames?: string[];
}

const ExerciseSwapModal: React.FC<ExerciseSwapModalProps> = ({
  visible,
  currentExercise,
  onClose,
  onSwapExercise,
  scheduledExerciseIds = [],
  scheduledExerciseNames = [],
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'search'>('ai');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState<ExerciseRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  
  // Search Results
  const [searchResults, setSearchResults] = useState<ExerciseSearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Filter Options
  const [filterOptions, setFilterOptions] = useState<{
    targetAreas: string[];
    equipment: string[];
    difficulties: string[];
  }>({ targetAreas: [], equipment: [], difficulties: [] });

  // Confirm swap dialog
  const [pendingSwapExercise, setPendingSwapExercise] = useState<Exercise | null>(null);
  const [showConfirmSwap, setShowConfirmSwap] = useState(false);

  // Load AI recommendations when modal opens
  useEffect(() => {
    if (visible && activeTab === 'ai') {
      loadAIRecommendations();
    }
  }, [visible, activeTab]);

  // Load filter options when modal opens
  useEffect(() => {
    if (visible) {
      loadFilterOptions();
    }
  }, [visible]);

  // Search exercises when query or filters change
  useEffect(() => {
    if (activeTab === 'search') {
      const timeoutId = setTimeout(() => {
        if (searchQuery.trim()) {
          searchExercises();
        } else {
          // When search query is empty, show all exercises
          loadAllExercises();
        }
      }, SEARCH_DEBOUNCE_MS); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, filters, activeTab]);

  const loadAIRecommendations = async () => {
    if (!currentExercise) {
      console.error('Cannot load recommendations: currentExercise is null');
      return;
    }

    setLoadingRecommendations(true);
    try {
      const result = await ExerciseSwapService.getExerciseRecommendations(
        currentExercise, 
        DEFAULT_RECOMMENDATION_LIMIT, 
        scheduledExerciseIds, 
        scheduledExerciseNames
      );
      
      if (result.success && result.data) {
        setAiRecommendations(result.data);
      } else {
        console.error('Failed to load AI recommendations:', result.error);
        setAiRecommendations([]); // Clear previous recommendations on error
      }
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
      setAiRecommendations([]); // Clear previous recommendations on error
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadAllExercises = async () => {
    setLoadingSearch(true);
    try {
      const result = await ExerciseSwapService.searchExercises('', filters);
      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        console.error('Failed to load all exercises:', result.error);
        setSearchResults([]); // Clear previous results on error
      }
    } catch (error) {
      console.error('Failed to load all exercises:', error);
      setSearchResults([]); // Clear previous results on error
    } finally {
      setLoadingSearch(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const result = await ExerciseSwapService.getFilterOptions();
      if (result.success && result.data) {
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const searchExercises = async () => {
    setLoadingSearch(true);
    try {
      const result = await ExerciseSwapService.searchExercises(searchQuery.trim(), filters, 20);
      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        console.error('Failed to search exercises:', result.error);
      }
    } catch (error) {
      console.error('Error searching exercises:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSwapExercise = (exercise: Exercise) => {
    setPendingSwapExercise(exercise);
    setShowConfirmSwap(true);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderAIRecommendations = () => (
    <View style={styles.tabContent}>


      {loadingRecommendations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI is analyzing exercises...</Text>
        </View>
      ) : (
        <ScrollView style={styles.recommendationsList} showsVerticalScrollIndicator={false}>
          {aiRecommendations.map((recommendation, index) => (
            <TouchableOpacity
              key={recommendation.exercise.id}
              style={styles.recommendationCard}
              onPress={() => handleSwapExercise(recommendation.exercise)}
            >
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationBadge}>
                  <Text style={styles.recommendationBadgeText}>#{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">{recommendation.exercise.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {recommendation.exercise.equipment} • {recommendation.exercise.difficulty}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={() => handleSwapExercise(recommendation.exercise)}
                >
                  <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
    
              <View style={styles.muscleInfo}>
                <Text style={styles.muscleLabel}>Primary Muscles:</Text>
                <Text style={styles.muscleText}>
                  {recommendation.exercise.main_muscles?.join(', ') || 'Not specified'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.muted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
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
                  onPress={() =>
                    setFilters(prev => ({
                      ...prev,
                      target_area: prev.target_area === area ? undefined : area,
                    }))
                  }
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
                  onPress={() =>
                    setFilters(prev => ({
                      ...prev,
                      equipment: prev.equipment === equip ? undefined : equip,
                    }))
                  }
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
              {filterOptions.difficulties.map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.filterChip,
                    filters.difficulty === difficulty && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setFilters(prev => ({
                      ...prev,
                      difficulty: prev.difficulty === difficulty ? undefined : difficulty,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.difficulty === difficulty && styles.filterChipTextActive,
                    ]}
                  >
                    {difficulty}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Ionicons name="refresh" size={16} color={colors.muted} />
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results */}
      <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
        {loadingSearch ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching exercises...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          searchResults.map((result) => (
            <TouchableOpacity
              key={result.exercise.id}
              style={styles.searchResultCard}
              onPress={() => handleSwapExercise(result.exercise)}
            >
              <View style={styles.resultHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">{result.exercise.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {result.exercise.equipment} • {result.exercise.difficulty}
                  </Text>
                  {result.exercise.target_area && (
                    <Text style={styles.targetArea}>{result.exercise.target_area}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={() => handleSwapExercise(result.exercise)}
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Swap Exercise</Text>
            <Text style={styles.headerSubtitle}>Pick a better match or search the library</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Current Exercise Info */}
        <View style={styles.currentExerciseContainer}>
          <Text style={styles.currentExerciseLabel}>Current Exercise:</Text>
          <Text style={styles.currentExerciseName}>{currentExercise.name}</Text>
          <Text style={styles.currentExerciseDetails}>
            {currentExercise.equipment} • {currentExercise.difficulty}
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ai' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={activeTab === 'ai' ? colors.primary : colors.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'ai' && styles.tabButtonTextActive,
              ]}
            >
              AI Recommendations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'search' && styles.tabButtonActive]}
            onPress={() => setActiveTab('search')}
          >
            <Ionicons
              name="search"
              size={20}
              color={activeTab === 'search' ? colors.primary : colors.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'search' && styles.tabButtonTextActive,
              ]}
            >
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>
            {activeTab === 'ai' ? 'Suggested alternatives' : 'Browse & filter'}
          </Text>
        </View>
        {activeTab === 'ai' ? renderAIRecommendations() : renderSearchTab()}
      </SafeAreaView>
      <ConfirmationDialog
        visible={showConfirmSwap}
        title={undefined}
        message={`${currentExercise.name}\n↓\n${pendingSwapExercise?.name || ''}`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={() => {
          if (pendingSwapExercise) {
            onSwapExercise(pendingSwapExercise);
          }
          setShowConfirmSwap(false);
          setPendingSwapExercise(null);
          onClose();
        }}
        onCancel={() => {
          setShowConfirmSwap(false);
          setPendingSwapExercise(null);
        }}
        confirmButtonColor={colors.primary}
        icon={undefined}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTextBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  placeholder: {
    width: 32,
  },
  currentExerciseContainer: {
    padding: 16,
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  currentExerciseLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  currentExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  currentExerciseDetails: {
    fontSize: 14,
    color: colors.muted,
  },
  tabNavigation: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
    marginTop: 16,
  },
  aiHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  aiHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  aiSubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  recommendationsList: {
    paddingHorizontal: 16,
  },
  recommendationCard: {
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
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recommendationBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  recommendationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
  recommendationReason: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
  },
  muscleInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  muscleLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  muscleText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
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
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: colors.muted,
  },
  searchResults: {
    paddingHorizontal: 16,
  },
  searchResultCard: {
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
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default ExerciseSwapModal;
