/**
 * Insights Context
 *
 * Provides preloaded analytics data (performance metrics + recovery status)
 * for the insights screen. Calculates all data on app load and updates
 * when training plan changes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { logger } from '@/src/utils/logger';

// Import services
import {
  SportType,
  WeeklyMetrics,
  getPerformedSportTypes,
  getWeeklyMetrics,
  getCombinedWeeklyMetrics,
  getSportSummaryStats,
} from '@/src/services/performanceMetricsService';

import {
  MuscleRecoveryStatus,
  calculateAllMuscleRecoveryStatus,
} from '@/src/services/recoveryCalculationService';

// Types
export interface InsightsData {
  // Performance metrics
  performedSportTypes: SportType[];
  weeklyMetrics: Map<SportType | 'all', WeeklyMetrics[]>;
  combinedWeeklyMetrics: { week: string; totalVolume: number; totalTime: number; totalDistance: number; sessionCount: number }[];
  sportSummaryStats: Map<SportType, ReturnType<typeof getSportSummaryStats>>;

  // Recovery metrics
  muscleRecoveryStatus: MuscleRecoveryStatus[];

  // Meta
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

interface InsightsContextType {
  insightsData: InsightsData;
  refreshInsights: () => Promise<void>;
  isInsightsLoading: boolean;
}

const initialInsightsData: InsightsData = {
  performedSportTypes: [],
  weeklyMetrics: new Map(),
  combinedWeeklyMetrics: [],
  sportSummaryStats: new Map(),
  muscleRecoveryStatus: [],
  lastUpdated: null,
  isLoading: true,
  error: null,
};

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

interface InsightsProviderProps {
  children: ReactNode;
}

export const InsightsProvider: React.FC<InsightsProviderProps> = ({ children }) => {
  const { state } = useAuth();
  const [insightsData, setInsightsData] = useState<InsightsData>(initialInsightsData);

  /**
   * Calculate all insights from training plan
   */
  const calculateInsights = useCallback(async () => {
    const trainingPlan = state.trainingPlan;

    if (!trainingPlan) {
      setInsightsData({
        ...initialInsightsData,
        isLoading: false,
      });
      return;
    }

    try {
      setInsightsData(prev => ({ ...prev, isLoading: true, error: null }));

      logger.info('Calculating insights data...');
      const startTime = Date.now();

      // 1. Get performed sport types
      const performedSportTypes = getPerformedSportTypes(trainingPlan);

      // 2. Calculate weekly metrics for each sport type + 'all'
      const weeklyMetrics = new Map<SportType | 'all', WeeklyMetrics[]>();

      // Add 'all' filter metrics
      weeklyMetrics.set('all', getWeeklyMetrics(trainingPlan, 'all', 12));

      // Add per-sport metrics
      performedSportTypes.forEach(sportType => {
        weeklyMetrics.set(sportType, getWeeklyMetrics(trainingPlan, sportType, 12));
      });

      // 3. Get combined metrics for overview
      const combinedWeeklyMetrics = getCombinedWeeklyMetrics(trainingPlan, 12);

      // 4. Calculate summary stats for each sport
      const sportSummaryStats = new Map<SportType, ReturnType<typeof getSportSummaryStats>>();
      performedSportTypes.forEach(sportType => {
        sportSummaryStats.set(sportType, getSportSummaryStats(trainingPlan, sportType));
      });

      // 5. Calculate muscle recovery status
      const muscleRecoveryStatus = calculateAllMuscleRecoveryStatus(trainingPlan);

      const elapsed = Date.now() - startTime;
      logger.info(`Insights calculation completed in ${elapsed}ms`, {
        sportTypes: performedSportTypes.length,
        weeklyMetricsCount: weeklyMetrics.size,
        muscleGroups: muscleRecoveryStatus.length,
      });

      setInsightsData({
        performedSportTypes,
        weeklyMetrics,
        combinedWeeklyMetrics,
        sportSummaryStats,
        muscleRecoveryStatus,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      logger.error('Failed to calculate insights', error);
      setInsightsData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate insights',
      }));
    }
  }, [state.trainingPlan]);

  /**
   * Recalculate insights when training plan changes
   */
  useEffect(() => {
    if (state.trainingPlan && !state.trainingPlanLoading) {
      calculateInsights();
    }
  }, [state.trainingPlan, state.trainingPlanLoading, calculateInsights]);

  /**
   * Manual refresh function
   */
  const refreshInsights = useCallback(async () => {
    await calculateInsights();
  }, [calculateInsights]);

  const contextValue: InsightsContextType = {
    insightsData,
    refreshInsights,
    isInsightsLoading: insightsData.isLoading,
  };

  return (
    <InsightsContext.Provider value={contextValue}>
      {children}
    </InsightsContext.Provider>
  );
};

/**
 * Hook to access insights data
 */
export const useInsights = (): InsightsContextType => {
  const context = useContext(InsightsContext);
  if (context === undefined) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
};
