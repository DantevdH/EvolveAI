// Training Types - Based on Swift TrainingViewModel and TrainingModels

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
  heartRateZone?: number;
  intensity?: number;
  completed: boolean;
}

export interface TrainingExercise {
  id: string;
  exerciseId: string;
  completed: boolean;
  order: number;
  // For strength exercises
  exercise?: Exercise;
  sets?: TrainingSet[];
  weight1RM?: number[]; // Weight as percentage of 1RM for each set (e.g., [80, 75, 70])
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
  oneRMCalculator: OneRMCalculator;
  restTimer: RestTimer;
  trainingProgress: TrainingProgress;
  
  // Actions
  selectWeek: (week: number) => void;
  selectDay: (dayIndex: number) => void;
  toggleExerciseCompletion: (exerciseId: string) => void;
  updateSetDetails: (exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  updateIntensity: (exerciseId: string, intensity: number) => Promise<void>;
  showExerciseDetail: (exercise: Exercise) => void;
  hideExerciseDetail: () => void;
  switchExerciseDetailTab: (tab: keyof ExerciseDetailTabs) => void;
  toggleOneRMCalculator: () => void;
  calculateOneRM: (weight: number, reps: number) => number;
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
  
  // Exercise swap state
  isExerciseSwapModalVisible: boolean;
  exerciseToSwap: Exercise | null;
  
  // Computed
  isPlanComplete: boolean;
  currentWeekProgress: number;
  totalTrainingsCompleted: number;
  streak: number;
}

// Component Props Types
export interface TrainingHeaderProps {
  trainingPlan: TrainingPlan | null;
  progressRing: ProgressRingData;
  currentWeek: number;
  completedTrainingsThisWeek: number;
  totalTrainingsThisWeek: number;
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
  hideNavigation?: boolean;
}

export interface DailyTrainingDetailProps {
  dailyTraining: DailyTraining | null;
  isPastWeek: boolean;
  onExerciseToggle: (exerciseId: string) => void;
  onSetUpdate: (exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  onExerciseDetail: (exercise: Exercise) => void;
  onOneRMCalculator: (exerciseName: string) => void;
  onSwapExercise?: (exercise: Exercise) => void;
  onReopenTraining?: () => void;
  onIntensityUpdate?: (exerciseId: string, intensity: number) => void;
}

export interface ExerciseRowProps {
  exercise: TrainingExercise;
  onToggle: () => void;
  onSetUpdate: (setIndex: number, reps: number, weight: number) => Promise<void>;
  onShowDetail: () => void;
  onOneRMCalculator: (exerciseName: string) => void;
  onSwapExercise?: () => void;
  onIntensityUpdate?: (exerciseId: string, intensity: number) => void;
  isLocked?: boolean;
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

export interface OneRMCalculatorProps {
  calculator: OneRMCalculator;
  onToggle: () => void;
  onCalculate: (weight: number, reps: number) => void;
}
