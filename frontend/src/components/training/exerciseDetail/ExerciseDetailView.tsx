// Exercise Detail View - Modal with tabs
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { Exercise } from '../../../types/training';
import { getExerciseHistory } from '../../../services/trainingService';
import { useAuth } from '../../../context/AuthContext';
import { ExerciseDetailViewProps, ExerciseTab, HistoryData } from './types';
import { TabNavigation } from './TabNavigation';
import { GeneralInfoTab } from './GeneralInfoTab';
import { InstructionsTab } from './InstructionsTab';
import { HistoryTab } from './HistoryTab';

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
      const timeoutId = setTimeout(() => {
        fetchHistoryData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, exercise, state.userProfile?.id, state.trainingPlan]);

  const fetchHistoryData = async () => {
    if (!exercise || !state.userProfile?.id) return;
    
    setHistoryLoading(true);
    try {
      const localPlan = state.trainingPlan;
      const result = await getExerciseHistory(Number(exercise.id), state.userProfile.id, localPlan);
      if (result.success && result.data) {
        setHistoryData(result.data);
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.exerciseTitle}>{exercise.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} />

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
    height: Dimensions.get('window').height * 0.65,
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
  tabContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default ExerciseDetailView;

