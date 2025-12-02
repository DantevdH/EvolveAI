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

export interface EnduranceSession {
  id: string;
  name?: string;
  description?: string;
  sportType: string;
  trainingVolume: number;
  unit: string;
  heartRateZone: number; // Target heart rate zone (1-5), required
  executionOrder: number; // Order in which to execute this session within the day's training (1-based)
  completed: boolean;
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
  onToggleChange?: (isStrength: boolean) => void;
  isStrengthMode?: boolean;
  hideDayName?: boolean;
  hideExerciseCompletionButton?: boolean; // Hide the completion star button
  hideExerciseExpandButton?: boolean; // Hide the expand/collapse button
  hideExerciseInfoButton?: boolean; // Hide the info (i) button
  exerciseCompactMode?: boolean; // Reduce exercise card height/padding
}

export interface ExerciseRowProps {
  exercise: TrainingExercise;
  exerciseNumber?: number; // Exercise number in the sequence (1, 2, 3, etc.)
  onToggle: () => void;
  onSetUpdate: (setIndex: number, reps: number, weight: number) => Promise<void>;
  onShowDetail: () => void;
  onSwapExercise?: () => void;
  onRemoveExercise?: () => void;
  isLocked?: boolean;
  hideCompletionButton?: boolean; // Hide the completion star button
  hideExpandButton?: boolean; // Hide the expand/collapse button
  hideInfoButton?: boolean; // Hide the info (i) button
  compactMode?: boolean; // Reduce card height/padding
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

