/**
 * Custom hook to manage home screen data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrainingService } from '../services/trainingService';
import { useAuth } from '../context/AuthContext';

export interface Exercise {
  id: string;
  name: string;
  completed: boolean;
}

export interface TodaysWorkout {
  id: string;
  name: string;
  isRestDay: boolean;
  exercises: Exercise[];
}

export interface RecentActivity {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  type: 'workout';
  duration: string;
  calories: number;
}

export interface HomeData {
  streak: number;
  weeklyWorkouts: number;
  goalProgress: number;
  todaysWorkout: TodaysWorkout | null;
  recentActivity: RecentActivity[];
  isLoading: boolean;
  error: string | null;
}

export const useHomeData = (): HomeData => {
  const { state: authState } = useAuth();
  const [data, setData] = useState<HomeData>({
    streak: 0,
    weeklyWorkouts: 0,
    goalProgress: 0,
    todaysWorkout: null,
    recentActivity: [],
    isLoading: true,
    error: null,
  });

  const fetchHomeData = useCallback(async () => {
    if (!authState.userProfile?.id) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all data in parallel
      const [
        streakResult,
        weeklyWorkoutsResult,
        goalProgressResult,
        todaysWorkoutResult,
        recentActivityResult,
      ] = await Promise.all([
        TrainingService.getWorkoutStreak(authState.userProfile.id),
        TrainingService.getWeeklyWorkoutCount(authState.userProfile.id),
        TrainingService.getGoalProgress(authState.userProfile.id),
        TrainingService.getTodaysWorkout(authState.userProfile.id),
        TrainingService.getRecentActivity(authState.userProfile.id),
      ]);

      const homeData = {
        streak: streakResult.success ? streakResult.data || 0 : 0,
        weeklyWorkouts: weeklyWorkoutsResult.success ? weeklyWorkoutsResult.data || 0 : 0,
        goalProgress: goalProgressResult.success ? goalProgressResult.data || 0 : 0,
        todaysWorkout: todaysWorkoutResult.success ? todaysWorkoutResult.data : null,
        recentActivity: recentActivityResult.success ? recentActivityResult.data || [] : [],
        isLoading: false,
        error: null,
      };


      setData(homeData);
    } catch (error) {
      console.error('Error fetching home data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load home data',
      }));
    }
  }, [authState.userProfile?.id]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Hybrid approach: Use local workout plan data when available for immediate updates
  const hybridData = useMemo(() => {
    if (!authState.workoutPlan || !authState.userProfile) {
      return data; // Use service data when no local data
    }

    // Validate workout plan structure before processing
    const workoutPlan = authState.workoutPlan;
    
    if (!workoutPlan || !workoutPlan.weeklySchedules || !Array.isArray(workoutPlan.weeklySchedules)) {
      console.warn('⚠️ Invalid workout plan structure, using service data');
      return data;
    }
    
    // Calculate streak from local data
    let streak = 0;
    const allDailyWorkouts: any[] = [];
    const currentDate = new Date();
    const todayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = dayOrder.indexOf(todayName);
    
    workoutPlan.weeklySchedules.forEach(week => {
      // Validate week structure
      if (!week || !week.dailyWorkouts || !Array.isArray(week.dailyWorkouts)) {
        console.warn('⚠️ Invalid week structure, skipping week');
        return;
      }
      
      week.dailyWorkouts.forEach(daily => {
        // Validate daily workout structure
        if (!daily || typeof daily.isRestDay !== 'boolean') {
          console.warn('⚠️ Invalid daily workout structure, skipping');
          return;
        }
        
        if (!daily.isRestDay) {
          const isCompleted = daily.exercises && Array.isArray(daily.exercises) && 
                             daily.exercises.length > 0 && daily.exercises.every(ex => ex.completed);
          const dayIndex = dayOrder.indexOf(daily.dayOfWeek);
          const isPastOrToday = dayIndex <= todayIndex; // Only include past and today's workouts
          

          // Only include past and today's workouts in streak calculation
          if (isPastOrToday) {
            allDailyWorkouts.push({
              ...daily,
              weekNumber: week.weekNumber,
              completed: isCompleted
            });
          }
        }
      });
    });
    
    // Sort by week number (descending) and day order (descending) - most recent first
    allDailyWorkouts.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return b.weekNumber - a.weekNumber; // Most recent week first
      }
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(b.dayOfWeek) - dayOrder.indexOf(a.dayOfWeek); // Most recent day first
    });
    
    for (const workout of allDailyWorkouts) {
      if (workout.completed) {
        streak++;
      } else {
        break;
      }
    }
    

    // Calculate goal progress from local data
    let totalCompletedWorkouts = 0;
    let totalWorkoutDays = 0;
    
    workoutPlan.weeklySchedules.forEach(week => {
      if (!week || !week.dailyWorkouts || !Array.isArray(week.dailyWorkouts)) {
        return; // Skip invalid weeks
      }
      
      week.dailyWorkouts.forEach(daily => {
        if (!daily || typeof daily.isRestDay !== 'boolean') {
          return; // Skip invalid daily workouts
        }
        
        if (!daily.isRestDay && daily.exercises && Array.isArray(daily.exercises) && daily.exercises.length > 0) {
          totalWorkoutDays++;
          if (daily.exercises.every(ex => ex && typeof ex.completed === 'boolean' && ex.completed)) {
            totalCompletedWorkouts++;
          }
        }
      });
    });

    const goalProgress = totalWorkoutDays > 0 ? Math.round((totalCompletedWorkouts / totalWorkoutDays) * 100) : 0;

    // Calculate today's workout from local data
    const currentWeek = workoutPlan.weeklySchedules.find(w => w && w.weekNumber === (workoutPlan.currentWeek || 1));
    const todaysWorkoutData = currentWeek?.dailyWorkouts?.find(daily => daily && daily.dayOfWeek === todayName);
    
    const todaysWorkout: TodaysWorkout | null = todaysWorkoutData ? {
      id: todaysWorkoutData.id || 'unknown',
      name: `${todaysWorkoutData.dayOfWeek} Workout`,
      isRestDay: todaysWorkoutData.isRestDay,
      exercises: (todaysWorkoutData.exercises && Array.isArray(todaysWorkoutData.exercises)) 
        ? todaysWorkoutData.exercises.map(ex => ({
            id: ex.id || 'unknown',
            name: ex.exercise?.name || 'Exercise',
            completed: ex.completed || false
          }))
        : []
    } : null;

    // Calculate recent activity from local data
    const recentActivity: RecentActivity[] = allDailyWorkouts
      .filter(workout => workout && workout.completed)
      .slice(0, 5)
      .map((workout, index) => ({
        id: workout.id || 'unknown',
        title: `${workout.dayOfWeek} Workout`,
        subtitle: `${workout.exercises?.length || 0} exercises • 45 minutes • 320 calories`,
        date: index === 0 ? 'Yesterday' : index === 1 ? '2 days ago' : index === 2 ? '3 days ago' : `${index + 1} days ago`,
        type: 'workout' as const,
        duration: '45 min',
        calories: 320,
      }));

    return {
      ...data,
      streak,
      goalProgress,
      todaysWorkout,
      recentActivity,
      // Keep weeklyWorkouts from service data (this is calculated from database)
    };
  }, [data, authState.workoutPlan, authState.userProfile]);

  return hybridData;
};
