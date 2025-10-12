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

export interface TodaysTraining {
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
  type: 'training';
  duration: string;
  calories: number;
}

export interface HomeData {
  streak: number;
  weeklyTrainings: number;
  goalProgress: number;
  todaysTraining: TodaysTraining | null;
  recentActivity: RecentActivity[];
  isLoading: boolean;
  error: string | null;
}

export const useHomeData = (): HomeData => {
  const { state: authState } = useAuth();
  const [data, setData] = useState<HomeData>({
    streak: 0,
    weeklyTrainings: 0,
    goalProgress: 0,
    todaysTraining: null,
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
        weeklyTrainingsResult,
        goalProgressResult,
        todaysTrainingResult,
        recentActivityResult,
      ] = await Promise.all([
        TrainingService.getTrainingStreak(authState.userProfile.id),
        TrainingService.getWeeklyTrainingCount(authState.userProfile.id),
        TrainingService.getGoalProgress(authState.userProfile.id),
        TrainingService.getTodaysTraining(authState.userProfile.id),
        TrainingService.getRecentActivity(authState.userProfile.id),
      ]);

      const homeData = {
        streak: streakResult.success ? streakResult.data || 0 : 0,
        weeklyTrainings: weeklyTrainingsResult.success ? weeklyTrainingsResult.data || 0 : 0,
        goalProgress: goalProgressResult.success ? goalProgressResult.data || 0 : 0,
        todaysTraining: todaysTrainingResult.success ? todaysTrainingResult.data : null,
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

  // Hybrid approach: Use local training plan data when available for immediate updates
  const hybridData = useMemo(() => {
    if (!authState.trainingPlan || !authState.userProfile) {
      return data; // Use service data when no local data
    }

    // Validate training plan structure before processing
    const trainingPlan = authState.trainingPlan;
    
    if (!trainingPlan || !trainingPlan.weeklySchedules || !Array.isArray(trainingPlan.weeklySchedules)) {
      console.warn('⚠️ Invalid training plan structure, using service data');
      return data;
    }
    
    // Calculate streak from local data
    let streak = 0;
    const allDailyTrainings: any[] = [];
    const currentDate = new Date();
    const todayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = dayOrder.indexOf(todayName);
    
    trainingPlan.weeklySchedules.forEach(week => {
      // Validate week structure
      if (!week || !week.dailyTrainings || !Array.isArray(week.dailyTrainings)) {
        console.warn('⚠️ Invalid week structure, skipping week');
        return;
      }
      
      week.dailyTrainings.forEach(daily => {
        // Validate daily training structure
        if (!daily || typeof daily.isRestDay !== 'boolean') {
          console.warn('⚠️ Invalid daily training structure, skipping');
          return;
        }
        
        if (!daily.isRestDay) {
          const isCompleted = daily.exercises && Array.isArray(daily.exercises) && 
                             daily.exercises.length > 0 && daily.exercises.every(ex => ex.completed);
          const dayIndex = dayOrder.indexOf(daily.dayOfWeek);
          const isPastOrToday = dayIndex <= todayIndex; // Only include past and today's trainings
          

          // Only include past and today's trainings in streak calculation
          if (isPastOrToday) {
            allDailyTrainings.push({
              ...daily,
              weekNumber: week.weekNumber,
              completed: isCompleted
            });
          }
        }
      });
    });
    
    // Sort by week number (descending) and day order (descending) - most recent first
    allDailyTrainings.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return b.weekNumber - a.weekNumber; // Most recent week first
      }
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(b.dayOfWeek) - dayOrder.indexOf(a.dayOfWeek); // Most recent day first
    });
    
    for (const training of allDailyTrainings) {
      if (training.completed) {
        streak++;
      } else {
        break;
      }
    }
    

    // Calculate goal progress from local data
    let totalCompletedTrainings = 0;
    let totalTrainingDays = 0;
    
    trainingPlan.weeklySchedules.forEach(week => {
      if (!week || !week.dailyTrainings || !Array.isArray(week.dailyTrainings)) {
        return; // Skip invalid weeks
      }
      
      week.dailyTrainings.forEach(daily => {
        if (!daily || typeof daily.isRestDay !== 'boolean') {
          return; // Skip invalid daily trainings
        }
        
        if (!daily.isRestDay && daily.exercises && Array.isArray(daily.exercises) && daily.exercises.length > 0) {
          totalTrainingDays++;
          if (daily.exercises.every(ex => ex && typeof ex.completed === 'boolean' && ex.completed)) {
            totalCompletedTrainings++;
          }
        }
      });
    });

    const goalProgress = totalTrainingDays > 0 ? Math.round((totalCompletedTrainings / totalTrainingDays) * 100) : 0;

    // Calculate today's training from local data
    const currentWeek = trainingPlan.weeklySchedules.find(w => w && w.weekNumber === (trainingPlan.currentWeek || 1));
    const todaysTrainingData = currentWeek?.dailyTrainings?.find(daily => daily && daily.dayOfWeek === todayName);
    
    const todaysTraining: TodaysTraining | null = todaysTrainingData ? {
      id: todaysTrainingData.id || 'unknown',
      name: `${todaysTrainingData.dayOfWeek} Training`,
      isRestDay: todaysTrainingData.isRestDay,
      exercises: (todaysTrainingData.exercises && Array.isArray(todaysTrainingData.exercises)) 
        ? todaysTrainingData.exercises.map(ex => ({
            id: ex.id || 'unknown',
            name: ex.exercise?.name || 'Exercise',
            completed: ex.completed || false
          }))
        : []
    } : null;

    // Calculate recent activity from local data
    const recentActivity: RecentActivity[] = allDailyTrainings
      .filter(training => training && training.completed)
      .slice(0, 5)
      .map((training, index) => ({
        id: training.id || 'unknown',
        title: `${training.dayOfWeek} Training`,
        subtitle: `${training.exercises?.length || 0} exercises • 45 minutes • 320 calories`,
        date: index === 0 ? 'Yesterday' : index === 1 ? '2 days ago' : index === 2 ? '3 days ago' : `${index + 1} days ago`,
        type: 'training' as const,
        duration: '45 min',
        calories: 320,
      }));

    return {
      ...data,
      streak,
      goalProgress,
      todaysTraining,
      recentActivity,
      // Keep weeklyTrainings from service data (this is calculated from database)
    };
  }, [data, authState.trainingPlan, authState.userProfile]);

  return hybridData;
};
