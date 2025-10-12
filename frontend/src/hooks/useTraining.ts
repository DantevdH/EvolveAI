// Training Hook - Manages training state and operations
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrainingService } from '../services/trainingService';
import { NotificationService } from '../services/NotificationService';
import { ExerciseSwapService } from '../services/exerciseSwapService';
import { supabase } from '../config/supabase';
import {
  TrainingState,
  TrainingPlan,
  DailyTraining,
  Exercise,
  ProgressRingData,
  WeekNavigationData,
  DayIndicator,
  ExerciseDetailTabs,
  OneRMCalculator,
  RestTimer,
  TrainingProgress,
  UseTrainingReturn
} from '../types/training';

const initialState: TrainingState = {
  currentWeekSelected: 1,
  selectedDayIndex: -1, // -1 means "auto-select today"
  completedExercises: new Set(),
  completedTrainings: new Set(),
  isShowingExerciseDetail: false,
  selectedExercise: null,
  isLoading: false,
  error: null,
  showReopenDialog: false
};

export const useTraining = (): UseTrainingReturn => {
  const { state: authState, refreshTrainingPlan: refreshAuthTrainingPlan, setTrainingPlan: setAuthTrainingPlan } = useAuth();
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
      // Use the training plan directly (new TrainingService format)
      console.log('✅ useTraining: Using TrainingService format directly');
      setTrainingPlan(authState.trainingPlan);
      
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
    
    return {
      ...dailyTraining,
      completed: isCompleted
    };
  }, [trainingPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex]);

  const progressRing = useMemo((): ProgressRingData => {
    if (!trainingPlan) {
      return { progress: 0, total: 0, completed: 0, color: '#4CAF50' };
    }

    const currentWeek = trainingPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );

    if (!currentWeek) {
      return { progress: 0, total: 0, completed: 0, color: '#4CAF50' };
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
      color: '#932322' // Primary red color
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

  const oneRMCalculator: OneRMCalculator = {
    weight: 0,
    reps: 0,
    oneRM: 0,
    isVisible: false
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
      const currentDailyTraining = currentWeek?.dailyTrainings[trainingState.selectedDayIndex];
      
      if (currentDailyTraining?.completed) {
        // Training is completed and locked - don't allow changes
        console.log('🔒 Training is completed and locked. Use reopenTraining to make changes.');
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
            // All exercises completed - mark daily training as completed
            console.log('🎉 All exercises completed! Marking daily training as completed...');
            
            // Update the daily training completion status
            updatedPlan.weeklySchedules = updatedPlan.weeklySchedules.map(week => ({
              ...week,
              dailyTrainings: week.dailyTrainings.map(daily => 
                daily.id === updatedCurrentDailyTraining.id 
                  ? { ...daily, completed: true }
                  : daily
              )
            }));

            // Update database: Mark all exercises as completed and complete the daily training
            const exerciseUpdatePromises = updatedCurrentDailyTraining.exercises.map(exercise => 
              TrainingService.updateExerciseCompletion(exercise.id, true)
            );
            
            Promise.all(exerciseUpdatePromises).then(() => {
              return TrainingService.completeDailyTraining(updatedCurrentDailyTraining.id);
            }).catch(error => {
              console.error('❌ Error updating exercise completion or completing daily training:', error);
              setTrainingState(prev => ({
                ...prev,
                error: 'Failed to complete training'
              }));
            });
          } else if (!allExercisesCompleted && updatedCurrentDailyTraining.completed) {
            // Some exercises were unchecked - mark training as incomplete
            
            // Update the daily training completion status
            updatedPlan.weeklySchedules = updatedPlan.weeklySchedules.map(week => ({
              ...week,
              dailyTrainings: week.dailyTrainings.map(daily => 
                daily.id === updatedCurrentDailyTraining.id 
                  ? { ...daily, completed: false }
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

      const result = await TrainingService.updateSetDetails(exerciseId, setIndex, reps, weight);
      
      if (result.success) {
        // Update both local and auth context state instead of refetching
        const updatedPlan = {
          ...trainingPlan!,
          weeklySchedules: trainingPlan!.weeklySchedules.map(week => ({
            ...week,
            dailyTrainings: week.dailyTrainings.map(daily => ({
              ...daily,
              exercises: daily.exercises.map(exercise => 
                exercise.id === exerciseId 
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((set, index) => 
                        index === setIndex 
                          ? { ...set, reps, weight }
                          : set
                      )
                    }
                  : exercise
              )
            }))
          }))
        };
        
        updateTrainingPlan(updatedPlan);
      } else {
        setTrainingState(prev => ({
          ...prev,
          error: result.error || 'Failed to update set details'
        }));
      }
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to update set details'
      }));
    }
  }, [trainingPlan, updateTrainingPlan]);

  const updateIntensity = useCallback(async (exerciseId: string, intensity: number) => {
    try {
      setTrainingState(prev => ({
        ...prev,
        error: null
      }));

      // Update local state immediately for better UX
      const updatedPlan = {
        ...trainingPlan!,
        weeklySchedules: trainingPlan!.weeklySchedules.map(week => ({
          ...week,
          dailyTrainings: week.dailyTrainings.map(daily => ({
            ...daily,
            exercises: daily.exercises.map(exercise => {
              if (exercise.id === exerciseId) {
                return { ...exercise, intensity };
              }
              return exercise;
            })
          }))
        }))
      };

      updateTrainingPlan(updatedPlan);
      
      // Save intensity to database for endurance sessions
      const updatedExercise = updatedPlan.weeklySchedules
        .flatMap(week => week.dailyTrainings)
        .flatMap(daily => daily.exercises)
        .find(ex => ex.id === exerciseId);
      
      if (updatedExercise?.exerciseId?.startsWith('endurance_')) {
        const dbResult = await TrainingService.updateEnduranceIntensity(exerciseId, intensity);
        if (!dbResult.success) {
          setTrainingState(prev => ({
            ...prev,
            error: `Failed to save intensity: ${dbResult.error}`
          }));
        }
      }
    } catch (error) {
      console.error('Error updating intensity:', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to update intensity'
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
    console.log('Switching to tab:', tab);
  }, []);

  const toggleOneRMCalculator = useCallback(() => {
    // This would be implemented with local state for calculator visibility
    console.log('Toggling 1RM calculator');
  }, []);

  const calculateOneRM = useCallback((weight: number, reps: number): number => {
    return TrainingService.calculateOneRM(weight, reps);
  }, []);

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

      // Save intensity values for endurance sessions before completing
      const enduranceSessions = selectedDayTraining.exercises.filter(ex => 
        ex.exerciseId?.startsWith('endurance_') && ex.intensity
      );
      
      if (enduranceSessions.length > 0) {
        console.log('💾 Saving intensity values for endurance sessions:', enduranceSessions.length);
        for (const session of enduranceSessions) {
          try {
            const { data, error } = await supabase
              .from('endurance_session')
              .update({
                intensity: session.intensity,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.id)
              .select()
              .single();

            if (error) {
              console.error('Error saving intensity for session', session.id, ':', error);
            } else {
              console.log('✅ Intensity saved for session', session.id, ':', session.intensity);
            }
          } catch (error) {
            console.error('Error saving intensity for session', session.id, ':', error);
          }
        }
      }

      const result = await TrainingService.completeDailyTraining(
        selectedDayTraining.id
      );

      if (result.success) {
        setTrainingState(prev => ({
          ...prev,
          completedTrainings: new Set([...prev.completedTrainings, selectedDayTraining.id]),
          isLoading: false
        }));

        // Cancel today's training reminder since training is completed
        await NotificationService.cancelTrainingReminder();
      } else {
        setTrainingState(prev => ({
          ...prev,
          error: result.error || 'Failed to complete training',
          isLoading: false
        }));
      }
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to complete training',
        isLoading: false
      }));
    }
  }, [selectedDayTraining]);

  const reopenTraining = useCallback(() => {
    if (!selectedDayTraining) return;

    // Show confirmation dialog
    setTrainingState(prev => ({
      ...prev,
      showReopenDialog: true
    }));
  }, [selectedDayTraining]);

  const confirmReopenTraining = useCallback((resetExercises: boolean = false) => {
    if (!selectedDayTraining || !trainingPlan) return;

    // Mark the training as incomplete to unlock exercises
    const updatedPlan = {
      ...trainingPlan,
      weeklySchedules: trainingPlan.weeklySchedules.map(week => ({
        ...week,
        dailyTrainings: week.dailyTrainings.map(daily => 
          daily.id === selectedDayTraining.id 
            ? { 
                ...daily, 
                completed: false,
                exercises: resetExercises 
                  ? daily.exercises.map(exercise => ({ ...exercise, completed: false }))
                  : daily.exercises
              }
            : daily
        )
      }))
    };
    
    updateTrainingPlan(updatedPlan);

    // Update database if exercises were reset to incomplete
    if (resetExercises && selectedDayTraining) {
      const exerciseUpdatePromises = selectedDayTraining.exercises.map(exercise => 
        TrainingService.updateExerciseCompletion(exercise.id, false)
      );
      
      Promise.all(exerciseUpdatePromises).catch(error => {
        console.error('Error updating exercise completion to incomplete:', error);
      });
    }

    // Hide dialog
    setTrainingState(prev => ({
      ...prev,
      showReopenDialog: false
    }));

    console.log(`🔓 Training reopened - exercises are now unlocked for editing${resetExercises ? ' (all exercises reset)' : ' (exercise completion preserved)'}`);
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

  const swapExercise = useCallback(async (exerciseId: string, newExercise: Exercise) => {
    if (!trainingPlan) return;

    try {
      
      // Update both local and auth context state immediately
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
                    sets: exercise.sets.map((set, index) => ({
                      ...set,
                      reps: newExercise.main_muscles?.includes('Chest') ? 12 : 10, // Default reps
                      weight: 0,
                      completed: false
                    }))
                  }
                : exercise
            )
          }))
        }))
      };

      // Update database
      const { error } = await supabase
        .from('training_exercises')
        .update({
          exercise_id: parseInt(newExercise.id),
          completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', exerciseId);

      if (error) {
        console.error('❌ Error updating exercise in database:', error);
        setTrainingState(prev => ({
          ...prev,
          error: 'Failed to swap exercise'
        }));
        return;
      }

      // Update both local and auth context training plans
      updateTrainingPlan(updatedPlan);
      
      
      // Hide the modal
      hideExerciseSwapModal();
      
    } catch (error) {
      console.error('💥 Error swapping exercise:', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to swap exercise'
      }));
    }
  }, [trainingPlan, updateTrainingPlan, hideExerciseSwapModal]);

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
    oneRMCalculator,
    restTimer,
    trainingProgress,
    
    // Actions
    selectWeek,
    selectDay,
    toggleExerciseCompletion,
    updateSetDetails,
    updateIntensity,
    showExerciseDetail,
    hideExerciseDetail,
    switchExerciseDetailTab,
    toggleOneRMCalculator,
    calculateOneRM,
    startRestTimer,
    stopRestTimer,
    completeTraining,
    reopenTraining,
    confirmReopenTraining,
    cancelReopenTraining,
    refreshTrainingPlan,
    showExerciseSwapModal,
    hideExerciseSwapModal,
    swapExercise,
    
    // Exercise swap state
    isExerciseSwapModalVisible: showExerciseSwapModalState,
    exerciseToSwap,
    
    // Computed
    isPlanComplete,
    currentWeekProgress,
    totalTrainingsCompleted,
    streak
  };
};

