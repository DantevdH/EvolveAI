// Add Exercise Modal - AI recommendations and exercise search
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { ExerciseSwapService } from '../../../services/exerciseSwapService';
import { AddExerciseModalProps } from './types';
import { 
  getAvailableUnits, 
  getDefaultDurationForUnit, 
  SEARCH_DEBOUNCE_MS 
} from './constants';
import { filterExercises } from './utils';
import { EnduranceForm } from './EnduranceForm';
import { SearchBar } from './SearchBar';
import { FiltersSection } from './FiltersSection';
import { SearchResults } from './SearchResults';

const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onAddExercise,
  onAddEnduranceSession,
}) => {
  const { state: authState } = useAuth();
  const isMetric = authState.userProfile?.weightUnit !== 'lbs';
  const allExercises = authState.exercises;

  const [isStrengthMode, setIsStrengthMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    targetAreas: [],
    equipment: [],
    difficulties: [],
  });

  // Endurance form state
  const availableUnits = getAvailableUnits(isMetric);
  const [sportType, setSportType] = useState('running');
  const [duration, setDuration] = useState(getDefaultDurationForUnit(availableUnits[0]));
  const [unit, setUnit] = useState(availableUnits[0]);
  const [heartRateZone, setHeartRateZone] = useState(3);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showSportTypePicker, setShowSportTypePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Reset unit when measurement system changes
  useEffect(() => {
    const units = getAvailableUnits(isMetric);
    if (!units.includes(unit)) {
      setUnit(units[0]);
    }
  }, [isMetric, unit]);

  // Set default duration when unit changes
  useEffect(() => {
    setDuration(getDefaultDurationForUnit(unit));
  }, [unit]);

  // Load filter options when modal opens (only for strength mode)
  useEffect(() => {
    if (visible && isStrengthMode) {
      loadFilterOptions();
    }
  }, [visible, isStrengthMode]);

  // Filter exercises when query, filters, or exercises change
  const performFiltering = useCallback(() => {
    if (!allExercises || allExercises.length === 0) {
      setSearchResults([]);
      setLoadingResults(false);
      return;
    }

    setLoadingResults(true);
    const results = filterExercises(allExercises, searchQuery, filters);
    setSearchResults(results);
    setLoadingResults(false);
  }, [allExercises, searchQuery, filters]);

  // Apply filtering with debounce
  useEffect(() => {
    if (!visible || !isStrengthMode) {
      return;
    }

    if (allExercises === null) {
      setSearchResults([]);
      setLoadingResults(false);
      return;
    }

    setLoadingResults(true);

    if (!searchQuery.trim() && Object.keys(filters).length === 0) {
      const timeoutId = setTimeout(() => {
        performFiltering();
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      performFiltering();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [performFiltering, visible, isStrengthMode, allExercises, searchQuery, filters]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      const units = getAvailableUnits(isMetric);
      setSportType('running');
      setDuration(getDefaultDurationForUnit(units[0]));
      setUnit(units[0]);
      setHeartRateZone(3);
      setName('');
      setDescription('');
      setSearchQuery('');
      setFilters({});
      setIsStrengthMode(true);
      setSearchResults([]);
      setLoadingResults(false);
    }
  }, [visible, isMetric]);

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

  const handleAddExercise = (exercise) => {
    onAddExercise(exercise);
    onClose();
  };

  const handleAddEnduranceSession = () => {
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
    const units = getAvailableUnits(isMetric);
    setSportType('running');
    setDuration(getDefaultDurationForUnit(units[0]));
    setUnit(units[0]);
    setHeartRateZone(3);
    setName('');
    setDescription('');
    onClose();
  };

  const isFormValid = name.trim().length > 0 && sportType.length > 0;

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
            onValueChange={setIsStrengthMode}
            trackColor={{ false: colors.muted + '40', true: colors.primary + '40' }}
            thumbColor={isStrengthMode ? colors.primary : colors.muted}
          />
          <Text style={styles.toggleLabel}>Strength</Text>
        </View>

        {/* Content - Switch between strength search and cardio form */}
        {isStrengthMode ? (
          <View style={styles.tabContent}>
            <SearchBar
              searchQuery={searchQuery}
              onQueryChange={setSearchQuery}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
            <FiltersSection
              showFilters={showFilters}
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={setFilters}
              onClearFilters={() => setFilters({})}
            />
            <SearchResults
              exercises={allExercises}
              loadingResults={loadingResults}
              searchResults={searchResults}
              onSelectExercise={handleAddExercise}
            />
          </View>
        ) : (
          <EnduranceForm
            sportType={sportType}
            duration={duration}
            unit={unit}
            heartRateZone={heartRateZone}
            name={name}
            description={description}
            availableUnits={availableUnits}
            showSportTypePicker={showSportTypePicker}
            showUnitPicker={showUnitPicker}
            onSportTypeChange={(type) => {
              setSportType(type);
              setShowSportTypePicker(false);
            }}
            onUnitChange={(u) => {
              setUnit(u);
              setShowUnitPicker(false);
            }}
            onDurationChange={setDuration}
            onHeartRateZoneChange={setHeartRateZone}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onToggleSportTypePicker={() => setShowSportTypePicker(!showSportTypePicker)}
            onToggleUnitPicker={() => setShowUnitPicker(!showUnitPicker)}
            isValid={isFormValid}
            onSubmit={handleAddEnduranceSession}
          />
        )}
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
  tabContent: {
    flex: 1,
  },
});

export default AddExerciseModal;

