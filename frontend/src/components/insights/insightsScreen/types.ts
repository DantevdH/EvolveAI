/**
 * Types for Insights Screen components
 */

export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface InsightsData {
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

