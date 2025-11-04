// Add Exercise Modal - AI recommendations and exercise search
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Exercise } from '../../types/training';
import { ExerciseSwapService, ExerciseSearchResult, ExerciseSearchFilters } from '../../services/exerciseSwapService';
import { CoolSlider } from '../onboarding/CoolSlider';
import { useAuth } from '../../context/AuthContext';

// Constants
const SEARCH_DEBOUNCE_MS = 300;

// Sport types
const SPORT_TYPES = [
  'running',
  'cycling',
  'swimming',
  'rowing',
  'hiking',
  'walking',
  'elliptical',
  'stair_climbing',
  'jump_rope',
  'other',
];

// Units - will be filtered based on measurement system
const ALL_UNITS = ['minutes', 'km', 'miles', 'meters'];

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
  onAddEnduranceSession?: (sessionData: {
    sportType: string;
    trainingVolume: number;
    unit: string;
    heartRateZone: number;
    name?: string;
    description?: string;
  }) => void;
  scheduledExerciseIds?: string[];
  scheduledExerciseNames?: string[];
}

const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onAddExercise,
  onAddEnduranceSession,
  scheduledExerciseIds = [],
  scheduledExerciseNames = [],
}) => {
  const { state: authState } = useAuth();
  const isMetric = authState.userProfile?.weightUnit !== 'lbs';
  
  // Use exercises from AuthContext (loaded at startup)
  // null = still loading, [] = loaded but empty, [exercises] = loaded with data
  const allExercises = authState.exercises;
  
  const [isStrengthMode, setIsStrengthMode] = useState(true); // Default to strength mode
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Search Results (client-side filtering)
  const [searchResults, setSearchResults] = useState<ExerciseSearchResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  
  // Filter Options
  const [filterOptions, setFilterOptions] = useState<{
    targetAreas: string[];
    equipment: string[];
    difficulties: string[];
  }>({ targetAreas: [], equipment: [], difficulties: [] });

  // Get available units based on measurement system
  const getAvailableUnits = () => {
    if (isMetric) {
      // Metric: minutes, km
      return ['minutes', 'km'];
    } else {
      // Imperial: minutes, miles
      return ['minutes', 'miles'];
    }
  };

  const availableUnits = getAvailableUnits();

  // Endurance Session Form State
  const [sportType, setSportType] = useState<string>('running'); // Default to running
  const [duration, setDuration] = useState<number>(30);
  const [unit, setUnit] = useState<string>(availableUnits[0]); // Default to first available unit (minutes)
  const [heartRateZone, setHeartRateZone] = useState<number>(3);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showSportTypePicker, setShowSportTypePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Get default duration value for each unit
  const getDefaultDurationForUnit = (unitType: string) => {
    switch (unitType) {
      case 'minutes':
        return 30;
      case 'km':
        return 5;
      case 'miles':
        return 3;
      default:
        return 30;
    }
  };

  // Reset unit to default when measurement system changes
  useEffect(() => {
    const units = getAvailableUnits();
    if (!units.includes(unit)) {
      setUnit(units[0]); // Reset to minutes if current unit is not available
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetric]);

  // Get slider range based on unit
  const getSliderRange = () => {
    switch (unit) {
      case 'minutes':
        return { min: 5, max: 180, step: 5 };
      case 'km':
        return { min: 0.5, max: 50, step: 0.5 };
      case 'miles':
        return { min: 0.5, max: 30, step: 0.5 };
      default:
        return { min: 5, max: 180, step: 5 };
    }
  };

  // Set default duration when unit changes
  useEffect(() => {
    setDuration(getDefaultDurationForUnit(unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  // Load filter options when modal opens (only for strength mode)
  useEffect(() => {
    if (visible && isStrengthMode) {
      loadFilterOptions();
    }
  }, [visible, isStrengthMode]);

  // Filter exercises when query, filters, or exercises change (client-side filtering)
  const filterExercises = useCallback(() => {
    // If exercises are null (still loading) or empty array, show no results
    if (!allExercises || allExercises.length === 0) {
      setSearchResults([]);
      setLoadingResults(false);
      return;
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
    const results: ExerciseSearchResult[] = filtered.map(ex => ({
      exercise: ex,
      relevanceScore: 1, // Not used for client-side filtering
    }));

    setSearchResults(results);
    setLoadingResults(false);
  }, [allExercises, searchQuery, filters]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      // Reset form when modal closes
      const units = getAvailableUnits();
      setSportType('running');
      setDuration(getDefaultDurationForUnit(units[0]));
      setUnit(units[0]); // Reset to first available unit
      setHeartRateZone(3);
      setName('');
      setDescription('');
      setSearchQuery('');
      setFilters({});
      setIsStrengthMode(true); // Reset to strength mode
      setSearchResults([]); // Clear results when modal closes
      setLoadingResults(false); // Reset loading state
    }
  }, [visible]);

  // Apply filtering - let modal render first, then filter
  useEffect(() => {
    if (!visible || !isStrengthMode) {
      return;
    }

    // If exercises are still loading (null), wait
    if (allExercises === null) {
      setSearchResults([]);
      setLoadingResults(false);
      return;
    }

    // Show loading state while filtering
    setLoadingResults(true);

    // If search query is empty and no filters, filter immediately but asynchronously
    // This allows the modal to render first, then populate results
    if (!searchQuery.trim() && Object.keys(filters).length === 0) {
      // Use setTimeout(0) to let the modal render first, then filter
      // This prevents blocking the UI thread
      const timeoutId = setTimeout(() => {
        filterExercises();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }

    // User is typing or has filters - debounce for better UX
    const timeoutId = setTimeout(() => {
      filterExercises();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [filterExercises, visible, isStrengthMode, allExercises, searchQuery, filters]);

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

  const handleAddExercise = (exercise: Exercise) => {
    onAddExercise(exercise);
    onClose();
  };

  const handleAddEnduranceSession = () => {
    // Validate required fields
    if (!sportType) {
      Alert.alert('Validation Error', 'Please select a sport type');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for the session');
      return;
    }

    if (duration <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid duration');
      return;
    }

    if (heartRateZone < 1 || heartRateZone > 5) {
      Alert.alert('Validation Error', 'Heart rate zone must be between 1 and 5');
      return;
    }

    if (onAddEnduranceSession) {
      onAddEnduranceSession({
        sportType,
        trainingVolume: duration,
        unit,
        heartRateZone,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }

    // Reset form
    const units = getAvailableUnits();
    setSportType('running');
    setDuration(getDefaultDurationForUnit(units[0]));
    setUnit(units[0]); // Reset to first available unit
    setHeartRateZone(3);
    setName('');
    setDescription('');
    onClose();
  };

  // Check if form is valid (name is required)
  const isFormValid = name.trim().length > 0 && sportType.length > 0;


  const renderEnduranceForm = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.enduranceContentContainer}>
      {/* Sport Type */}
      <View style={styles.enduranceField}>
        <Text style={styles.enduranceLabel}>Sport Type</Text>
        <TouchableOpacity
          style={styles.endurancePicker}
          onPress={() => setShowSportTypePicker(!showSportTypePicker)}
        >
          <Text style={styles.endurancePickerText}>
            {sportType.charAt(0).toUpperCase() + sportType.slice(1).replace('_', ' ')}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.muted} />
        </TouchableOpacity>
        {showSportTypePicker && (
          <View style={styles.endurancePickerOptions}>
            <ScrollView 
              style={styles.endurancePickerScrollView}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {SPORT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.endurancePickerOption,
                    sportType === type && styles.endurancePickerOptionActive,
                  ]}
                  onPress={() => {
                    setSportType(type);
                    setShowSportTypePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.endurancePickerOptionText,
                      sportType === type && styles.endurancePickerOptionTextActive,
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

      {/* Unit Picker */}
      <View style={styles.enduranceField}>
        <Text style={styles.enduranceLabel}>Unit</Text>
        <TouchableOpacity
          style={styles.endurancePicker}
          onPress={() => setShowUnitPicker(!showUnitPicker)}
        >
          <Text style={styles.endurancePickerText}>{unit}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.muted} />
        </TouchableOpacity>
        {showUnitPicker && (
          <View style={styles.endurancePickerOptions}>
            {availableUnits.map((u) => (
              <TouchableOpacity
                key={u}
                style={[
                  styles.endurancePickerOption,
                  unit === u && styles.endurancePickerOptionActive,
                ]}
                onPress={() => {
                  setUnit(u);
                  setShowUnitPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.endurancePickerOptionText,
                    unit === u && styles.endurancePickerOptionTextActive,
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

      {/* Duration/Volume Slider */}
      <View style={styles.enduranceField}>
        <View style={styles.enduranceSliderContainer}>
          <CoolSlider
            value={duration}
            onValueChange={setDuration}
            min={getSliderRange().min}
            max={getSliderRange().max}
            step={getSliderRange().step}
            unit={unit}
            title={unit === 'minutes' ? 'Duration' : 'Volume'}
            size="small"
            style={styles.enduranceSlider}
          />
        </View>
      </View>

      {/* Heart Rate Zone - Radio Buttons */}
      <View style={styles.enduranceField}>
        <Text style={styles.enduranceLabel}>Heart Rate Zone</Text>
        <View style={styles.heartRateZoneContainer}>
          {[1, 2, 3, 4, 5].map((zone) => (
            <TouchableOpacity
              key={zone}
              style={[
                styles.heartRateZoneButton,
                heartRateZone === zone && styles.heartRateZoneButtonActive,
              ]}
              onPress={() => setHeartRateZone(zone)}
            >
              <Text
                style={[
                  styles.heartRateZoneButtonText,
                  heartRateZone === zone && styles.heartRateZoneButtonTextActive,
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

      {/* Name (Required) */}
      <View style={styles.enduranceField}>
        <Text style={styles.enduranceLabel}>Name</Text>
        <TextInput
          style={styles.enduranceTextInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Morning Run"
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Description (Optional) */}
      <View style={styles.enduranceField}>
        <Text style={styles.enduranceLabel}>Description (Optional)</Text>
        <TextInput
          style={[styles.enduranceTextInput, styles.enduranceTextArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add any notes about this session..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Add Button */}
      <TouchableOpacity 
        style={[
          styles.enduranceAddButton,
          !isFormValid && styles.enduranceAddButtonDisabled
        ]} 
        onPress={handleAddEnduranceSession}
        disabled={!isFormValid}
      >
        <Text style={[
          styles.enduranceAddButtonText,
          !isFormValid && styles.enduranceAddButtonTextDisabled
        ]}>Add Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, styles.searchContainerTop]}>
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
              {filterOptions.difficulties.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.filterChip,
                    filters.difficulty === diff && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setFilters(prev => ({
                      ...prev,
                      difficulty: prev.difficulty === diff ? undefined : diff,
                    }))
                  }
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

          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => setFilters({})}
          >
            <Ionicons name="close-circle" size={16} color={colors.muted} />
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results */}
      {allExercises === null || loadingResults ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={48} color={colors.muted} />
          <Text style={styles.noResultsText}>No exercises found</Text>
          <Text style={styles.noResultsSubtext}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.searchResults}>
          {searchResults.map((result, index) => (
            <TouchableOpacity
              key={`${result.exercise.id}-${index}`}
              style={styles.searchResultCard}
              onPress={() => handleAddExercise(result.exercise)}
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
                  onPress={() => handleAddExercise(result.exercise)}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Endurance</Text>
          <Switch
            value={isStrengthMode}
            onValueChange={(value) => {
              setIsStrengthMode(value);
            }}
            trackColor={{ false: colors.muted + '40', true: colors.primary + '40' }}
            thumbColor={isStrengthMode ? colors.primary : colors.muted}
          />
          <Text style={styles.toggleLabel}>Strength</Text>
        </View>

        {/* Content - Switch between strength search and cardio form */}
        {isStrengthMode ? renderSearchTab() : renderEnduranceForm()}
      </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  searchContainerTop: {
    marginTop: 16,
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
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Endurance Form Styles
  enduranceContentContainer: {
    padding: 16,
  },
  enduranceField: {
    marginBottom: 20,
  },
  enduranceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  endurancePicker: {
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
  endurancePickerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  endurancePickerOptions: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 300,
    overflow: 'hidden',
  },
  endurancePickerScrollView: {
    maxHeight: 300,
  },
  endurancePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  endurancePickerOptionActive: {
    backgroundColor: colors.background,
  },
  endurancePickerOptionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  endurancePickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  enduranceSliderContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  enduranceSlider: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  placeholder: {
    color: colors.muted,
  },
  heartRateZoneContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heartRateZoneButton: {
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
  heartRateZoneButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  heartRateZoneButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  heartRateZoneButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  enduranceTextInput: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  enduranceTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  enduranceAddButton: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  enduranceAddButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  enduranceAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  enduranceAddButtonTextDisabled: {
    color: colors.muted,
  },
});

export default AddExerciseModal;

