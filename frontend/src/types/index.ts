import { AIQuestion } from './onboarding';

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Onboarding: undefined;
  TrainingPlan: {trainingId: string};
  Profile: undefined;
  MainTabs: undefined;
  GeneratePlan: undefined;
  OnboardingFlow: undefined;
};

// Enums matching Swift app
export enum ExperienceLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export interface ExperienceLevelInfo {
  title: string;
  description: string;
  infoText: string;
}

// User types matching Swift UserProfile model
export interface PlanOutline {
  weekly_schedule?: any[];
  focus_areas?: string[];
  progression?: any;
  user_feedback?: string;
  [key: string]: any; // Allow additional properties
}

export interface UserProfile {
  // User input fields (mutable for onboarding)
  username: string;
  primaryGoal: string;
  primaryGoalDescription: string;
  experienceLevel: string;
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: string;
  age: number;
  weight: number;
  weightUnit: string;
  height: number;
  heightUnit: string;
  gender: string;
  hasLimitations: boolean;
  limitationsDescription: string;
  finalChatNotes: string;
  
  // Raw questions and responses (for consistency)
  initial_questions?: AIQuestion[] | null;
  follow_up_questions?: AIQuestion[] | null;
  initial_responses?: Record<string, any> | null;
  follow_up_responses?: Record<string, any> | null;
  
  // Plan outline and feedback (separated)
  plan_outline?: PlanOutline | null;
  plan_outline_feedback?: string | null;
  
  // Database fields (read-only)
  id?: number;
  userId?: string;
  coachId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Legacy preferences interface for compatibility
export interface UserPreferences {
  trainingLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  availableTime: number; // minutes
  equipmentAccess: string[];
}

// MARK: - Core Exercise Model (matching Swift)
export interface Exercise {
  id: number;
  name: string;
  description?: string;
  video_url?: string;
  target_area?: string;        // Primary muscle group targeted
  main_muscles?: string[];     // Array of main muscles worked
  secondary_muscles?: string[]; // Array of secondary muscles worked
  equipment?: string;          // Required equipment
  difficulty?: string;         // Difficulty level (Beginner, Intermediate, Advanced)
  exercise_tier?: string;      // Exercise tier (foundational, standard, variety)
  popularity_score?: number;   // Popularity score (0.0 to 1.0)
}

// MARK: - Database Structure Models (Core Entities)
export interface TrainingPlan {
  id: number;
  userProfileId: number;
  title: string;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  planData?: any; // Full plan data from backend
}

export interface WeeklySchedule {
  id: number;
  trainingPlanId: number;
  weekNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyTraining {
  id: number;
  weeklyScheduleId: number;
  dayOfWeek: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingExercise {
  id: number;
  dailyTrainingId: number;
  exerciseId: number;
  sets: number;
  reps: number[];
  weight: (number | null)[];  // Array of optional numbers (each weight can be null)
  weight1rm: number[];        // Weight as percentage of 1RM (e.g., [80, 75, 70])
  createdAt: Date;
  updatedAt: Date;
}

// MARK: - Complete Training Structure (for API responses)
export interface CompleteTrainingPlan {
  trainingPlan: TrainingPlan;
  weeklySchedules: WeeklySchedule[];
  dailyTrainings: DailyTraining[];
  trainingExercises: TrainingExercise[];
  exercises: Exercise[];
}

// MARK: - AI-Generated Training Models (for API responses from backend)
export interface GeneratedTrainingPlan {
  title: string;
  summary: string;
  weeklySchedules: GeneratedWeeklySchedule[];
}

export interface GeneratedWeeklySchedule {
  weekNumber: number;
  dailyTrainings: GeneratedDailyTraining[];
}

export interface GeneratedDailyTraining {
  dayOfWeek: string;
  isRestDay: boolean;
  exercises: GeneratedTrainingExercise[];
}

export interface GeneratedTrainingExercise {
  name: string;
  sets: number;
  reps: number[];
  weight1rm: number[];  // Weight as percentage of 1RM for each set (e.g., [80, 75, 70])
}

// MARK: - Progress Tracking Models
export interface ExerciseProgressUpdate {
  exerciseId: number;
  isCompleted: boolean;
  weekNumber: number;
}

export interface ProgressUpdateRequest {
  updates: ExerciseProgressUpdate[];
}

// MARK: - Database Insert Models (for creating new records)
export interface TrainingPlanInsert {
  user_profile_id: number;
  title: string;
  summary: string;
}

export interface WeeklyScheduleInsert {
  training_plan_id: number;
  week_number: number;
}

export interface DailyTrainingInsert {
  weekly_schedule_id: number;
  day_of_week: string;
}

export interface ExerciseInsert {
  name: string;
  description: string;
  video_url?: string;
}

export interface TrainingExerciseInsert {
  daily_training_id: number;
  exercise_id: number;
  sets: number;
  reps: number[];
  weight: (number | null)[];  // Array of optional numbers (each weight can be null)
  weight_1rm: number[];       // Weight as percentage of 1RM for each set (e.g., [80, 75, 70])
}

// MARK: - API Response Models
export interface TrainingPlanResponse {
  training_plan: TrainingPlan;
}

// MARK: - Legacy Training Model (for backward compatibility)
export interface Training {
  id: number;
  name: string;
  exercises: Exercise[];
  sets: number;
  reps: string;
  weight?: number;
}

// Coach types matching Swift Coach model
export interface Coach {
  id: number;
  name: string;
  goal: string;
  iconName: string;
  tagline: string;
  primaryColorHex: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// App State types matching Swift AppViewModel
export enum AppState {
  LOADING = 'loading',
  LOGGED_OUT = 'loggedOut',
  NEEDS_ONBOARDING = 'needsOnboarding',
  LOADED = 'loaded',
  NEEDS_PLAN = 'needsPlan',
  ERROR = 'error',
}

export interface AppStateError {
  message: string;
  canRetry: boolean;
  retryCount: number;
}

// API types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// Component types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
}

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  multiline?: boolean;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontSizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    fontWeights: {
      regular: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}
