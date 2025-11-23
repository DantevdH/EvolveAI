/**
 * Shared types for Insights functionality
 * Used across insights services, components, and API responses
 */

export type IntensityTrend = 'improving' | 'stable' | 'declining';

export interface WeakPoint {
  muscle_group: string;
  issue: string;
  severity: string;
}

export interface TopExercise {
  name: string;
  trend: string;
  change?: string;
}

export interface InsightsMetrics {
  volume_progress: string;
  training_frequency: string;
  training_intensity: string;
  intensity_trend: IntensityTrend;
  weak_points: WeakPoint[];
  top_exercises: TopExercise[];
}

export interface InsightsSummary {
  summary: string;
  top_priority: string;
  recommendations: string[];
}

export interface InsightsSummaryResponse {
  success: boolean;
  summary?: InsightsSummary;
  metrics?: InsightsMetrics;
  error?: string;
}

export interface InsightsSummaryData {
  summary: InsightsSummary;
  metrics: InsightsMetrics;
}

