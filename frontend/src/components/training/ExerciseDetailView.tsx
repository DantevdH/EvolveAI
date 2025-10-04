// Exercise Detail View - Modal with tabs like Swift
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Exercise } from '../../types/training';
import { getExerciseHistory } from '../../services/trainingService';
import { useAuth } from '../../context/AuthContext';

interface ExerciseDetailViewProps {
  exercise: Exercise | null;
  isVisible: boolean;
  onClose: () => void;
}

enum ExerciseTab {
  General = 'General Info',
  Instructions = 'Instructions',
  History = 'History'
}

const ExerciseDetailView: React.FC<ExerciseDetailViewProps> = ({
  exercise,
  isVisible,
  onClose
}) => {
  const [selectedTab, setSelectedTab] = useState<ExerciseTab>(ExerciseTab.General);
  const [historyData, setHistoryData] = useState<{
    volumeData: Array<{ date: string; volume: number }>;
    recentTrainings: Array<{ 
      date: string; 
      volume: number; 
      maxWeight: number;
      sets: number;
      reps: number[];
      weights: number[];
    }>;
    maxWeight: number;
    maxVolume: number;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { state } = useAuth();

  // Reset to General tab when modal opens
  React.useEffect(() => {
    if (isVisible) {
      setSelectedTab(ExerciseTab.General);
    }
  }, [isVisible]);

  // Fetch historical data when modal opens (not just when History tab is selected)
  React.useEffect(() => {
    if (isVisible && exercise && state.userProfile?.id) {
      // Add a small delay to ensure any recent database updates are complete
      const timeoutId = setTimeout(() => {
        fetchHistoryData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, exercise, state.userProfile?.id]);

  const fetchHistoryData = async () => {
    if (!exercise || !state.userProfile?.id) return;
    
    setHistoryLoading(true);
    try {
      const result = await getExerciseHistory(Number(exercise.id), state.userProfile.id);
      if (result.success && result.data) {
        setHistoryData(result.data);
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Don't render the modal if there's no exercise data or if not visible
  if (!exercise || !isVisible) {
    return null;
  }

  const tabIcon = (tab: ExerciseTab): string => {
    switch (tab) {
      case ExerciseTab.General: return 'information-circle';
      case ExerciseTab.Instructions: return 'list';
      case ExerciseTab.History: return 'trending-up';
      default: return 'information-circle';
    }
  };


  const difficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.primary;
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.exerciseTitle}>{exercise.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            {Object.values(ExerciseTab).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  selectedTab === tab && styles.tabButtonActive
                ]}
                onPress={() => setSelectedTab(tab)}
              >
                <Ionicons
                  name={tabIcon(tab) as any}
                  size={16}
                  color={selectedTab === tab ? colors.primary : colors.muted}
                />
                <Text style={[
                  styles.tabText,
                  selectedTab === tab && styles.tabTextActive
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <ScrollView 
            style={styles.tabContent} 
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {selectedTab === ExerciseTab.General && (
              <GeneralInfoTab exercise={exercise} difficultyColor={difficultyColor} />
            )}
            {selectedTab === ExerciseTab.Instructions && (
              <InstructionsTab exercise={exercise} />
            )}
            {selectedTab === ExerciseTab.History && (
              <HistoryTab exercise={exercise} historyData={historyData} loading={historyLoading} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// General Info Tab
const GeneralInfoTab: React.FC<{ exercise: Exercise; difficultyColor: (difficulty: string) => string }> = ({
  exercise,
  difficultyColor
}) => {
  return (
    <View style={styles.tabContentContainer}>
      {/* Exercise Details Section */}
      <View style={styles.section}>
        {/* Target Area and Difficulty */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Target Area</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{exercise.target_area || 'Full Body'}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Difficulty</Text>
            <View style={[styles.tag, { backgroundColor: difficultyColor(exercise.difficulty || 'Intermediate') + '20' }]}>
              <Text style={[styles.tagText, { color: difficultyColor(exercise.difficulty || 'Intermediate') }]}>
                {exercise.difficulty || 'Intermediate'}
              </Text>
            </View>
          </View>
        </View>

        {/* Equipment and Tier */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Equipment</Text>
            <Text style={styles.detailValue}>{exercise.equipment || 'Bodyweight'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Exercise Level</Text>
            <Text style={styles.detailValue}>{exercise.exercise_tier ? exercise.exercise_tier.charAt(0).toUpperCase() + exercise.exercise_tier.slice(1) : 'Standard'}</Text>
          </View>
        </View>
      </View>

      {/* Muscles Worked */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="fitness" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Muscles Worked</Text>
        </View>

        {/* Primary Muscles */}
        <View style={styles.muscleGroup}>
          <Text style={styles.muscleGroupTitle}>Primary Muscles</Text>
          <View style={styles.muscleTags}>
            {exercise.main_muscles && exercise.main_muscles.length > 0 ? (
              exercise.main_muscles.map((muscle, index) => (
                <View key={index} style={styles.primaryMuscleTag}>
                  <Text style={styles.primaryMuscleText}>{muscle}</Text>
                </View>
              ))
            ) : (
              <View style={styles.primaryMuscleTag}>
                <Text style={styles.primaryMuscleText}>Full Body</Text>
              </View>
            )}
          </View>
        </View>

        {/* Secondary Muscles */}
        <View style={styles.muscleGroup}>
          <Text style={styles.muscleGroupTitle}>Secondary Muscles</Text>
          <View style={styles.secondaryMuscleTags}>
            {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 ? (
              exercise.secondary_muscles.map((muscle, index) => (
                <View key={index} style={styles.secondaryMuscleTag}>
                  <Text style={styles.secondaryMuscleText}>{muscle}</Text>
                </View>
              ))
            ) : (
              <View style={styles.secondaryMuscleTag}>
                <Text style={styles.secondaryMuscleText}>Core Stabilizers</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

// Instructions Tab
const InstructionsTab: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  return (
    <View style={styles.tabContentContainer}>
      {/* Exercise Instructions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
        </View>

        {/* Setup Section */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionSectionTitle}>Setup</Text>
          <View style={styles.instructionsList}>
            {exercise.instructions ? (
              <Text style={styles.instructionStep}>{exercise.instructions}</Text>
            ) : (
              <>
                <Text style={styles.instructionStep}>1. Start in a standing position with feet shoulder-width apart</Text>
                <Text style={styles.instructionStep}>2. Hold the weight at chest level with both hands</Text>
              </>
            )}
          </View>
        </View>

        {/* Execution Section */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionSectionTitle}>Execution</Text>
          <View style={styles.instructionsList}>
            {exercise.instructions ? (
              <Text style={styles.instructionStep}>{exercise.instructions}</Text>
            ) : (
              <>
                <Text style={styles.instructionStep}>1. Lower your body by bending at the knees and hips</Text>
                <Text style={styles.instructionStep}>2. Keep your back straight and chest up throughout the movement</Text>
                <Text style={styles.instructionStep}>3. Return to the starting position by pushing through your heels</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Video Guide - Commented out for now */}
      {/* <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Video Demonstration</Text>
        </View>

        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={48} color={colors.primary} />
          <Text style={styles.videoTitle}>Exercise Demonstration</Text>
          <Text style={styles.videoSubtitle}>Tap to play video guide</Text>
        </View>
      </View> */}

    </View>
  );
};

// History Tab
const HistoryTab: React.FC<{ 
  exercise: Exercise; 
  historyData: {
    volumeData: Array<{ date: string; volume: number }>;
    recentTrainings: Array<{ 
      date: string; 
      volume: number; 
      maxWeight: number;
      sets: number;
      reps: number[];
      weights: number[];
    }>;
    maxWeight: number;
    maxVolume: number;
  } | null;
  loading: boolean;
}> = ({ exercise, historyData, loading }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Loading History...</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Fetching your training data...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!historyData || historyData.volumeData?.length === 0) {
    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Progress Over Time</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="trending-up" size={48} color={colors.primary} />
            <Text style={styles.chartTitle}>No Data Yet</Text>
            <Text style={styles.chartSubtitle}>Complete some trainings to see your progress</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Personal Records</Text>
          </View>
          <View style={styles.recordsContainer}>
            <View style={styles.recordItem}>
              <Text style={styles.recordLabel}>Max Weight</Text>
              <Text style={styles.recordValue}>No data</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContentContainer}>
      {/* Progress Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Volume Progress</Text>
        </View>

        {loading ? (
          <View style={styles.chartContainer}>
            <View style={styles.chartArea}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading volume data...</Text>
              </View>
            </View>
          </View>
        ) : historyData.volumeData?.length > 0 && historyData.volumeData.some(d => d.volume > 0) ? (
          <View style={styles.chartContainer}>
            <View style={styles.chartArea}>
              <View style={styles.lineChart}>
                {historyData.volumeData.slice(-7).map((dataPoint, index, array) => {
                  const maxVolume = Math.max(...historyData.volumeData.map(d => d.volume));
                  const minVolume = Math.min(...historyData.volumeData.map(d => d.volume));
                  const volumeRange = maxVolume - minVolume;
                  
                  // Calculate position (0-100% from bottom)
                  const normalizedVolume = volumeRange > 0 
                    ? ((dataPoint.volume - minVolume) / volumeRange) * 80 + 10 // 10-90% range
                    : 50; // Center if all volumes are the same
                  
                  const isLastPoint = index === array.length - 1;
                  const nextPoint = array[index + 1];
                  
                  return (
                    <View key={dataPoint.date} style={styles.dataPointContainer}>
                      <View style={styles.dataPointWrapper}>
                        <View 
                          style={[
                            styles.dataPoint, 
                            { 
                              bottom: `${normalizedVolume}%`,
                              backgroundColor: isLastPoint ? colors.primary : colors.primary + '80'
                            }
                          ]} 
                        />
                        {/* Line to next point */}
                        {nextPoint && (
                          <View 
                            style={[
                              styles.lineToNext,
                              {
                                bottom: `${normalizedVolume}%`,
                                height: 2,
                                backgroundColor: colors.primary + '60',
                              }
                            ]} 
                          />
                        )}
                      </View>
                      <Text style={styles.chartDateLabel}>{formatDate(dataPoint.date)}</Text>
                      <Text style={styles.chartVolumeLabel}>{Math.round(dataPoint.volume)} kg</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Ionicons name="trending-up" size={48} color={colors.primary} />
            <Text style={styles.chartTitle}>No Volume Data</Text>
            <Text style={styles.chartSubtitle}>Complete trainings with weights to see volume trends</Text>
          </View>
        )}
      </View>


      {/* Personal Records */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>Personal Records</Text>
        </View>

        <View style={styles.recordsContainer}>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>Max Weight</Text>
            <Text style={styles.recordValue}>
              {historyData.maxWeight > 0 ? `${historyData.maxWeight} kg` : 'No data'}
            </Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>Max Volume</Text>
            <Text style={styles.recordValue}>
              {historyData.maxVolume > 0 ? `${Math.round(historyData.maxVolume)} kg` : 'No data'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: '100%',
    height: Dimensions.get('window').height * 0.65, // 2/3 of screen height
    maxHeight: Dimensions.get('window').height * 0.65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 8,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    margin: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  tabContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
  },
  tag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  muscleGroup: {
    marginBottom: 16,
  },
  muscleGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  secondaryMuscleTags: {
    flexDirection: 'column',
    gap: 6,
  },
  primaryMuscleTag: {
    backgroundColor: colors.primary + '60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  primaryMuscleText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  secondaryMuscleTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  secondaryMuscleText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  instructionSection: {
    marginBottom: 16,
  },
  instructionSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  instructionsList: {
    gap: 8,
  },
  instructionStep: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  videoPlaceholder: {
    backgroundColor: colors.background,
    height: 200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  videoSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  chartPlaceholder: {
    backgroundColor: colors.background,
    height: 180,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  trainingHistory: {
    gap: 12,
  },
  trainingEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  trainingInfo: {
    gap: 4,
  },
  trainingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  trainingDate: {
    fontSize: 12,
    color: colors.muted,
  },
  trainingStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trainingSets: {
    fontSize: 14,
    color: colors.text,
  },
  trainingWeight: {
    fontSize: 12,
    color: colors.primary,
  },
  recordsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  recordItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  recordLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  recordValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  // History Tab Styles
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: colors.muted,
    fontStyle: 'italic',
  },
  chartContainer: {
    padding: 16,
  },
  chartArea: {
    height: 120,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  lineChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    position: 'relative',
  },
  dataPointContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dataPointWrapper: {
    height: 80,
    width: 20,
    position: 'relative',
    marginBottom: 8,
  },
  dataPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: '50%',
    marginLeft: -4,
  },
  lineToNext: {
    position: 'absolute',
    left: '50%',
    width: '100%',
    marginLeft: 4,
  },
  chartDateLabel: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 2,
  },
  chartVolumeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  trainingVolume: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
});

export default ExerciseDetailView;



