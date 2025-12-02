// Exercise Detail View - Modal with tabs
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { Exercise } from '../../../types/training';
import { getExerciseHistory } from '../../../services/trainingService';
import { useAuth } from '../../../context/AuthContext';
import { ExerciseDetailViewProps, ExerciseTab, HistoryData } from './types';
import { TabNavigation } from './TabNavigation';
import { GeneralInfoTab } from './GeneralInfoTab';
import { InstructionsTab } from './InstructionsTab';
import { HistoryTab } from './HistoryTab';
import { logger } from '../../../utils/logger';
import { validateExerciseDetail } from '../../../utils/validation';

const ExerciseDetailView: React.FC<ExerciseDetailViewProps> = ({
  exercise,
  isVisible,
  onClose
}) => {
  const [selectedTab, setSelectedTab] = useState<ExerciseTab>(ExerciseTab.General);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { state } = useAuth();

  // Reset to General tab when modal opens
  useEffect(() => {
    if (isVisible) {
      setSelectedTab(ExerciseTab.General);
    }
  }, [isVisible]);

  // Fetch historical data when modal opens
  useEffect(() => {
    if (isVisible && exercise && state.userProfile?.id) {
      // Validate exercise data before proceeding
      const validationResult = validateExerciseDetail(exercise);
      if (!validationResult.isValid) {
        logger.error('Invalid exercise data in ExerciseDetailView', {
          error: validationResult.errorMessage,
          exercise
        });
        // Close modal if exercise is invalid
        onClose();
        return;
      }

      const timeoutId = setTimeout(() => {
        fetchHistoryData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, exercise, state.userProfile?.id, state.trainingPlan, onClose]);

  const fetchHistoryData = async () => {
    if (!exercise || !state.userProfile?.id) return;
    
    setHistoryLoading(true);
    try {
      const localPlan = state.trainingPlan;
      const result = await getExerciseHistory(Number(exercise.id), state.userProfile.id, localPlan);
      if (result.success && result.data) {
        setHistoryData(result.data);
      } else {
        logger.warn('Failed to fetch exercise history', {
          exerciseId: exercise.id,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error fetching history data', {
        error,
        exerciseId: exercise.id,
        userProfileId: state.userProfile?.id
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!exercise || !isVisible) {
    return null;
  }

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
          {/* Header with Golden Gradient */}
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.exerciseTitle} numberOfLines={2}>
                  {exercise.name}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Tab Switcher */}
          <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} />

          {/* Tab Content */}
          <View style={styles.content}>
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
      </View>
    </Modal>
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
    backgroundColor: colors.card,
    borderRadius: 28,
    width: '100%',
    height: Dimensions.get('window').height * 0.65,
    maxHeight: Dimensions.get('window').height * 0.65,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.1),
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  exerciseTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 22,
  },
  closeButton: {
    padding: 4,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
    minHeight: 0,
  },
  tabContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default ExerciseDetailView;

