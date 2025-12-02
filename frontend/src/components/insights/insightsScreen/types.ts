/**
 * Types for Insights Screen components
 */

import { InsightsSummary, InsightsMetrics, IntensityTrend } from '@/src/types/insights';

export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface InsightsData {
  // Simplified insights structure
  insightsSummary?: {
    summary: InsightsSummary;
    metrics: InsightsMetrics;
  };
  // Recovery chart data (RPE over time)
  recoveryData?: Array<{
    week: string;
    avgRPE: number;
    trend?: IntensityTrend;
  }>;
  // Legacy data (kept for backward compatibility if needed)
  weeklyVolumeData: any[];
  performanceScoreData: any[];
  topPerformingExercises: any[];
  weakPoints: any[];
  forecastData: any[];
  milestoneData: any[];
}

export interface InsightsScreenProps {
  // Props can be added here if needed
}

