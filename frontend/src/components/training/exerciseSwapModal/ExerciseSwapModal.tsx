// Exercise Swap Modal - AI recommendations and exercise search
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { ExerciseSwapService } from '../../../services/exerciseSwapService';
import ConfirmationDialog from '../../shared/ConfirmationDialog';
import { ExerciseSwapModalProps } from './types';
import { SEARCH_DEBOUNCE_MS, DEFAULT_RECOMMENDATION_LIMIT } from './constants';
import { CurrentExerciseDisplay } from './CurrentExerciseDisplay';
import { TabNavigation } from './TabNavigation';
import { AIRecommendationsList } from './AIRecommendationsList';
import { SearchTab } from './SearchTab';

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
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  
  // Search Results
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Filter Options
  const [filterOptions, setFilterOptions] = useState({
    targetAreas: [],
    equipment: [],
    difficulties: [],
  });

  // Confirm swap dialog
  const [pendingSwapExercise, setPendingSwapExercise] = useState(null);
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
          loadAllExercises();
        }
      }, SEARCH_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, filters, activeTab]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setSearchQuery('');
      setFilters({});
      setShowFilters(false);
      setSearchResults([]);
      setAiRecommendations([]);
      setPendingSwapExercise(null);
      setShowConfirmSwap(false);
    }
  }, [visible]);

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
        setAiRecommendations([]);
      }
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
      setAiRecommendations([]);
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
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to load all exercises:', error);
      setSearchResults([]);
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

  const handleSwapExercise = (exercise) => {
    setPendingSwapExercise(exercise);
    setShowConfirmSwap(true);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSearchResults([]);
  };

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
        <CurrentExerciseDisplay exercise={currentExercise} />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>
            {activeTab === 'ai' ? 'Suggested alternatives' : 'Browse & filter'}
          </Text>
        </View>

        {/* Tab Content */}
        {activeTab === 'ai' ? (
          <AIRecommendationsList
            recommendations={aiRecommendations}
            loading={loadingRecommendations}
            onSelectExercise={handleSwapExercise}
          />
        ) : (
          <SearchTab
            searchQuery={searchQuery}
            filters={filters}
            showFilters={showFilters}
            filterOptions={filterOptions}
            searchResults={searchResults}
            loadingSearch={loadingSearch}
            onQueryChange={setSearchQuery}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
            onSelectExercise={handleSwapExercise}
          />
        )}
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
});

export default ExerciseSwapModal;

