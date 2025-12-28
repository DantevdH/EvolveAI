// Training Types - Based on Swift TrainingViewModel and TrainingModels
import React from 'react';

export interface TrainingState {
  currentWeekSelected: number;
  selectedDayIndex: number;
  completedExercises: Set<string>;
  completedTrainings: Set<string>;
  isShowingExerciseDetail: boolean;
  selectedExercise: Exercise | null;
  isLoading: boolean;
  error: string | null;
  showReopenDialog: boolean;
  showRPEModal: boolean;
  pendingCompletionDailyTrainingId: string | null;
  showReopenEnduranceDialog: boolean;
  pendingReopenEnduranceExerciseId: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  force?: string;
  instructions?: string;
  equipment?: string;
  target_area?: string;
  secondary_muscles?: string[];
  main_muscles?: string[];
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  exercise_tier?: string;
  imageUrl?: string;
  videoUrl?: string;
  preparation?: string;
  execution?: string;
  tips?: string;
}

export interface TrainingSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number; // in seconds
}

// Segment types for interval workouts
export type SegmentType = 'warmup' | 'work' | 'recovery' | 'rest' | 'cooldown';
export type TargetType = 'time' | 'distance' | 'open';

// Individual segment within a block
export interface EnduranceSegment {
  id: string;
  segmentOrder: number;           // Order within block (1, 2, 3...)
  segmentType: SegmentType;       // warmup, work, recovery, rest, cooldown
  name?: string;                  // Optional custom name, auto-generated from type if null
  description?: string;

  // Target (planned values)
  targetType: TargetType;         // 'time', 'distance', 'open'
  targetValue?: number;           // Duration in seconds OR distance in meters (null for 'open')
  targetHeartRateZone?: number;   // Target heart rate zone (1-5)
  targetPace?: number;            // Target pace in seconds per km (optional)

  // Actuals (recorded during/after tracking) - enables per-segment analysis
  actualDuration?: number;        // Actual duration in seconds
  actualDistance?: number;        // Actual distance in meters
  actualAvgPace?: number;         // Actual average pace in seconds per km
  actualAvgHeartRate?: number;    // Actual average heart rate in bpm
  actualMaxHeartRate?: number;    // Actual max heart rate in bpm
  startedAt?: Date;               // When segment tracking started
  completedAt?: Date;             // When segment tracking completed
}

// Block of segments that can be repeated together
export interface SegmentBlock {
  id: string;
  blockOrder: number;             // Order within session (1, 2, 3...)
  name?: string;                  // Optional block name (e.g., "Main Set")
  description?: string;
  repeatCount: number;            // Number of times to repeat all segments in this block (default 1)
  segments: EnduranceSegment[];   // Segments within this block
}

export interface EnduranceSession {
  id: string;
  name?: string;
  description?: string;
  sportType: string;
  executionOrder: number; // Order in which to execute this session within the day's training (1-based)
  completed: boolean;

  // Blocks - required, at least 1 block per session
  // Structure: EnduranceSession → SegmentBlock[] → EnduranceSegment[]
  blocks: SegmentBlock[];

  // Computed properties for display (calculated from blocks/segments)
  // These are helper properties, not stored in DB
  totalTargetDuration?: number;   // Sum of all segment target durations (seconds)
  totalTargetDistance?: number;   // Sum of all segment target distances (meters)

  // Session-level tracked workout data (aggregated from all segments)
  actualDuration?: number;        // Actual duration in seconds
  actualDistance?: number;        // Actual distance in meters
  averagePace?: number;           // Average pace in seconds per km
  averageSpeed?: number;          // Average speed in km/h
  averageHeartRate?: number;      // Average HR in bpm
  maxHeartRate?: number;          // Max HR in bpm
  minHeartRate?: number;          // Min HR in bpm
  elevationGain?: number;         // Elevation gain in meters
  elevationLoss?: number;         // Elevation loss in meters
  calories?: number;              // Estimated calories burned
  cadence?: number;               // Average cadence (steps/min or rpm)
  dataSource?: 'manual' | 'live_tracking' | 'healthkit' | 'google_fit';
  healthWorkoutId?: string;       // ID from HealthKit/Google Fit
  startedAt?: Date;               // When tracking started
  completedAt?: Date;             // When tracking finished
}

// Helper function to get display name for a segment
export function getSegmentDisplayName(segment: EnduranceSegment, allSegments: EnduranceSegment[]): string {
  if (segment.name) return segment.name;

  switch (segment.segmentType) {
    case 'warmup': return 'Warm Up';
    case 'cooldown': return 'Cool Down';
    case 'recovery': return 'Recovery';
    case 'rest': return 'Rest';
    case 'work':
      // Count work segments to number them
      const workIndex = allSegments
        .filter(s => s.segmentOrder <= segment.segmentOrder && s.segmentType === 'work')
        .length;
      return `Interval ${workIndex}`;
    default:
      return 'Segment';
  }
}

// Helper function to get display name for a block
export function getBlockDisplayName(block: SegmentBlock, allBlocks: SegmentBlock[]): string {
  if (block.name) return block.name;

  // Auto-generate based on content
  const segmentTypes = block.segments.map(s => s.segmentType);
  const hasWarmup = segmentTypes.includes('warmup');
  const hasCooldown = segmentTypes.includes('cooldown');
  const hasWork = segmentTypes.includes('work');

  if (hasWarmup && !hasWork && !hasCooldown) return 'Warm Up';
  if (hasCooldown && !hasWork && !hasWarmup) return 'Cool Down';
  if (block.repeatCount > 1) return `Main Set ×${block.repeatCount}`;
  if (hasWork) return 'Main Set';

  return `Block ${block.blockOrder}`;
}

// Helper function to format target value for display
export function formatSegmentTarget(segment: EnduranceSegment, useMetric: boolean = true): string {
  if (segment.targetType === 'open') {
    return 'Open';
  }

  if (segment.targetValue === undefined || segment.targetValue === null) {
    return '--';
  }

  if (segment.targetType === 'time') {
    // Convert seconds to MM:SS or HH:MM:SS
    const seconds = Math.round(segment.targetValue);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  if (segment.targetType === 'distance') {
    // Convert meters to km/mi
    if (useMetric) {
      const km = segment.targetValue / 1000;
      return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(segment.targetValue)} m`;
    } else {
      const miles = segment.targetValue / 1609.34;
      return `${miles.toFixed(2)} mi`;
    }
  }

  return '--';
}

// Helper function to calculate total target from blocks (accounting for repeat_count)
export function calculateSessionTotals(blocks: SegmentBlock[]): {
  totalDuration: number;
  totalDistance: number;
} {
  let totalDuration = 0;
  let totalDistance = 0;

  for (const block of blocks) {
    const repeatCount = block.repeatCount ?? 1;
    for (const segment of block.segments) {
      if (segment.targetType === 'time' && segment.targetValue) {
        totalDuration += segment.targetValue * repeatCount;
      } else if (segment.targetType === 'distance' && segment.targetValue) {
        totalDistance += segment.targetValue * repeatCount;
      }
    }
  }

  return { totalDuration, totalDistance };
}

/**
 * Expand blocks into individual segments for tracking.
 * This converts block-based interval definitions into a flat list of trackable segments.
 *
 * Blocks with repeat_count > 1 are expanded by repeating all segments in the block.
 *
 * Example:
 * Input blocks:
 *   Block 1 (1x): [warmup]
 *   Block 2 (4x): [work, recovery]
 *   Block 3 (1x): [cooldown]
 *
 * Output segments:
 *   [warmup, work1, recovery1, work2, recovery2, work3, recovery3, work4, recovery4, cooldown]
 *
 * This allows the AI to define intervals compactly:
 * - Block 1: warmup 5 min (repeat 1)
 * - Block 2: work 1km + recovery 90s (repeat 4)
 * - Block 3: cooldown 5 min (repeat 1)
 */
export function expandBlocksForTracking(blocks: SegmentBlock[]): EnduranceSegment[] {
  if (!blocks || blocks.length === 0) return [];

  // Sort blocks by block_order
  const sortedBlocks = [...blocks].sort((a, b) => a.blockOrder - b.blockOrder);

  const expandedSegments: EnduranceSegment[] = [];
  let newOrder = 1;
  let workIterationCounter = 0; // Track work interval numbers across all blocks

  for (const block of sortedBlocks) {
    const repeatCount = block.repeatCount ?? 1;

    // Sort segments within block
    const sortedSegments = [...block.segments].sort((a, b) => a.segmentOrder - b.segmentOrder);

    // Repeat the block's segments
    for (let iteration = 1; iteration <= repeatCount; iteration++) {
      for (const segment of sortedSegments) {
        // Increment work counter for work segments
        const isWork = segment.segmentType === 'work';
        if (isWork) {
          workIterationCounter++;
        }

        expandedSegments.push({
          ...segment,
          id: repeatCount > 1 ? `${segment.id}_${iteration}` : segment.id,
          segmentOrder: newOrder++,
          // Add iteration number to work segments for clarity
          name: isWork && repeatCount > 1
            ? `${segment.name || 'Interval'} ${workIterationCounter}`
            : segment.name,
        });
      }
    }
  }

  return expandedSegments;
}

/**
 * Get all segments from blocks as a flat array (without expansion).
 * Useful for displaying the compact block view.
 */
export function getAllSegmentsFromBlocks(blocks: SegmentBlock[]): EnduranceSegment[] {
  if (!blocks || blocks.length === 0) return [];

  const sortedBlocks = [...blocks].sort((a, b) => a.blockOrder - b.blockOrder);
  const allSegments: EnduranceSegment[] = [];

  for (const block of sortedBlocks) {
    const sortedSegments = [...block.segments].sort((a, b) => a.segmentOrder - b.segmentOrder);
    allSegments.push(...sortedSegments);
  }

  return allSegments;
}

/**
 * Calculate the total number of expanded segments (for display purposes).
 */
export function getExpandedSegmentCount(blocks: SegmentBlock[]): number {
  if (!blocks || blocks.length === 0) return 0;

  return blocks.reduce((total, block) => {
    const repeatCount = block.repeatCount ?? 1;
    return total + (block.segments.length * repeatCount);
  }, 0);
}

/**
 * Check if session has any repeating blocks.
 */
export function hasRepeatingBlocks(blocks: SegmentBlock[]): boolean {
  if (!blocks || blocks.length === 0) return false;
  return blocks.some(b => (b.repeatCount ?? 1) > 1);
}

/**
 * Get the maximum repeat count across all blocks.
 */
export function getMaxRepeatCount(blocks: SegmentBlock[]): number {
  if (!blocks || blocks.length === 0) return 1;
  return Math.max(...blocks.map(b => b.repeatCount ?? 1));
}

export interface TrainingExercise {
  id: string;
  exerciseId: string;
  completed: boolean;
  order: number; // Legacy field, kept for backward compatibility
  executionOrder: number; // Order in which to execute this exercise/session within the day's training (1-based)
  // For strength exercises
  exercise?: Exercise;
  sets?: TrainingSet[];
  weight?: number[]; // Actual weight values (in kg or lbs) for each set
  // For endurance sessions
  enduranceSession?: EnduranceSession;
}

export interface DailyTraining {
  id: string;
  dayOfWeek: string;
  isRestDay: boolean;
  exercises: TrainingExercise[];
  completed?: boolean; // Optional since it's calculated from exercises
  completedAt?: Date;
  scheduledDate?: Date; // Scheduled date for this training (from backend scheduled_date)
  isEditable?: boolean; // Whether this day can be edited (computed based on scheduledDate)
  duration?: number; // in minutes
  calories?: number;
  sessionRPE?: number; // Session Rate of Perceived Exertion (1-5 scale)
}

export interface WeeklySchedule {
  id: string;
  weekNumber: number;
  dailyTrainings: DailyTraining[];
  completed: boolean;
  completedAt?: Date;
  focusTheme?: string; // Week's focus theme (e.g., 'Hypertrophy Volume Build')
  primaryGoal?: string; // Week's primary goal
  progressionLever?: string; // Week's progression lever
}

export interface TrainingPlan {
  id: string;
  title: string;
  description: string;
  totalWeeks: number;
  currentWeek: number;
  weeklySchedules: WeeklySchedule[];
  aiMessage?: string;  // AI-generated message explaining the plan
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface ProgressRingData {
  progress: number; // 0-1
  total: number;
  completed: number;
  color: string;
}

export interface WeekNavigationData {
  currentWeek: number;
  totalWeeks: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface DayIndicator {
  dayOfWeek: string;
  isSelected: boolean;
  isCompleted?: boolean;
  isRestDay: boolean;
  isToday: boolean;
  isPastWeek: boolean;
}

export interface ExerciseDetailTabs {
  general: boolean;
  instructions: boolean;
  history: boolean;
}

export interface RestTimer {
  isActive: boolean;
  duration: number; // in seconds
  remaining: number; // in seconds
  exerciseName: string;
}

export interface TrainingProgress {
  currentExercise: number;
  totalExercises: number;
  currentSet: number;
  totalSets: number;
  progress: number; // 0-1
}

// API Response Types
export interface TrainingPlanResponse {
  success: boolean;
  data?: TrainingPlan;
  error?: string;
}

export interface ExerciseResponse {
  success: boolean;
  data?: Exercise[];
  error?: string;
}

export interface UpdateSetResponse {
  success: boolean;
  data?: TrainingSet;
  error?: string;
}

export interface CompleteTrainingResponse {
  success: boolean;
  data?: {
    trainingId: string;
    exerciseIdMap?: Map<string, string>; // Maps old exercise IDs to new IDs after saveDailyTrainingExercises
  };
  error?: string;
}

// Hook Return Types
export interface UseTrainingReturn {
  // State
  trainingState: TrainingState;
  trainingPlan: TrainingPlan | null;
  selectedDayTraining: DailyTraining | null;
  progressRing: ProgressRingData;
  weekNavigation: WeekNavigationData;
  dayIndicators: DayIndicator[];
  exerciseDetailTabs: ExerciseDetailTabs;
  restTimer: RestTimer;
  trainingProgress: TrainingProgress;
  
  // Actions
  selectWeek: (week: number) => void;
  selectDay: (dayIndex: number) => void;
  toggleExerciseCompletion: (exerciseId: string) => void;
  updateSetDetails: (exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  showExerciseDetail: (exercise: Exercise) => void;
  hideExerciseDetail: () => void;
  switchExerciseDetailTab: (tab: keyof ExerciseDetailTabs) => void;
  startRestTimer: (duration: number, exerciseName: string) => void;
  stopRestTimer: () => void;
  completeTraining: () => Promise<void>;
  reopenTraining: () => void;
  confirmReopenTraining: (resetExercises?: boolean) => void;
  cancelReopenTraining: () => void;
  refreshTrainingPlan: () => Promise<void>;
  handleRPESelection: (rpe: number) => Promise<void>;
  handleRPEModalClose: () => void;
  
  // Exercise swap actions
  showExerciseSwapModal: (exercise: Exercise) => void;
  hideExerciseSwapModal: () => void;
  swapExercise: (exerciseId: string, newExercise: Exercise) => Promise<void>;
  
  // Exercise add/remove actions
  addExercise: (exercise: Exercise, dailyTrainingId: string) => Promise<void>;
  addEnduranceSession: (sessionData: {
    sportType: string;
    trainingVolume: number;
    unit: string;
    heartRateZone: number;
    name?: string;
    description?: string;
  }, dailyTrainingId: string) => Promise<void>;
  removeExercise: (exerciseId: string, isEndurance: boolean, dailyTrainingId: string) => Promise<void>;
  reopenEnduranceSession: (exerciseId: string) => void;
  confirmReopenEnduranceSession: () => void;
  cancelReopenEnduranceSession: () => void;

  // Exercise swap state
  isExerciseSwapModalVisible: boolean;
  exerciseToSwap: Exercise | null;
  
  // Error banners
  SwapExerciseErrorBanner: React.ComponentType;
  CompleteTrainingErrorBanner: React.ComponentType;
  
  // Computed
  isPlanComplete: boolean;
  currentWeekProgress: number;
  totalTrainingsCompleted: number;
  streak: number;
}

// Component Props Types
export interface TrainingHeaderProps {
  trainingPlan?: TrainingPlan | null;
  progressRing?: ProgressRingData; // Optional - removed from weekly overview, kept in journey map
  currentWeek?: number;
  completedTrainingsThisWeek?: number;
  totalTrainingsThisWeek?: number;
  onBackToMap?: () => void;
}

export interface WeekNavigationProps {
  weekNavigation: WeekNavigationData;
  onWeekChange: (week: number) => void;
}

export interface WeeklyOverviewProps {
  dayIndicators: DayIndicator[];
  onDaySelect: (dayIndex: number) => void;
}

export interface WeekNavigationAndOverviewProps {
  dayIndicators: DayIndicator[];
  onDaySelect: (dayIndex: number) => void;
  currentWeek: number;
}

export interface DailyTrainingDetailProps {
  dailyTraining: DailyTraining | null;
  onExerciseToggle: (exerciseId: string) => void;
  onSetUpdate: (exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  onExerciseDetail: (exercise: Exercise) => void;
  onSwapExercise?: (exercise: Exercise) => void;
  onReopenTraining?: () => void;
  onAddExercise?: () => void;
  onAddEnduranceSession?: () => void;
  onRemoveExercise?: (exerciseId: string, isEndurance: boolean) => void;
  onReopenEnduranceSession?: (exerciseId: string) => void; // Reopen a completed endurance session
  onToggleChange?: (isStrength: boolean) => void;
  isStrengthMode?: boolean;
  hideDayName?: boolean;
  hideExerciseCompletionButton?: boolean; // Hide the completion star button
  hideExerciseExpandButton?: boolean; // Hide the expand/collapse button
  hideExerciseInfoButton?: boolean; // Hide the info (i) button
  exerciseCompactMode?: boolean; // Reduce exercise card height/padding
  // Live tracking props (for endurance sessions)
  onStartTracking?: (enduranceSession: EnduranceSession) => void;  // Start GPS tracking
  onImportFromHealth?: (enduranceSession: EnduranceSession) => void; // Import from Health
  useMetric?: boolean;
}

export interface ExerciseRowProps {
  exercise: TrainingExercise;
  exerciseNumber?: number; // Exercise number in the sequence (1, 2, 3, etc.)
  onToggle: () => void;
  onSetUpdate: (setIndex: number, reps: number, weight: number) => Promise<void>;
  onShowDetail: () => void;
  onSwapExercise?: () => void;
  onRemoveExercise?: () => void;
  onReopenEnduranceSession?: () => void; // Reopen a completed endurance session to re-track
  isLocked?: boolean;
  hideCompletionButton?: boolean; // Hide the completion star button
  hideExpandButton?: boolean; // Hide the expand/collapse button
  hideInfoButton?: boolean; // Hide the info (i) button
  compactMode?: boolean; // Reduce card height/padding
  // Live tracking props (for endurance sessions)
  onStartTracking?: () => void;      // Start GPS tracking for this session
  onImportFromHealth?: () => void;   // Import from HealthKit/Google Fit
  useMetric?: boolean;               // User's unit preference
}

export interface SetRowProps {
  set: TrainingSet;
  setIndex: number;
  onUpdate: (reps: number, weight: number) => Promise<void>;
}

export interface ExerciseDetailProps {
  exercise: Exercise | null;
  isVisible: boolean;
  tabs: ExerciseDetailTabs;
  onClose: () => void;
  onTabSwitch: (tab: keyof ExerciseDetailTabs) => void;
}

export interface ProgressRingProps {
  progress: number;
  total: number;
  completed: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export interface RestTimerProps {
  timer: RestTimer;
  onStart: (duration: number, exerciseName: string) => void;
  onStop: () => void;
}

