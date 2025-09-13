// Training Hook - Manages training state and operations
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrainingService } from '../services/trainingService';
import { NotificationService } from '../services/NotificationService';
import { ExerciseSwapService } from '../services/exerciseSwapService';
import { supabase } from '../config/supabase';
import {
  TrainingState,
  WorkoutPlan,
  DailyWorkout,
  Exercise,
  ProgressRingData,
  WeekNavigationData,
  DayIndicator,
  ExerciseDetailTabs,
  OneRMCalculator,
  RestTimer,
  WorkoutProgress,
  UseTrainingReturn
} from '../types/training';

const initialState: TrainingState = {
  currentWeekSelected: 1,
  selectedDayIndex: -1, // -1 means "auto-select today"
  completedExercises: new Set(),
  completedWorkouts: new Set(),
  isShowingExerciseDetail: false,
  selectedExercise: null,
  isLoading: false,
  error: null,
  showReopenDialog: false
};

export const useTraining = (): UseTrainingReturn => {
  const { state: authState, refreshWorkoutPlan: refreshAuthWorkoutPlan, setWorkoutPlan: setAuthWorkoutPlan } = useAuth();
  const [trainingState, setTrainingState] = useState<TrainingState>(initialState);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
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

  // Helper function to update both local and auth context workout plans
  // Only use this when we actually modify the workout plan, not during initialization
  const updateWorkoutPlan = useCallback((updatedPlan: WorkoutPlan) => {
    setWorkoutPlan(updatedPlan);
    setAuthWorkoutPlan(updatedPlan);
  }, [setAuthWorkoutPlan]);

  // Initialize training data
  useEffect(() => {
    if (authState.userProfile && authState.workoutPlan) {
      // Use the workout plan directly (new TrainingService format)
      console.log('✅ useTraining: Using TrainingService format directly');
      setWorkoutPlan(authState.workoutPlan);
      
      // Only auto-select today's workout on first initialization, not on updates
      if (!hasInitialized.current) {
        setTrainingState(prev => ({
          ...prev,
          currentWeekSelected: 1, // Start with week 1
          selectedDayIndex: -1 // Auto-select today's workout only on first load
        }));
        hasInitialized.current = true;
      }
    }
  }, [authState.userProfile, authState.workoutPlan]);


  // Computed values
  const selectedDayWorkout = useMemo(() => {
    if (!workoutPlan) return null;
    
    const currentWeek = workoutPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );
    
    if (!currentWeek) return null;
    
    // If selectedDayIndex is -1, auto-select today's workout
    let dayIndex = trainingState.selectedDayIndex;
    if (dayIndex === -1) {
      const today = new Date();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      // Convert JavaScript Date.getDay() (0=Sunday) to our Monday-first array (0=Monday)
      const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
      const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
      const todayName = dayNames[mondayFirstIndex];
      
      dayIndex = currentWeek.dailyWorkouts.findIndex(workout => workout.dayOfWeek === todayName);
      if (dayIndex === -1) {
        dayIndex = 0; // Fallback to first day if today not found
      }
    }
    
    if (!currentWeek.dailyWorkouts[dayIndex]) {
      return null;
    }
    
    const dailyWorkout = currentWeek.dailyWorkouts[dayIndex];
    
    // Compute completion status dynamically
    const isCompleted = dailyWorkout.exercises.length > 0 && 
                       dailyWorkout.exercises.every(exercise => exercise.completed);
    
    return {
      ...dailyWorkout,
      completed: isCompleted
    };
  }, [workoutPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex]);

  const progressRing = useMemo((): ProgressRingData => {
    if (!workoutPlan) {
      return { progress: 0, total: 0, completed: 0, color: '#4CAF50' };
    }

    const currentWeek = workoutPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );

    if (!currentWeek) {
      return { progress: 0, total: 0, completed: 0, color: '#4CAF50' };
    }

    const totalWorkouts = currentWeek.dailyWorkouts.filter(workout => !workout.isRestDay).length;
    const completedWorkouts = currentWeek.dailyWorkouts.filter(workout => {
      if (workout.isRestDay) return false;
      // Compute completion status dynamically
      return workout.exercises.length > 0 && workout.exercises.every(exercise => exercise.completed);
    }).length;
    const progress = totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0;

    return {
      progress,
      total: totalWorkouts,
      completed: completedWorkouts,
      color: '#932322' // Primary red color
    };
  }, [workoutPlan, trainingState.currentWeekSelected]);

  const weekNavigation = useMemo((): WeekNavigationData => {
    if (!workoutPlan) {
      return {
        currentWeek: 1,
        totalWeeks: 1,
        canGoBack: false,
        canGoForward: false
      };
    }

    return {
      currentWeek: trainingState.currentWeekSelected,
      totalWeeks: workoutPlan.totalWeeks,
      canGoBack: trainingState.currentWeekSelected > 1,
      canGoForward: trainingState.currentWeekSelected < workoutPlan.totalWeeks
    };
  }, [workoutPlan, trainingState.currentWeekSelected]);

  const dayIndicators = useMemo((): DayIndicator[] => {
    if (!workoutPlan) return [];

    const currentWeek = workoutPlan.weeklySchedules.find(
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
      selectedDayIndex = currentWeek.dailyWorkouts.findIndex(workout => workout.dayOfWeek === todayName);
      if (selectedDayIndex === -1) {
        selectedDayIndex = 0; // Fallback to first day
      }
    }

    return currentWeek.dailyWorkouts.map((workout, index) => {
      const isToday = workout.dayOfWeek === todayName;
      const isPastWeek = trainingState.currentWeekSelected < workoutPlan.currentWeek;
      
      // Compute completion status dynamically
      const isCompleted = workout.exercises.length > 0 && 
                         workout.exercises.every(exercise => exercise.completed);

      return {
        dayOfWeek: workout.dayOfWeek,
        isSelected: index === selectedDayIndex,
        isCompleted: isCompleted,
        isRestDay: workout.isRestDay,
        isToday: isToday && !isPastWeek,
        isPastWeek: isPastWeek
      };
    });
  }, [workoutPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex]);

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

  const workoutProgress = useMemo((): WorkoutProgress => {
    if (!selectedDayWorkout) {
      return {
        currentExercise: 0,
        totalExercises: 0,
        currentSet: 0,
        totalSets: 0,
        progress: 0
      };
    }

    const totalExercises = selectedDayWorkout.exercises.length;
    const completedExercises = selectedDayWorkout.exercises.filter(ex => ex.completed).length;
    const progress = totalExercises > 0 ? completedExercises / totalExercises : 0;

    return {
      currentExercise: completedExercises + 1,
      totalExercises,
      currentSet: 1,
      totalSets: 1,
      progress
    };
  }, [selectedDayWorkout]);

  // Actions
  const selectWeek = useCallback((week: number) => {
    if (!workoutPlan) return;
    
    if (week >= 1 && week <= workoutPlan.totalWeeks) {
      setTrainingState(prev => ({
        ...prev,
        currentWeekSelected: week,
        selectedDayIndex: -1 // Auto-select today's workout when changing weeks
      }));
    }
  }, [workoutPlan]);

  const selectDay = useCallback((dayIndex: number) => {
    if (!workoutPlan) return;
    
    const currentWeek = workoutPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );
    
    if (currentWeek && dayIndex >= 0 && dayIndex < currentWeek.dailyWorkouts.length) {
      setTrainingState(prev => ({
        ...prev,
        selectedDayIndex: dayIndex
      }));
    }
  }, [workoutPlan, trainingState.currentWeekSelected]);

  const toggleExerciseCompletion = useCallback(async (exerciseId: string) => {
    try {
      setTrainingState(prev => ({
        ...prev,
        error: null
      }));

      // Check if the current workout is completed and locked
      const currentWeek = workoutPlan?.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      const currentDailyWorkout = currentWeek?.dailyWorkouts[trainingState.selectedDayIndex];
      
      if (currentDailyWorkout?.completed) {
        // Workout is completed and locked - don't allow changes
        console.log('🔒 Workout is completed and locked. Use reopenWorkout to make changes.');
        return;
      }

      // Update both local and auth context state immediately and also update database for homepage tracking
      const updatedPlan = {
        ...workoutPlan!,
        weeklySchedules: workoutPlan!.weeklySchedules.map(week => ({
          ...week,
          dailyWorkouts: week.dailyWorkouts.map(daily => ({
            ...daily,
            exercises: daily.exercises.map(exercise => 
              exercise.id === exerciseId 
                ? { ...exercise, completed: !exercise.completed }
                : exercise
            )
          }))
        }))
      };

      // Check workout completion status
      const updatedCurrentWeek = updatedPlan.weeklySchedules.find(
        week => week.weekNumber === trainingState.currentWeekSelected
      );
      
      if (updatedCurrentWeek) {
        // Calculate the correct day index (same logic as selectedDayWorkout)
        let dayIndex = trainingState.selectedDayIndex;
        if (dayIndex === -1) {
          const today = new Date();
          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          // Convert JavaScript Date.getDay() (0=Sunday) to our Monday-first array (0=Monday)
          const jsDayIndex = today.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
          const mondayFirstIndex = jsDayIndex === 0 ? 6 : jsDayIndex - 1; // Sunday=6, Monday=0, Tuesday=1, etc.
          const todayName = dayNames[mondayFirstIndex];
          
          dayIndex = updatedCurrentWeek.dailyWorkouts.findIndex(workout => workout.dayOfWeek === todayName);
          if (dayIndex === -1) {
            dayIndex = 0; // Fallback to first day if today not found
          }
        }
        
        const updatedCurrentDailyWorkout = updatedCurrentWeek.dailyWorkouts[dayIndex];
        if (updatedCurrentDailyWorkout) {
          const allExercisesCompleted = updatedCurrentDailyWorkout.exercises.every(exercise => exercise.completed);
          
          if (allExercisesCompleted && !updatedCurrentDailyWorkout.isRestDay) {
            // All exercises completed - mark daily workout as completed
            console.log('🎉 All exercises completed! Marking daily workout as completed...');
            
            // Update the daily workout completion status
            updatedPlan.weeklySchedules = updatedPlan.weeklySchedules.map(week => ({
              ...week,
              dailyWorkouts: week.dailyWorkouts.map(daily => 
                daily.id === updatedCurrentDailyWorkout.id 
                  ? { ...daily, completed: true }
                  : daily
              )
            }));

            // Update database: Mark all exercises as completed and complete the daily workout
            const exerciseUpdatePromises = updatedCurrentDailyWorkout.exercises.map(exercise => 
              TrainingService.updateExerciseCompletion(exercise.id, true)
            );
            
            Promise.all(exerciseUpdatePromises).then(() => {
              return TrainingService.completeDailyWorkout(updatedCurrentDailyWorkout.id);
            }).catch(error => {
              console.error('❌ Error updating exercise completion or completing daily workout:', error);
              setTrainingState(prev => ({
                ...prev,
                error: 'Failed to complete workout'
              }));
            });
          } else if (!allExercisesCompleted && updatedCurrentDailyWorkout.completed) {
            // Some exercises were unchecked - mark workout as incomplete
            
            // Update the daily workout completion status
            updatedPlan.weeklySchedules = updatedPlan.weeklySchedules.map(week => ({
              ...week,
              dailyWorkouts: week.dailyWorkouts.map(daily => 
                daily.id === updatedCurrentDailyWorkout.id 
                  ? { ...daily, completed: false }
                  : daily
              )
            }));
          }
        }
      }

      // Update both local and auth context workout plans to trigger homepage KPI recalculation
      updateWorkoutPlan(updatedPlan);
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to toggle exercise completion'
      }));
    }
  }, [workoutPlan, trainingState.currentWeekSelected, trainingState.selectedDayIndex, updateWorkoutPlan]);

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
          ...workoutPlan!,
          weeklySchedules: workoutPlan!.weeklySchedules.map(week => ({
            ...week,
            dailyWorkouts: week.dailyWorkouts.map(daily => ({
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
        
        updateWorkoutPlan(updatedPlan);
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
  }, [workoutPlan, updateWorkoutPlan]);

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

  const completeWorkout = useCallback(async () => {
    if (!selectedDayWorkout) return;

    try {
      setTrainingState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      const result = await TrainingService.completeDailyWorkout(
        selectedDayWorkout.id
      );

      if (result.success) {
        setTrainingState(prev => ({
          ...prev,
          completedWorkouts: new Set([...prev.completedWorkouts, selectedDayWorkout.id]),
          isLoading: false
        }));

        // Cancel today's workout reminder since workout is completed
        await NotificationService.cancelWorkoutReminder();
      } else {
        setTrainingState(prev => ({
          ...prev,
          error: result.error || 'Failed to complete workout',
          isLoading: false
        }));
      }
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to complete workout',
        isLoading: false
      }));
    }
  }, [selectedDayWorkout]);

  const reopenWorkout = useCallback(() => {
    if (!selectedDayWorkout) return;

    // Show confirmation dialog
    setTrainingState(prev => ({
      ...prev,
      showReopenDialog: true
    }));
  }, [selectedDayWorkout]);

  const confirmReopenWorkout = useCallback((resetExercises: boolean = false) => {
    if (!selectedDayWorkout || !workoutPlan) return;

    // Mark the workout as incomplete to unlock exercises
    const updatedPlan = {
      ...workoutPlan,
      weeklySchedules: workoutPlan.weeklySchedules.map(week => ({
        ...week,
        dailyWorkouts: week.dailyWorkouts.map(daily => 
          daily.id === selectedDayWorkout.id 
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
    
    updateWorkoutPlan(updatedPlan);

    // Update database if exercises were reset to incomplete
    if (resetExercises && selectedDayWorkout) {
      const exerciseUpdatePromises = selectedDayWorkout.exercises.map(exercise => 
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

    console.log(`🔓 Workout reopened - exercises are now unlocked for editing${resetExercises ? ' (all exercises reset)' : ' (exercise completion preserved)'}`);
  }, [selectedDayWorkout, workoutPlan, updateWorkoutPlan]);

  const cancelReopenWorkout = useCallback(() => {
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
    if (!workoutPlan) return;

    try {
      
      // Update both local and auth context state immediately
      const updatedPlan = {
        ...workoutPlan,
        weeklySchedules: workoutPlan.weeklySchedules.map(week => ({
          ...week,
          dailyWorkouts: week.dailyWorkouts.map(daily => ({
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
        .from('workout_exercises')
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

      // Update both local and auth context workout plans
      updateWorkoutPlan(updatedPlan);
      
      
      // Hide the modal
      hideExerciseSwapModal();
      
    } catch (error) {
      console.error('💥 Error swapping exercise:', error);
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to swap exercise'
      }));
    }
  }, [workoutPlan, updateWorkoutPlan, hideExerciseSwapModal]);

  const refreshWorkoutPlan = useCallback(async () => {
    if (!authState.userProfile) return;

    try {
      setTrainingState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      const result = await TrainingService.getWorkoutPlan(authState.userProfile.id!);
      
      if (result.success && result.data) {
        updateWorkoutPlan(result.data);
        setTrainingState(prev => ({
          ...prev,
          isLoading: false
        }));
      } else {
        setTrainingState(prev => ({
          ...prev,
          error: result.error || 'Failed to refresh workout plan',
          isLoading: false
        }));
      }
    } catch (error) {
      setTrainingState(prev => ({
        ...prev,
        error: 'Failed to refresh workout plan',
        isLoading: false
      }));
    }
  }, [authState.userProfile, updateWorkoutPlan]);

  // Computed properties
  const isPlanComplete = useMemo(() => {
    return workoutPlan?.completed || false;
  }, [workoutPlan]);

  const currentWeekProgress = useMemo(() => {
    if (!workoutPlan) return 0;
    
    const currentWeek = workoutPlan.weeklySchedules.find(
      week => week.weekNumber === trainingState.currentWeekSelected
    );
    
    if (!currentWeek) return 0;
    
    return TrainingService.calculateWeeklyProgress(currentWeek.dailyWorkouts);
  }, [workoutPlan, trainingState.currentWeekSelected]);

  const totalWorkoutsCompleted = useMemo(() => {
    if (!workoutPlan) return 0;
    
    return workoutPlan.weeklySchedules.reduce((total, week) => {
      return total + week.dailyWorkouts.filter(workout => workout.completed).length;
    }, 0);
  }, [workoutPlan]);

  const streak = useMemo(() => {
    // This would calculate the current workout streak
    // For now, return a placeholder
    return 0;
  }, [workoutPlan]);

  return {
    // State
    trainingState,
    workoutPlan,
    selectedDayWorkout,
    progressRing,
    weekNavigation,
    dayIndicators,
    exerciseDetailTabs,
    oneRMCalculator,
    restTimer,
    workoutProgress,
    
    // Actions
    selectWeek,
    selectDay,
    toggleExerciseCompletion,
    updateSetDetails,
    showExerciseDetail,
    hideExerciseDetail,
    switchExerciseDetailTab,
    toggleOneRMCalculator,
    calculateOneRM,
    startRestTimer,
    stopRestTimer,
    completeWorkout,
    reopenWorkout,
    confirmReopenWorkout,
    cancelReopenWorkout,
    refreshWorkoutPlan,
    showExerciseSwapModal,
    hideExerciseSwapModal,
    swapExercise,
    
    // Exercise swap state
    isExerciseSwapModalVisible: showExerciseSwapModalState,
    exerciseToSwap,
    
    // Computed
    isPlanComplete,
    currentWeekProgress,
    totalWorkoutsCompleted,
    streak
  };
};

