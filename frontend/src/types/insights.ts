/**
 * Shared types for Insights functionality
 *
 * Note: AI-generated insights (InsightsSummary, InsightsMetrics) have been removed.
 * Insights are now calculated client-side via InsightsContext using:
 * - recoveryCalculationService.ts (ACWR-based recovery status)
 * - performanceMetricsService.ts (sport-specific metrics aggregation)
 */

// Legacy exports preserved for potential backward compatibility
// These can be removed in a future cleanup if no external dependencies exist

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
