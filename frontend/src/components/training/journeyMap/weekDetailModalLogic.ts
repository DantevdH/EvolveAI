/**
 * Business logic for WeekDetailModal
 * Extracted for better testability
 */

import { WeekModalData } from './types';
import { PROGRESS_CONFIG } from '../../../constants/progressConfig';

export interface WeekDetailModalState {
  isGenerating: boolean;
  progress: number;
  backendResponded: boolean;
}

export interface ProgressCalculationResult {
  progress: number;
  shouldContinue: boolean;
}

/**
 * Calculate progress during week generation
 * @param startTime - When generation started (timestamp)
 * @param totalDuration - Total expected duration in ms
 * @param backendResponded - Whether backend has responded
 * @returns Progress percentage (0-99)
 */
export function calculateGenerationProgress(
  startTime: number,
  totalDuration: number,
  backendResponded: boolean
): number {
  if (backendResponded) {
    return 99; // Cap at 99% until backend responds
  }

  const elapsed = Date.now() - startTime;
  const progress = totalDuration > 0 
    ? Math.min(99, Math.max(0, Math.floor((elapsed / totalDuration) * 99)))
    : 0;
  
  // Safety check for invalid values
  if (!isNaN(progress) && isFinite(progress)) {
    return progress;
  }
  
  return 0;
}

/**
 * Get the total duration for progress bar
 * @returns Duration in milliseconds
 */
export function getProgressBarDuration(): number {
  const config = PROGRESS_CONFIG.plan;
  return config?.durationMs || 20000; // Fallback to 20 seconds
}

/**
 * Validate progress bar duration
 * @param duration - Duration to validate
 * @returns True if duration is valid
 */
export function isValidProgressDuration(duration: number): boolean {
  return duration > 0 && isFinite(duration);
}

/**
 * Determine if week can be navigated to
 * @param data - Week modal data
 * @returns True if week can be navigated to
 */
export function canNavigateToWeek(data: WeekModalData): boolean {
  const isGenerated = data.isGenerated ?? 
    (data.status !== 'unlocked-not-generated' && 
     data.status !== 'past-not-generated' && 
     data.status !== 'future-locked');
  const isPastNotGenerated = data.status === 'past-not-generated';
  return isGenerated && !isPastNotGenerated;
}

/**
 * Determine if week can be generated
 * @param data - Week modal data
 * @param hasGenerateHandler - Whether generate handler exists
 * @param isGenerating - Whether currently generating
 * @returns True if week can be generated
 */
export function canGenerateWeek(
  data: WeekModalData,
  hasGenerateHandler: boolean,
  isGenerating: boolean
): boolean {
  const isUnlockedNotGenerated = data.status === 'unlocked-not-generated';
  return isUnlockedNotGenerated && hasGenerateHandler && !isGenerating;
}

/**
 * Get initial modal state
 * @returns Initial state
 */
export function getInitialModalState(): WeekDetailModalState {
  return {
    isGenerating: false,
    progress: 0,
    backendResponded: false,
  };
}

/**
 * Reset modal state
 * @returns Reset state
 */
export function getResetModalState(): WeekDetailModalState {
  return getInitialModalState();
}

/**
 * Start generation state
 * @returns State for starting generation
 */
export function getStartGenerationState(): WeekDetailModalState {
  return {
    isGenerating: true,
    progress: 0,
    backendResponded: false,
  };
}

/**
 * Complete generation state
 * @returns State for completed generation
 */
export function getCompleteGenerationState(): WeekDetailModalState {
  return {
    isGenerating: false,
    progress: 100,
    backendResponded: true,
  };
}

/**
 * Error generation state
 * @returns State for generation error
 */
export function getErrorGenerationState(): WeekDetailModalState {
  return {
    isGenerating: false,
    progress: 0,
    backendResponded: true,
  };
}

/**
 * Update progress state
 * @param currentState - Current state
 * @param newProgress - New progress value
 * @returns Updated state
 */
export function updateProgressState(
  currentState: WeekDetailModalState,
  newProgress: number
): WeekDetailModalState {
  return {
    ...currentState,
    progress: Math.max(0, Math.min(100, newProgress)),
  };
}

/**
 * Mark backend as responded
 * @param currentState - Current state
 * @returns Updated state
 */
export function markBackendResponded(
  currentState: WeekDetailModalState
): WeekDetailModalState {
  return {
    ...currentState,
    backendResponded: true,
  };
}

