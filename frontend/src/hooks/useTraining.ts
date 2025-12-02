// Training Hook - Manages training state and operations
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrainingService } from '../services/trainingService';
import { NotificationService } from '../services/NotificationService';
import { ExerciseSwapService } from '../services/exerciseSwapService';
import { InsightsAnalyticsService } from '../services/insightsAnalyticsService';
import { supabase } from '../config/supabase';
import SessionRPEModal from '../components/training/SessionRPEModal';
import { colors } from '../constants/colors';
import { logger } from '../utils/logger';
import { useApiCallWithBanner } from './useApiCallWithBanner';
import { validateTrainingPlan, validateExerciseSwap, validateRPE } from '../utils/validation';
import {
  TrainingState,
  TrainingPlan,
  DailyTraining,
  TrainingExercise,
  WeeklySchedule,
  Exercise,
  ProgressRingData,
  WeekNavigationData,
  DayIndicator,
  ExerciseDetailTabs,
  RestTimer,
  TrainingProgress,
  UseTrainingReturn
} from '../types/training';
import { isTrainingDayEditable, getTrainingDayStatus } from '../utils/trainingDateUtils';

const initialState: TrainingState = {
  currentWeekSelected: 1,
  selectedDayIndex: -1, // -1 means "auto-select today"
  completedExercises: new Set(),
  completedTrainings: new Set(),
  isShowingExerciseDetail: false,
  selectedExercise: null,
  isLoading: false,
  error: null,
  showReopenDialog: false,
  showRPEModal: false,
  pendingCompletionDailyTrainingId: null
};

export const useTraining = (): UseTrainingReturn => {
  const { state: authState, refreshTrainingPlan: refreshAuthTrainingPlan, setTrainingPlan: setAuthTrainingPlan, setInsightsSummary: setAuthInsightsSummary } = useAuth();
  const [trainingState, setTrainingState] = useState<TrainingState>(initialState);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const hasInitialized = useRef(false);

  const [restTimer, setRestTimer] = useState<RestTimer>({
    isActive: false,
    duration: 0,
    remaining: 0,
    exerciseName: ''
  });

  // Exercise swap state
  const [showExerciseSwapModalState, setShowExerciseSwapModalState] = useState(false);
  const [exerciseToSwap, setExerciseToSwap] = useState<Exercise | null>(null);

  // Helper function to update both local and auth context training plans
  // Only use this when we actually modify the training plan, not during initialization
  const updateTrainingPlan = useCallback((updatedPlan: TrainingPlan) => {
    setTrainingPlan(updatedPlan);
    setAuthTrainingPlan(updatedPlan);
  }, [setAuthTrainingPlan]);

  // Initialize training data
  useEffect(() => {
    if (authState.userProfile && authState.trainingPlan) {
      // Validate training plan structure before using
      const validationResult = validateTrainingPlan(authState.trainingPlan);
      if (!validationResult.isValid) {
        logger.error('Invalid training plan structure', {
          error: validationResult.errorMessage,
          plan: authState.trainingPlan
        });
        setTrainingState(prev => ({
          ...prev,
          error: validationResult.errorMessage || 'Invalid training plan structure'
        }));
        return;
      }

      // Use the training plan directly (new TrainingService format)
      logger.info('Training plan initialized from auth state');
      setTrainingPlan(validationResult.plan || authState.trainingPlan);
      
      // Only auto-select today's training on first initialization, not on updates
      if (!hasInitialized.current) {
        setTrainingState(prev => ({
          ...prev,
          currentWeekSelected: 1, // Start with week 1
          selectedDayIndex: -1 // Auto-select today's training only on first load
        }));
        hasInitialized.current = true;
      }
    }
  }, [authState.userProfile, authState.trainingPlan]);


  // Computed values
  const selectedDayTraining = useMemo(() => {
    if (!trainingPlan) return null;
    
    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );
    
    if (!currentWeek) return null;
    
    // If selectedDayIndex is -1, auto-select today's training
    let dayIndex = trainingState.selectedDayIndex;
    if (dayIndex === -1) {
      const today = new Date();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      // Convert JavaScript Date.getDay() (0=Sunday) to our Monday-first array (0=Monday)
      const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
      const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
      const todayName = dayNames[mondayFirstIndex];
      
      dayIndex = currentWeek.dailyTrainings.findIndex(training => training.dayOfWeek === todayName);
      if (dayIndex === -1) {
        dayIndex = 0; // Fallback to first day if today not found
      }
    }
    
    if (!currentWeek.dailyTrainings[dayIndex]) {
      return null;
    }
    
    const dailyTraining = currentWeek.dailyTrainings[dayIndex];
    
    // Compute completion status dynamically
    const isCompleted = dailyTraining.exercises.length > 0 && 
                       dailyTraining.exercises.every(exercise => exercise.completed);
    
    // Determine if this day is editable based on scheduledDate
    const isEditable = isTrainingDayEditable(dailyTraining);
    
    return {
      ...dailyTraining,
      completed: isCompleted,
      isEditable // Add editability status
    };
  }, [trainingPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex]);

  const progressRing = useMemo((): ProgressRingData => {
    if (!trainingPlan) {
      return { progress: 0, total: 0, completed: 0, color: colors.primary };
    }

    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );

    if (!currentWeek) {
      return { progress: 0, total: 0, completed: 0, color: colors.primary };
    }

    const totalTrainings = currentWeek.dailyTrainings.filter(training => !training.isRestDay).length;
    const completedTrainings = currentWeek.dailyTrainings.filter(training => {
      if (training.isRestDay) return false;
      // Compute completion status dynamically
      return training.exercises.length > 0 && training.exercises.every(exercise => exercise.completed);
    }).length;
    const progress = totalTrainings > 0 ? completedTrainings / totalTrainings : 0;

    return {
      progress,
      total: totalTrainings,
      completed: completedTrainings,
      color: colors.secondary // Primary red color
    };
  }, [trainingPlan, trainingState.currentWeekSelected]);

  const weekNavigation = useMemo((): WeekNavigationData => {
    if (!trainingPlan) {
      return {
        currentWeek: 1,
        totalWeeks: 1,
        canGoBack: false,
        canGoForward: false
      };
    }

    return {
      currentWeek: trainingState.currentWeekSelected,
      totalWeeks: trainingPlan.totalWeeks,
      canGoBack: trainingState.currentWeekSelected > 1,
      canGoForward: trainingState.currentWeekSelected < trainingPlan.totalWeeks
    };
  }, [trainingPlan, trainingState.currentWeekSelected]);

  const dayIndicators = useMemo((): DayIndicator[] => {
    if (!trainingPlan) return [];

    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );

    if (!currentWeek) return [];

    const today = new Date();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Convert JavaScript Date.getDay() (0=Sunday) to our Monday-first array (0=Monday)
    const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
    const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
    const todayName = dayNames[mondayFirstIndex];
    
    // Calculate which day should be selected (auto-select today if selectedDayIndex is -1)
    let selectedDayIndex = trainingState.selectedDayIndex;
    if (selectedDayIndex === -1) {
      selectedDayIndex = currentWeek.dailyTrainings.findIndex(training => training.dayOfWeek === todayName);
      if (selectedDayIndex === -1) {
        selectedDayIndex = 0; // Fallback to first day
      }
    }

    return currentWeek.dailyTrainings.map((training, index) => {
      const isToday = training.dayOfWeek === todayName;
      const isPastWeek = trainingState.currentWeekSelected < trainingPlan.currentWeek;
      
      // Compute completion status dynamically
      const isCompleted = training.exercises.length > 0 && 
                         training.exercises.every(exercise => exercise.completed);

      return {
        dayOfWeek: training.dayOfWeek,
        isSelected: index === selectedDayIndex,
        isCompleted: isCompleted,
        isRestDay: training.isRestDay,
        isToday: isToday && !isPastWeek,
        isPastWeek: isPastWeek
      };
    });
  }, [trainingPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex]);

  const exerciseDetailTabs: ExerciseDetailTabs = {
    general: true,
    instructions: false,
    history: false
  };


  const trainingProgress = useMemo((): TrainingProgress => {
    if (!selectedDayTraining) {
      return {
        currentExercise: 0,
        totalExercises: 0,
        currentSet: 0,
        totalSets: 0,
        progress: 0
      };
    }

    const totalExercises = selectedDayTraining.exercises.length;
    const completedExercises = selectedDayTraining.exercises.filter(ex => ex.completed).length;
    const progress = totalExercises > 0 ? completedExercises / totalExercises : 0;

    return {
      currentExercise: completedExercises + 1,
      totalExercises,
      currentSet: 1,
      totalSets: 1,
      progress
    };
  }, [selectedDayTraining]);

  // Actions
  const selectWeek = useCallback((week: number) => {
    if (!trainingPlan) return;
    
    if (week >= 1 && week <= trainingPlan.totalWeeks) {
      setTrainingState(prev => ({
        ...prev,
        currentWeekSelected: week,
        selectedDayIndex: -1 // Auto-select today's training when changing weeks
      }));
    }
  }, [trainingPlan]);

  const selectDay = useCallback((dayIndex: number) => {
    if (!trainingPlan) return;
    
    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );
    
    if (currentWeek && dayIndex >= 0 && dayIndex < currentWeek.dailyTrainings.length) {
      setTrainingState(prev => ({
        ...prev,
        selectedDayIndex: dayIndex
      }));
    }
  }, [trainingPlan, trainingState.currentWeekSelected]);

  const toggleExerciseCompletion = useCallback(async (exerciseId: string) => {
    try {
      setTrainingState(prev => ({
        ...prev,
        error: null
      }));

      // Check if the current training is completed and locked
      const currentWeek = trainingPlan?.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      const dayIndex = trainingState.selectedDayIndex === -1 ? 0 : trainingState.selectedDayIndex;
      const currentDailyTraining = currentWeek?.dailyTrainings[dayIndex];
      
      // Check if day is editable based on scheduledDate
      if (currentDailyTraining && !isTrainingDayEditable(currentDailyTraining || null)) {
        logger.warn('Cannot edit locked training day', {
          action: 'toggleExerciseCompletion',
          scheduledDate: currentDailyTraining.scheduledDate
        });
        setTrainingState(prev => ({
          ...prev,
          error: 'This workout is locked. You can only edit today\'s workout.'
        }));
        return;
      }
      
      if (currentDailyTraining?.completed) {
        // Training is completed and locked - don't allow changes
        logger.info('Training is completed and locked', {
          dailyTrainingId: currentDailyTraining.id,
          action: 'toggleExerciseCompletion'
        });
        return;
      }

      // Update both local and auth context state immediately and also update database for homepage tracking
      const updatedPlan = {
        ...trainingPlan!,
        weeklySchedules: trainingPlan!.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily => ({
            ...daily,
            exercises: daily.exercises.map(exercise => 
              exercise.id === exerciseId 
                ? { ...exercise, completed: !exercise.completed }
                : exercise
            )
          }))
        }))
      };

      // Check training completion status
      const updatedCurrentWeek = updatedPlan.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      
      if (updatedCurrentWeek) {
        // Calculate the correct day index (same logic as selectedDayTraining)
        let dayIndex = trainingState.selectedDayIndex;
        if (dayIndex === -1) {
          const today = new Date();
          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          // Convert JavaScript Date.getDay() (0=Sunday) to our Monday-first array (0=Monday)
          const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
          const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
          const todayName = dayNames[mondayFirstIndex];
          
          dayIndex = updatedCurrentWeek.dailyTrainings.findIndex(training => training.dayOfWeek === todayName);
          if (dayIndex === -1) {
            dayIndex = 0; // Fallback to first day if today not found
          }
        }
        
        const updatedCurrentDailyTraining = updatedCurrentWeek.dailyTrainings[dayIndex];
        if (updatedCurrentDailyTraining) {
          const allExercisesCompleted = updatedCurrentDailyTraining.exercises.every(exercise => exercise.completed);
          
          if (allExercisesCompleted && !updatedCurrentDailyTraining.isRestDay) {
            // All exercises completed - show RPE modal first
            logger.info('All exercises completed, showing RPE modal', {
              dailyTrainingId: updatedCurrentDailyTraining.id
            });
            
            // Only save temporary exercises to DB (existing exercises will be handled by saveDailyTrainingExercises)
            // This ensures temporary exercises have real IDs before the final save
            const temporaryExercises = updatedCurrentDailyTraining.exercises.filter(exercise => 
              exercise.id.startsWith('temp_') || exercise.id.startsWith('endurance_temp_')
            );
            
            if (temporaryExercises.length > 0) {
              // Save temporary exercises and update local state with new IDs
              const savePromises = temporaryExercises.map(exercise => 
                TrainingService.updateExerciseCompletion(
                  exercise.id, 
                  true,
                  exercise,
                  updatedCurrentDailyTraining.id
                )
              );
              
              Promise.all(savePromises).then((results) => {
                // Update local plan with new database IDs for temporary exercises
                let finalPlan = updatedPlan;
                results.forEach((result, index) => {
                  if (result.newId) {
                    const exerciseToUpdate = temporaryExercises[index];
                    
                    // Preserve the endurance_ prefix for endurance sessions
                    const wasEnduranceSession = exerciseToUpdate.id.startsWith('endurance_temp_') || !!exerciseToUpdate.enduranceSession;
                    const newIdString = wasEnduranceSession 
                      ? `endurance_${result.newId}` 
                      : result.newId.toString();
                    
                    logger.info('Temporary exercise saved with new DB ID', {
                      oldId: exerciseToUpdate.id,
                      newId: newIdString,
                      isEndurance: wasEnduranceSession
                    });
                    
                    // Update the plan with the new ID
                    finalPlan = {
                      ...finalPlan,
                      weeklySchedules: finalPlan.weeklySchedules.map(week => ({
                        ...week,
                        dailyTrainings: week.dailyTrainings.map(daily =>
                          daily.id === updatedCurrentDailyTraining.id
                            ? {
                                ...daily,
                                exercises: daily.exercises.map(ex =>
                                  ex.id === exerciseToUpdate.id
                                    ? { ...ex, id: newIdString }
                                    : ex
                                )
                              }
                            : daily
                        )
                      }))
                    };
                  }
                });
                
                // Update local plan with new IDs for temporary exercises
                updateTrainingPlan(finalPlan);
                
                // Show RPE modal to collect session rating
                setTrainingState(prev => ({
                  ...prev,
                  showRPEModal: true,
                  pendingCompletionDailyTrainingId: updatedCurrentDailyTraining.id
                }));
              }).catch(error => {
                logger.error('Error saving temporary exercises', error);
                setTrainingState(prev => ({
                  ...prev,
                  error: 'Failed to save temporary exercises'
                }));
              });
            } else {
              // No temporary exercises - just show RPE modal
              // All exercises will be saved with correct completion status by saveDailyTrainingExercises
              setTrainingState(prev => ({
                ...prev,
                showRPEModal: true,
                pendingCompletionDailyTrainingId: updatedCurrentDailyTraining.id
              }));
            }
          } else if (!allExercisesCompleted && updatedCurrentDailyTraining.completed) {
            // Some exercises were unchecked - mark training as incomplete
            
            // Update the daily training completion status (clear completedAt when incomplete)
            updatedPlan.weeklySchedules = updatedPlan.weeklySchedules.map(week => ({
              ...week,
              dailyTrainings: week.dailyTrainings.map(daily => 
                daily.id === updatedCurrentDailyTraining.id 
                  ? { ...daily, completed: false, completedAt: undefined }
                  : daily
              )
            }));
          }
        }
      }

      // Update both local and auth context training plans to trigger homepage KPI recalculation
      updateTrainingPlan(updatedPlan);
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to toggle exercise completion'
      }));
    }
  }, [trainingPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex, updateTrainingPlan]);

  const updateSetDetails = useCallback(async (
    exerciseId: string, 
    setIndex: number, 
    reps: number, 
    weight: number
  ) => {
    try {
      setTrainingState(prev => ({
        ...prev,
        error: null
      }));

      if (!trainingPlan) {
        setTrainingState(prev => ({
          ...prev,
          error: 'Training plan not loaded'
        }));
        return;
      }

      // Check if the selected day is editable
      const currentDay = trainingPlan.weeklySchedules
        .find(week => week.weekNumber === trainingState.currentWeekSelected)
        ?.dailyTrainings[trainingState.selectedDayIndex === -1 ? 0 : trainingState.selectedDayIndex];
      
      if (currentDay && !isTrainingDayEditable(currentDay)) {
        logger.warn('Cannot edit locked training day', {
          action: 'updateSetDetails',
          scheduledDate: currentDay.scheduledDate
        });
        setTrainingState(prev => ({
          ...prev,
          error: 'This workout is locked. You can only edit today\'s workout.'
        }));
        return;
      }

      // Find the exercise to get current sets and default values
      const exercise = trainingPlan.weeklySchedules
        .flatMap(week => week.dailyTrainings)
        .flatMap(daily => daily.exercises)
        .find(ex => ex.id === exerciseId);

      if (!exercise || !exercise.sets) {
        logger.error('Exercise not found or sets missing', {
          exerciseId,
          hasExercise: !!exercise,
          hasSets: !!exercise?.sets
        });
        setTrainingState(prev => ({
          ...prev,
          error: 'Exercise not found'
        }));
        return;
      }

      logger.debug('Updating set', {
        exerciseId,
        setIndex,
        currentSetsCount: exercise.sets.length
      });

      let updatedSets: typeof exercise.sets;
      
      // Handle special cases: -1 = add set, -2 = remove set
      if (setIndex === -1) {
        // Add a new set with default values based on last set or defaults
        const lastSet = exercise.sets[exercise.sets.length - 1];
        const defaultReps = lastSet?.reps || 10;
        const defaultWeight = lastSet?.weight || 0;
        
        updatedSets = [
          ...exercise.sets,
          {
            id: `${exerciseId}-${exercise.sets.length}`,
            reps: defaultReps,
            weight: defaultWeight,
            completed: false,
            restTime: 60
          }
        ];
      } else if (setIndex === -2) {
        // Remove the last set (if there's more than one)
        if (exercise.sets.length <= 1) {
          setTrainingState(prev => ({
            ...prev,
            error: 'Cannot remove the last set'
          }));
          return;
        }
        updatedSets = exercise.sets.slice(0, -1);
      } else {
        // Normal update: update a specific set
        updatedSets = exercise.sets.map((set, index) => 
          index === setIndex 
            ? { ...set, reps, weight }
            : set
        );
      }

      // Update the database
      const result = await TrainingService.updateSetDetails(
        exerciseId, 
        setIndex, 
        setIndex === -1 ? updatedSets[updatedSets.length - 1].reps : reps,
        setIndex === -1 ? updatedSets[updatedSets.length - 1].weight : weight,
        updatedSets
      );
      
      if (result.success) {
        // Update both local and auth context state
        const updatedPlan = {
          ...trainingPlan,
          weeklySchedules: trainingPlan.weeklySchedules.map(week => ({
            ...week,
            dailyTrainings: week.dailyTrainings.map(daily => ({
              ...daily,
              exercises: daily.exercises.map(ex => 
                ex.id === exerciseId 
                  ? { ...ex, sets: updatedSets }
                  : ex
              )
            }))
          }))
        };
        
        logger.debug('Set update successful', {
          exerciseId,
          newSetsCount: updatedSets.length
        });
        updateTrainingPlan(updatedPlan);
      } else {
        logger.error('Set update failed', {
          exerciseId,
          error: result.error
        });
        setTrainingState(prev => ({
          ...prev,
          error: result.error || 'Failed to update set details'
        }));
      }
    } catch (error) {
      logger.error('Error in updateSetDetails', error);
      setTrainingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update set details'
      }));
    }
  }, [trainingPlan, updateTrainingPlan]);


  const showExerciseDetail = useCallback((exercise: Exercise) => {
    setTrainingState(prev => ({
      ...prev,
      isShowingExerciseDetail: true,
      selectedExercise: exercise
    }));
  }, []);

  const hideExerciseDetail = useCallback(() => {
    setTrainingState(prev => ({
      ...prev,
      isShowingExerciseDetail: false,
      selectedExercise: null
    }));
  }, []);

  const switchExerciseDetailTab = useCallback((tab: keyof ExerciseDetailTabs) => {
    // This would be implemented with local state for tab switching
    logger.debug('Switching exercise detail tab', { tab });
  }, []);

  // Note: TrainingService.calculateOneRM exists but is not currently used.
  // Analytics services use their own inline calculations or exerciseAnalyticsEngine.calculateEstimated1RM

  const startRestTimer = useCallback((duration: number, exerciseName: string) => {
    setRestTimer({
      isActive: true,
      duration,
      remaining: duration,
      exerciseName
    });

    // Start countdown
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (prev.remaining <= 1) {
          clearInterval(interval);
          return {
            ...prev,
            isActive: false,
            remaining: 0
          };
        }
        return {
          ...prev,
          remaining: prev.remaining - 1
        };
      });
    }, 1000);
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestTimer(prev => ({
      ...prev,
      isActive: false,
      remaining: 0
    }));
  }, []);

  const completeTraining = useCallback(async () => {
    if (!selectedDayTraining) return;

    try {
      setTrainingState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      // Show RPE modal instead of completing directly
      setTrainingState(prev => ({
        ...prev,
        showRPEModal: true,
        pendingCompletionDailyTrainingId: selectedDayTraining.id,
        isLoading: false
      }));
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to complete training',
        isLoading: false
      }));
    }
  }, [selectedDayTraining, trainingPlan, updateTrainingPlan]);

  const reopenTraining = useCallback(() => {
    if (!selectedDayTraining) return;

    // Check if the workout is in the past - don't allow reopening past workouts
    const dayStatus = getTrainingDayStatus(selectedDayTraining);
    if (dayStatus === 'past') {
      logger.warn('Cannot reopen past workout', {
        scheduledDate: selectedDayTraining.scheduledDate,
        dayStatus
      });
      setTrainingState(prev => ({
        ...prev,
        error: 'You cannot reopen past workouts. Focus on today\'s training! 💪'
      }));
      return;
    }

    // Show confirmation dialog
    setTrainingState(prev => ({
      ...prev,
      showReopenDialog: true
    }));
  }, [selectedDayTraining]);

  const confirmReopenTraining = useCallback(async (resetExercises: boolean = false) => {
    if (!selectedDayTraining || !trainingPlan) return;

    try {
      // Mark the training as incomplete to unlock exercises (clear completedAt and sessionRPE)
      const updatedPlan = {
        ...trainingPlan,
        weeklySchedules: trainingPlan.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily => 
            daily.id === selectedDayTraining.id 
              ? { 
                  ...daily, 
                  completed: false,
                  completedAt: undefined,
                  sessionRPE: undefined, // Clear session RPE when reopening
                  exercises: resetExercises 
                    ? daily.exercises.map(exercise => ({ ...exercise, completed: false }))
                    : daily.exercises
                }
              : daily
          )
        }))
      };
      
      // Update local state
      updateTrainingPlan(updatedPlan);

      // Update database for daily_training (clear completion and session RPE)
      await TrainingService.reopenDailyTraining(selectedDayTraining.id);

      // Update database if exercises were reset to incomplete
      if (resetExercises && selectedDayTraining) {
        // Remove temporary exercises from the plan (they were never saved)
        const exercisesToUpdate = selectedDayTraining.exercises.filter(exercise => 
          !exercise.id.startsWith('temp_') && !exercise.id.startsWith('endurance_temp_')
        );
        
        const tempExercisesCount = selectedDayTraining.exercises.length - exercisesToUpdate.length;
        
        if (tempExercisesCount > 0) {
          logger.info('Removing temporary exercises that were never saved', {
            count: tempExercisesCount,
            dailyTrainingId: selectedDayTraining.id
          });
          const planWithoutTempExercises = {
            ...updatedPlan,
            weeklySchedules: updatedPlan.weeklySchedules.map(week => ({
              ...week,
              dailyTrainings: week.dailyTrainings.map(daily =>
                daily.id === selectedDayTraining.id
                  ? {
                      ...daily,
                      exercises: daily.exercises.filter(ex => 
                        !ex.id.startsWith('temp_') && !ex.id.startsWith('endurance_temp_')
                      )
                    }
                  : daily
              )
            }))
          };
          updateTrainingPlan(planWithoutTempExercises);
        }
        
        // Bulk reset exercise completion status (much more efficient than individual calls)
        if (exercisesToUpdate.length > 0) {
          const result = await TrainingService.bulkResetExerciseCompletion(exercisesToUpdate);
          if (!result.success) {
            logger.warn('Failed to bulk reset exercises', {
              error: result.error,
              exerciseCount: exercisesToUpdate.length
            });
            // Don't throw - reopening should still succeed even if DB update fails
          }
        }
      }

      // Hide dialog
      setTrainingState(prev => ({
        ...prev,
        showReopenDialog: false
      }));

      logger.info('Training reopened', {
        dailyTrainingId: selectedDayTraining?.id,
        resetExercises
      });
    } catch (error) {
      logger.error('Error reopening training', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to reopen training',
        showReopenDialog: false
      }));
    }
  }, [selectedDayTraining, trainingPlan, updateTrainingPlan]);

  const cancelReopenTraining = useCallback(() => {
    setTrainingState(prev => ({
      ...prev,
      showReopenDialog: false
    }));
  }, []);

  // Exercise swap functions
  const showExerciseSwapModal = useCallback((exercise: Exercise) => {
    setExerciseToSwap(exercise);
    setShowExerciseSwapModalState(true);
  }, []);

  const hideExerciseSwapModal = useCallback(() => {
    setShowExerciseSwapModalState(false);
    setExerciseToSwap(null);
  }, []);

  // API call with error handling for swap exercise
  const { execute: executeSwapExercise, ErrorBannerComponent: SwapExerciseErrorBanner } = useApiCallWithBanner(
    async (exerciseId: string, newExercise: Exercise, trainingPlan: TrainingPlan) => {
      // Update database
      const { error } = await supabase
        .from('strength_exercise')
        .update({
          exercise_id: parseInt(newExercise.id),
          completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', isNaN(Number(exerciseId)) ? exerciseId : Number(exerciseId));

      if (error) {
        throw new Error(error.message || 'Failed to update exercise in database');
      }

      // Update both local and auth context state
      const updatedPlan = {
        ...trainingPlan,
        weeklySchedules: trainingPlan.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily => ({
            ...daily,
            exercises: daily.exercises.map(exercise => 
              exercise.id === exerciseId 
                ? { 
                    ...exercise, 
                    exercise: newExercise,
                    // Reset completion status when swapping exercises
                    completed: false,
                    // Reset sets to default values based on new exercise
                    sets: exercise.sets?.map((set, index) => ({
                      ...set,
                      reps: newExercise.main_muscles?.includes('Chest') ? 12 : 10, // Default reps
                      weight: 0,
                      completed: false
                    })) || []
                  }
                : exercise
            )
          }))
        }))
      };

      updateTrainingPlan(updatedPlan);
      return updatedPlan;
    },
    {
      retryCount: 3,
      onSuccess: () => {
        hideExerciseSwapModal();
      },
    }
  );

  const swapExercise = useCallback(async (exerciseId: string, newExercise: Exercise) => {
    if (!trainingPlan) return;

    // Check if the selected day is editable
    const currentDay = trainingPlan.weeklySchedules
      .find(week => week.weekNumber === trainingState.currentWeekSelected)
      ?.dailyTrainings[trainingState.selectedDayIndex === -1 ? 0 : trainingState.selectedDayIndex];
    
    if (currentDay && !isTrainingDayEditable(currentDay)) {
      logger.warn('Cannot edit locked training day', {
        action: 'swapExercise',
        scheduledDate: currentDay.scheduledDate
      });
      setTrainingState(prev => ({
        ...prev,
        error: 'This workout is locked. You can only edit today\'s workout.'
      }));
      return;
    }

    // Validate exercise swap data
    const validationResult = validateExerciseSwap(newExercise);
    if (!validationResult.isValid) {
      logger.error('Invalid exercise swap data', {
        error: validationResult.errorMessage,
        exercise: newExercise
      });
      setTrainingState(prev => ({
        ...prev,
        error: validationResult.errorMessage || 'Invalid exercise data'
      }));
      return;
    }

    await executeSwapExercise(exerciseId, validationResult.exercise || newExercise, trainingPlan);
  }, [trainingPlan, executeSwapExercise, hideExerciseSwapModal]);

  // API call with error handling for complete daily training (persists add/remove operations)
  const { execute: executeCompleteTraining, ErrorBannerComponent: CompleteTrainingErrorBanner } = useApiCallWithBanner(
    async (dailyTrainingId: string, rpe: number, exercises: TrainingExercise[], currentTrainingPlan: TrainingPlan) => {
      const result = await TrainingService.completeDailyTraining(
        dailyTrainingId,
        rpe,
        exercises
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete training');
      }

      return { result, rpe, dailyTrainingId, currentTrainingPlan }; // Return all needed data for onSuccess
    },
    {
      retryCount: 3,
      onSuccess: async ({ result, rpe, dailyTrainingId, currentTrainingPlan }) => {
        // Update local state with completedAt timestamp and sessionRPE
        const now = new Date();
        let updatedPlan = {
          ...currentTrainingPlan,
          weeklySchedules: currentTrainingPlan.weeklySchedules.map((week: WeeklySchedule) => ({
            ...week,
            dailyTrainings: week.dailyTrainings.map((daily: DailyTraining) =>
              daily.id === dailyTrainingId
                ? { 
                    ...daily, 
                    completed: true, 
                    completedAt: now, 
                    sessionRPE: rpe,
                    // CRITICAL: Mark all exercises and sets as completed for insights extraction
                    exercises: daily.exercises.map((exercise: TrainingExercise) => ({
                      ...exercise,
                      completed: true,  // Mark exercise as completed
                      sets: exercise.sets?.map((set: any) => ({
                        ...set,
                        completed: true  // Mark all sets as completed
                      })) || []
                    }))
                  }
                : daily
            )
          }))
        };

        // Update exercise IDs if they were recreated (saveDailyTrainingExercises deletes and recreates)
        const exerciseIdMap = result.data?.exerciseIdMap;
        if (exerciseIdMap && exerciseIdMap.size > 0) {
          // Update exercises with new IDs from the database (preserve completed flags)
          updatedPlan = {
            ...updatedPlan,
            weeklySchedules: updatedPlan.weeklySchedules.map((week: WeeklySchedule) => ({
              ...week,
              dailyTrainings: week.dailyTrainings.map((daily: DailyTraining) =>
                daily.id === dailyTrainingId
                  ? {
                      ...daily,
                      exercises: daily.exercises.map((exercise: TrainingExercise) => {
                        const newId = exerciseIdMap.get(exercise.id);
                        // Preserve completed flags when updating ID
                        return newId ? { ...exercise, id: newId } : exercise;
                      })
                    }
                  : daily
              )
            }))
          };
          logger.info('Updated exercise IDs after completion', {
            count: exerciseIdMap.size,
            dailyTrainingId
          });
        }
        
        // Update both local and auth context training plans
        updateTrainingPlan(updatedPlan);
        
        setTrainingState(prev => ({
          ...prev,
          completedTrainings: new Set([...prev.completedTrainings, dailyTrainingId]),
          isLoading: false,
          pendingCompletionDailyTrainingId: null
        }));

        // Clear insights cache to ensure fresh data after workout completion
        try {
          InsightsAnalyticsService.clearCache();
          logger.info('Cleared insights cache after workout completion');
        } catch (error) {
          logger.warn('Failed to clear insights cache', error);
        }

        // Fetch fresh insights summary after workout completion (backend handles caching)
        // This triggers LLM generation, so we set a flag that InsightsScreen can detect
        // InsightsScreen will show loading spinner and then load the cached result
        const userProfileId = authState.userProfile?.id;
        if (userProfileId) {
          // Generate insights asynchronously (non-blocking)
          (async () => {
            try {
              // Get weak points and top exercises for better AI context
              const [weakPointsResult, topExercisesResult] = await Promise.all([
                InsightsAnalyticsService.getWeakPointsAnalysis(
                  userProfileId,
                  updatedPlan
                ),
                InsightsAnalyticsService.getTopPerformingExercises(
                  userProfileId,
                  updatedPlan
                )
              ]);

              // Call insights summary API (backend will generate new insights and cache them)
              const insightsResult = await InsightsAnalyticsService.getInsightsSummary(
                userProfileId,
                updatedPlan,
                weakPointsResult.success ? weakPointsResult.data : undefined,
                topExercisesResult.success ? topExercisesResult.data : undefined
              );
              
              // Update context with new insights (if generation succeeded)
              if (insightsResult.success && insightsResult.data) {
                setAuthInsightsSummary(insightsResult.data);
                logger.info('Insights summary refreshed and updated in context after workout completion');
              } else {
                logger.warn('Failed to generate insights summary', insightsResult.error);
              }
            } catch (error) {
              // Non-blocking - log but don't fail
              logger.warn('Failed to refresh insights summary', error);
            }
          })();
        }

        // Cancel today's training reminder since training is completed
        await NotificationService.cancelTrainingReminder();
      },
      onError: (error) => {
        setTrainingState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to complete training',
          isLoading: false,
          pendingCompletionDailyTrainingId: null
        }));
      },
    }
  );

  const handleRPESelection = useCallback(async (rpe: number) => {
    if (!trainingState.pendingCompletionDailyTrainingId) return;

    // Validate RPE before proceeding (strict mode - block invalid user input)
    const rpeValidation = validateRPE(rpe, { allowReplacement: false });
    
    // If validation fails, show error and block the operation
    if (!rpeValidation.isValid) {
      logger.error('Invalid RPE value from user input', {
        rpe,
        error: rpeValidation.errorMessage
      });
      setTrainingState(prev => ({
        ...prev,
        error: rpeValidation.errorMessage || 'Invalid RPE value',
        showRPEModal: false,
        pendingCompletionDailyTrainingId: null
      }));
      return;
    }

    setTrainingState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      showRPEModal: false
    }));

    const dailyTrainingId = trainingState.pendingCompletionDailyTrainingId;
    
    // Get current exercises from selectedDayTraining (includes all added/removed exercises)
    const currentDailyTraining = trainingPlan?.weeklySchedules
      .find(week => week.weekNumber === trainingState.currentWeekSelected)
      ?.dailyTrainings.find(daily => daily.id === dailyTrainingId);
    
    const exercises = currentDailyTraining?.exercises || [];
    
    if (!trainingPlan) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Training plan not available',
        isLoading: false,
        pendingCompletionDailyTrainingId: null
      }));
      return;
    }
    
    // Use validated RPE value
    const validatedRPE = rpeValidation.rpe || rpe;
    
    // Use the new error handling system
    // Success and error handling is now in onSuccess/onError callbacks of useApiCallWithBanner
    await executeCompleteTraining(dailyTrainingId, validatedRPE, exercises, trainingPlan);
  }, [trainingState.pendingCompletionDailyTrainingId, trainingPlan, trainingState.currentWeekSelected, executeCompleteTraining]);

  const handleRPEModalClose = useCallback(() => {
    setTrainingState(prev => ({
      ...prev,
      showRPEModal: false,
      pendingCompletionDailyTrainingId: null
    }));
  }, []);

  const addExercise = useCallback(async (
    exercise: Exercise,
    dailyTrainingId: string
  ) => {
    try {
      // Check if the selected day is editable
      const currentDay = trainingPlan?.weeklySchedules
        .find(week => week.weekNumber === trainingState.currentWeekSelected)
        ?.dailyTrainings.find(daily => daily.id === dailyTrainingId);
      
      if (currentDay && !isTrainingDayEditable(currentDay)) {
        logger.warn('Cannot edit locked training day', {
          action: 'addExercise',
          scheduledDate: currentDay.scheduledDate
        });
        setTrainingState(prev => ({
          ...prev,
          error: 'This workout is locked. You can only edit today\'s workout.'
        }));
        return;
      }

      // Check if training is completed/locked - if so, don't allow add
      const currentWeek = trainingPlan?.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      const currentDailyTraining = currentWeek?.dailyTrainings.find(
        daily => daily.id === dailyTrainingId
      );
      
      if (!currentDailyTraining) {
        logger.error('Daily training not found', {
          dailyTrainingId,
          weekNumber: trainingState.currentWeekSelected
        });
        return;
      }

      // Check if this is today's workout
      const today = new Date();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
      const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
      const todayName = dayNames[mondayFirstIndex];
      
      if (currentDailyTraining.dayOfWeek !== todayName) {
        logger.info('Cannot add exercises - not today\'s workout', {
          requestedDay: currentDailyTraining.dayOfWeek,
          today: todayName
        });
        return;
      }

      if (currentDailyTraining.completed) {
        logger.info('Cannot add exercises - training is completed and locked', {
          dailyTrainingId: currentDailyTraining.id
        });
        return;
      }

      // Calculate next execution_order (max + 1 from existing exercises)
      const existingExercises = currentDailyTraining.exercises || [];
      const maxExecutionOrder = existingExercises.length > 0
        ? Math.max(...existingExercises.map(ex => ex.executionOrder || 0))
        : 0;
      const nextExecutionOrder = maxExecutionOrder + 1;

      // Generate temporary ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create new TrainingExercise object with defaults
      const newExercise: TrainingExercise = {
        id: tempId,
        exerciseId: exercise.id.toString(),
        exercise: exercise,
        sets: [
          { id: `${tempId}-0`, reps: 12, weight: 0, completed: false, restTime: 60 },
          { id: `${tempId}-1`, reps: 12, weight: 0, completed: false, restTime: 60 },
          { id: `${tempId}-2`, reps: 12, weight: 0, completed: false, restTime: 60 },
        ],
        weight: [0, 0, 0], // For backward compatibility
        executionOrder: nextExecutionOrder,
        completed: false,
        order: nextExecutionOrder, // Legacy field
      };

      // Update local state immediately (optimistic update)
      const updatedPlan = {
        ...trainingPlan!,
        weeklySchedules: trainingPlan!.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily =>
            daily.id === dailyTrainingId
              ? { ...daily, exercises: [...daily.exercises, newExercise] }
              : daily
          )
        }))
      };

      // Update auth context training plan
      updateTrainingPlan(updatedPlan);
    } catch (error) {
      logger.error('Error adding exercise', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to add exercise'
      }));
    }
  }, [trainingPlan, trainingState.currentWeekSelected, updateTrainingPlan]);

  const addEnduranceSession = useCallback(async (
    sessionData: {
      sportType: string;
      trainingVolume: number;
      unit: string;
      heartRateZone: number;
      name?: string;
      description?: string;
    },
    dailyTrainingId: string
  ) => {
    try {
      // Check if the selected day is editable
      const currentDay = trainingPlan?.weeklySchedules
        .find(week => week.weekNumber === trainingState.currentWeekSelected)
        ?.dailyTrainings.find(daily => daily.id === dailyTrainingId);
      
      if (currentDay && !isTrainingDayEditable(currentDay)) {
        logger.warn('Cannot edit locked training day', {
          action: 'addEnduranceSession',
          scheduledDate: currentDay.scheduledDate
        });
        setTrainingState(prev => ({
          ...prev,
          error: 'This workout is locked. You can only edit today\'s workout.'
        }));
        return;
      }

      // Check if training is completed/locked - if so, don't allow add
      const currentWeek = trainingPlan?.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      const currentDailyTraining = currentWeek?.dailyTrainings.find(
        daily => daily.id === dailyTrainingId
      );
      
      if (!currentDailyTraining) {
        logger.error('Daily training not found', {
          dailyTrainingId,
          weekNumber: trainingState.currentWeekSelected
        });
        return;
      }

      if (currentDailyTraining.completed) {
        logger.info('Cannot add sessions - training is completed and locked', {
          dailyTrainingId: currentDailyTraining.id
        });
        return;
      }

      // Calculate next execution_order (max + 1 from existing exercises)
      const existingExercises = currentDailyTraining.exercises || [];
      const maxExecutionOrder = existingExercises.length > 0
        ? Math.max(...existingExercises.map(ex => ex.executionOrder || 0))
        : 0;
      const nextExecutionOrder = maxExecutionOrder + 1;

      // Generate temporary ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create new TrainingExercise object with endurance session
      const newExercise: TrainingExercise = {
        id: tempId,
        exerciseId: `endurance_${tempId}`,
        executionOrder: nextExecutionOrder,
        completed: false,
        order: nextExecutionOrder, // Legacy field
        enduranceSession: {
          id: tempId,
          name: sessionData.name || `${sessionData.sportType} - ${sessionData.trainingVolume} ${sessionData.unit}`,
          sportType: sessionData.sportType,
          trainingVolume: sessionData.trainingVolume || 30,
          unit: sessionData.unit || 'minutes',
          heartRateZone: sessionData.heartRateZone || 3,
          executionOrder: nextExecutionOrder,
          completed: false,
          description: sessionData.description,
        },
      };

      // Update local state immediately (optimistic update)
      const updatedPlan = {
        ...trainingPlan!,
        weeklySchedules: trainingPlan!.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily =>
            daily.id === dailyTrainingId
              ? { ...daily, exercises: [...daily.exercises, newExercise], isRestDay: false }
              : daily
          )
        }))
      };

      // Update auth context training plan
      updateTrainingPlan(updatedPlan);
    } catch (error) {
      logger.error('Error adding endurance session', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to add endurance session'
      }));
    }
  }, [trainingPlan, trainingState.currentWeekSelected, updateTrainingPlan]);

  const removeExercise = useCallback(async (
    exerciseId: string,
    isEndurance: boolean,
    dailyTrainingId: string
  ) => {
    try {
      // Check if the selected day is editable
      const currentDay = trainingPlan?.weeklySchedules
        .find(week => week.weekNumber === trainingState.currentWeekSelected)
        ?.dailyTrainings.find(daily => daily.id === dailyTrainingId);
      
      if (currentDay && !isTrainingDayEditable(currentDay)) {
        logger.warn('Cannot edit locked training day', {
          action: 'removeExercise',
          scheduledDate: currentDay.scheduledDate
        });
        setTrainingState(prev => ({
          ...prev,
          error: 'This workout is locked. You can only edit today\'s workout.'
        }));
        return;
      }
      // Check if training is completed/locked - if so, don't allow remove
      const currentWeek = trainingPlan?.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      const currentDailyTraining = currentWeek?.dailyTrainings.find(
        daily => daily.id === dailyTrainingId
      );
      
      if (!currentDailyTraining) {
        logger.error('Daily training not found', {
          dailyTrainingId,
          weekNumber: trainingState.currentWeekSelected
        });
        return;
      }

      // Check if this is today's workout
      const today = new Date();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
      const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
      const todayName = dayNames[mondayFirstIndex];
      
      if (currentDailyTraining.dayOfWeek !== todayName) {
        logger.info('Cannot remove exercises - not today\'s workout', {
          requestedDay: currentDailyTraining.dayOfWeek,
          today: todayName
        });
        return;
      }

      if (currentDailyTraining.completed) {
        logger.info('Cannot remove exercises - training is completed and locked', {
          dailyTrainingId: currentDailyTraining.id
        });
        return;
      }

      // Remove exercise from exercises array
      const updatedExercises = currentDailyTraining.exercises.filter(
        ex => ex.id !== exerciseId
      );

      // Check if exercises array is now empty
      const isEmpty = updatedExercises.length === 0;

      // If not empty, reorder execution_order for remaining items (1, 2, 3, ...)
      if (!isEmpty) {
        updatedExercises.forEach((ex, index) => {
          ex.executionOrder = index + 1;
          ex.order = index + 1; // Legacy field
        });
      }

      // Update local state
      const updatedPlan = {
        ...trainingPlan!,
        weeklySchedules: trainingPlan!.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily =>
            daily.id === dailyTrainingId
              ? { 
                  ...daily, 
                  exercises: updatedExercises,
                  isRestDay: isEmpty // Convert to rest day if empty
                }
              : daily
          )
        }))
      };

      // Update auth context training plan
      updateTrainingPlan(updatedPlan);
    } catch (error) {
      logger.error('Error removing exercise', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to remove exercise'
      }));
    }
  }, [trainingPlan, trainingState.currentWeekSelected, updateTrainingPlan]);

  const refreshTrainingPlan = useCallback(async () => {
    if (!authState.userProfile) return;

    try {
      setTrainingState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      const result = await TrainingService.getTrainingPlan(authState.userProfile.id!);
      
      if (result.success && result.data) {
        updateTrainingPlan(result.data);
        setTrainingState(prev => ({
          ...prev,
          isLoading: false
        }));
      } else {
        setTrainingState(prev => ({
          ...prev,
          error: result.error || 'Failed to refresh training plan',
          isLoading: false
        }));
      }
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to refresh training plan',
        isLoading: false
      }));
    }
  }, [authState.userProfile, updateTrainingPlan]);

  // Computed properties
  const isPlanComplete = useMemo(() => {
    return trainingPlan?.completed || false;
  }, [trainingPlan]);

  const currentWeekProgress = useMemo(() => {
    if (!trainingPlan) return 0;
    
    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );
    
    if (!currentWeek) return 0;
    
    return TrainingService.calculateWeeklyProgress(currentWeek.dailyTrainings);
  }, [trainingPlan, trainingState.currentWeekSelected]);

  const totalTrainingsCompleted = useMemo(() => {
    if (!trainingPlan) return 0;
    
    return trainingPlan.weeklySchedules.reduce((total, week) => {
      return total + week.dailyTrainings.filter(training => training.completed).length;
    }, 0);
  }, [trainingPlan]);

  const streak = useMemo(() => {
    // This would calculate the current training streak
    // For now, return a placeholder
    return 0;
  }, [trainingPlan]);

  return {
    // State
    trainingState,
    trainingPlan,
    selectedDayTraining,
    progressRing,
    weekNavigation,
    dayIndicators,
    exerciseDetailTabs,
    restTimer,
    trainingProgress,
    
    // Actions
    selectWeek,
    selectDay,
    toggleExerciseCompletion,
    updateSetDetails,
    showExerciseDetail,
    hideExerciseDetail,
    switchExerciseDetailTab,
    startRestTimer,
    stopRestTimer,
    completeTraining,
    reopenTraining,
    confirmReopenTraining,
    cancelReopenTraining,
    refreshTrainingPlan,
    handleRPESelection,
    handleRPEModalClose,
    showExerciseSwapModal,
    hideExerciseSwapModal,
    swapExercise,
    addExercise,
    addEnduranceSession,
    removeExercise,
    
    // Exercise swap state
    isExerciseSwapModalVisible: showExerciseSwapModalState,
    exerciseToSwap,
    
    // Error banners
    SwapExerciseErrorBanner,
    CompleteTrainingErrorBanner,
    
    // Computed
    isPlanComplete,
    currentWeekProgress,
    totalTrainingsCompleted,
    streak
  };
};

