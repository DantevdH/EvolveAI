// Exercise Detail View - Modal with tabs like Swift
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Exercise } from '../../types/training';

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

  if (!exercise) return null;

  const tabIcon = (tab: ExerciseTab): string => {
    switch (tab) {
      case ExerciseTab.General: return 'info-circle';
      case ExerciseTab.Instructions: return 'list';
      case ExerciseTab.History: return 'trending-up';
      default: return 'info-circle';
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
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {selectedTab === ExerciseTab.General && (
              <GeneralInfoTab exercise={exercise} difficultyColor={difficultyColor} />
            )}
            {selectedTab === ExerciseTab.Instructions && (
              <InstructionsTab exercise={exercise} />
            )}
            {selectedTab === ExerciseTab.History && (
              <HistoryTab exercise={exercise} />
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
            <View style={[styles.tag, { backgroundColor: difficultyColor(exercise.difficulty) + '20' }]}>
              <Text style={[styles.tagText, { color: difficultyColor(exercise.difficulty) }]}>
                {exercise.difficulty}
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
            <Text style={styles.detailLabel}>Exercise Tier</Text>
            <Text style={styles.detailValue}>Intermediate</Text>
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
            {exercise.main_muscles?.map((muscle, index) => (
              <View key={index} style={styles.primaryMuscleTag}>
                <Text style={styles.primaryMuscleText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Secondary Muscles */}
        <View style={styles.muscleGroup}>
          <Text style={styles.muscleGroupTitle}>Secondary Muscles</Text>
          <View style={styles.muscleTags}>
            {exercise.secondary_muscles?.map((muscle, index) => (
              <View key={index} style={styles.secondaryMuscleTag}>
                <Text style={styles.secondaryMuscleText}>{muscle}</Text>
              </View>
            ))}
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

        <View style={styles.instructionsList}>
          {exercise.instructions ? (
            <Text style={styles.instructionStep}>{exercise.instructions}</Text>
          ) : (
            <>
              <Text style={styles.instructionStep}>1. Start in a standing position with feet shoulder-width apart</Text>
              <Text style={styles.instructionStep}>2. Hold the weight at chest level with both hands</Text>
              <Text style={styles.instructionStep}>3. Lower your body by bending at the knees and hips</Text>
              <Text style={styles.instructionStep}>4. Keep your back straight and chest up throughout the movement</Text>
              <Text style={styles.instructionStep}>5. Return to the starting position by pushing through your heels</Text>
            </>
          )}
        </View>
      </View>

      {/* Video Guide */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Video Demonstration</Text>
        </View>

        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={48} color={colors.primary} />
          <Text style={styles.videoTitle}>Exercise Demonstration</Text>
          <Text style={styles.videoSubtitle}>Tap to play video guide</Text>
        </View>
      </View>

      {/* Tips Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>Pro Tips</Text>
        </View>

        <View style={styles.tipsList}>
          <Text style={styles.tip}>• Keep your core engaged throughout the movement</Text>
          <Text style={styles.tip}>• Breathe steadily - exhale on the way up</Text>
          <Text style={styles.tip}>• Focus on form over weight initially</Text>
        </View>
      </View>
    </View>
  );
};

// History Tab
const HistoryTab: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  return (
    <View style={styles.tabContentContainer}>
      {/* Progress Chart Placeholder */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Progress Over Time</Text>
        </View>

        <View style={styles.chartPlaceholder}>
          <Ionicons name="trending-up" size={48} color={colors.primary} />
          <Text style={styles.chartTitle}>Progress Chart</Text>
          <Text style={styles.chartSubtitle}>Your performance data will appear here</Text>
        </View>
      </View>

      {/* Recent Workouts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
        </View>

        <View style={styles.workoutHistory}>
          {[1, 2, 3].map((index) => (
            <View key={index} style={styles.workoutEntry}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>Workout {index}</Text>
                <Text style={styles.workoutDate}>{3 - index} days ago</Text>
              </View>
              <View style={styles.workoutStats}>
                <Text style={styles.workoutSets}>3 sets × 12 reps</Text>
                <Text style={styles.workoutWeight}>45 kg</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Personal Records */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>Personal Records</Text>
        </View>

        <View style={styles.recordsContainer}>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>1RM</Text>
            <Text style={styles.recordValue}>60 kg</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>Max Reps</Text>
            <Text style={styles.recordValue}>15</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>Max Weight</Text>
            <Text style={styles.recordValue}>55 kg</Text>
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
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.8,
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
    paddingBottom: 0,
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
    marginTop: 0,
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
  tabContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  primaryMuscleTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryMuscleText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  secondaryMuscleTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secondaryMuscleText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
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
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  workoutHistory: {
    gap: 12,
  },
  workoutEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  workoutInfo: {
    gap: 4,
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  workoutDate: {
    fontSize: 12,
    color: colors.muted,
  },
  workoutStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  workoutSets: {
    fontSize: 14,
    color: colors.text,
  },
  workoutWeight: {
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
});

export default ExerciseDetailView;



