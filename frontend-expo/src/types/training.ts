// Training Types - Based on Swift TrainingViewModel and WorkoutModels

export interface TrainingState {
  currentWeekSelected: number;
  selectedDayIndex: number;
  completedExercises: Set<string>;
  completedWorkouts: Set<string>;
  isShowingExerciseDetail: boolean;
  selectedExercise: Exercise | null;
  isLoading: boolean;
  error: string | null;
  showReopenDialog: boolean;
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
  imageUrl?: string;
  videoUrl?: string;
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  restTime?: number; // in seconds
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  completed: boolean;
  order: number;
  weight1RM?: number[]; // Weight as percentage of 1RM for each set (e.g., [80, 75, 70])
}

export interface DailyWorkout {
  id: string;
  dayOfWeek: string;
  isRestDay: boolean;
  exercises: WorkoutExercise[];
  completed?: boolean; // Optional since it's calculated from exercises
  completedAt?: Date;
  duration?: number; // in minutes
  calories?: number;
}

export interface WeeklySchedule {
  id: string;
  weekNumber: number;
  dailyWorkouts: DailyWorkout[];
  completed: boolean;
  completedAt?: Date;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  totalWeeks: number;
  currentWeek: number;
  weeklySchedules: WeeklySchedule[];
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

export interface OneRMCalculator {
  weight: number;
  reps: number;
  oneRM: number;
  isVisible: boolean;
}

export interface RestTimer {
  isActive: boolean;
  duration: number; // in seconds
  remaining: number; // in seconds
  exerciseName: string;
}

export interface WorkoutProgress {
  currentExercise: number;
  totalExercises: number;
  currentSet: number;
  totalSets: number;
  progress: number; // 0-1
}

// API Response Types
export interface WorkoutPlanResponse {
  success: boolean;
  data?: WorkoutPlan;
  error?: string;
}

export interface ExerciseResponse {
  success: boolean;
  data?: Exercise[];
  error?: string;
}

export interface UpdateSetResponse {
  success: boolean;
  data?: WorkoutSet;
  error?: string;
}

export interface CompleteWorkoutResponse {
  success: boolean;
  data?: {
    workoutId: string;
  };
  error?: string;
}

// Hook Return Types
export interface UseTrainingReturn {
  // State
  trainingState: TrainingState;
  workoutPlan: WorkoutPlan | null;
  selectedDayWorkout: DailyWorkout | null;
  progressRing: ProgressRingData;
  weekNavigation: WeekNavigationData;
  dayIndicators: DayIndicator[];
  exerciseDetailTabs: ExerciseDetailTabs;
  oneRMCalculator: OneRMCalculator;
  restTimer: RestTimer;
  workoutProgress: WorkoutProgress;
  
  // Actions
  selectWeek: (week: number) => void;
  selectDay: (dayIndex: number) => void;
  toggleExerciseCompletion: (exerciseId: string) => void;
  updateSetDetails: (exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  showExerciseDetail: (exercise: Exercise) => void;
  hideExerciseDetail: () => void;
  switchExerciseDetailTab: (tab: keyof ExerciseDetailTabs) => void;
  toggleOneRMCalculator: () => void;
  calculateOneRM: (weight: number, reps: number) => number;
  startRestTimer: (duration: number, exerciseName: string) => void;
  stopRestTimer: () => void;
  completeWorkout: () => Promise<void>;
  reopenWorkout: () => void;
  confirmReopenWorkout: (resetExercises?: boolean) => void;
  cancelReopenWorkout: () => void;
  refreshWorkoutPlan: () => Promise<void>;
  
  // Computed
  isPlanComplete: boolean;
  currentWeekProgress: number;
  totalWorkoutsCompleted: number;
  streak: number;
}

// Component Props Types
export interface TrainingHeaderProps {
  workoutPlan: WorkoutPlan | null;
  progressRing: ProgressRingData;
  currentWeek: number;
  completedWorkoutsThisWeek: number;
  totalWorkoutsThisWeek: number;
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
  weekNavigation: WeekNavigationData;
  dayIndicators: DayIndicator[];
  onWeekChange: (week: number) => void;
  onDaySelect: (dayIndex: number) => void;
}

export interface DailyWorkoutDetailProps {
  dailyWorkout: DailyWorkout | null;
  isPastWeek: boolean;
  onExerciseToggle: (exerciseId: string) => void;
  onSetUpdate: (exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  onExerciseDetail: (exercise: Exercise) => void;
  onOneRMCalculator: (exerciseName: string) => void;
  onReopenWorkout?: () => void;
}

export interface ExerciseRowProps {
  exercise: WorkoutExercise;
  onToggle: () => void;
  onSetUpdate: (setIndex: number, reps: number, weight: number) => Promise<void>;
  onShowDetail: () => void;
  onOneRMCalculator: (exerciseName: string) => void;
  isLocked?: boolean;
}

export interface SetRowProps {
  set: WorkoutSet;
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

export interface OneRMCalculatorProps {
  calculator: OneRMCalculator;
  onToggle: () => void;
  onCalculate: (weight: number, reps: number) => void;
}
