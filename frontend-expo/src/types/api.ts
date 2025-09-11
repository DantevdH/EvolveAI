/**
 * API-related TypeScript types and interfaces
 */

// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Workout plan generation request
export interface GenerateWorkoutPlanRequest {
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
  user_id: string;
  user_profile_id: number;
}

// Workout plan generation response
export interface GenerateWorkoutPlanResponse {
  status: 'success' | 'error';
  message: string;
  workout_plan?: WorkoutPlanData;
  error?: string;
}

// Workout plan data structure
export interface WorkoutPlanData {
  title: string;
  summary: string;
  weekly_schedules: WeeklyScheduleData[];
  daily_workouts: DailyWorkoutData[];
  workout_exercises: WorkoutExerciseData[];
}

// Weekly schedule data
export interface WeeklyScheduleData {
  week_number: number;
  daily_workouts: DailyWorkoutData[];
}

// Daily workout data
export interface DailyWorkoutData {
  day_of_week: string;
  is_rest_day: boolean;
  workout_exercises: WorkoutExerciseData[];
}

// Workout exercise data
export interface WorkoutExerciseData {
  exercise_id: number;
  exercise_name: string;
  sets: number;
  reps: number[];
  weight: number[];
  weight_1rm: number[];
  completed: boolean;
}

// Coach data
export interface CoachData {
  id: number;
  name: string;
  specialization: string;
  bio: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// User profile data (database format)
export interface UserProfileData {
  id: number;
  user_id: string;
  username: string;
  primary_goal: string;
  primary_goal_description: string;
  coach_id?: number;
  experience_level: string;
  days_per_week: number;
  minutes_per_session: number;
  equipment: string;
  age: number;
  weight: number;
  weight_unit: string;
  height: number;
  height_unit: string;
  gender: string;
  has_limitations: boolean;
  limitations_description?: string;
  final_chat_notes?: string;
  created_at: string;
  updated_at: string;
}

// Exercise data
export interface ExerciseData {
  id: number;
  name: string;
  description: string;
  category: string;
  muscle_groups: string[];
  equipment_needed: string[];
  difficulty_level: string;
  instructions: string[];
  tips: string[];
  image_url?: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
}

// Error response
export interface ErrorResponse {
  status: 'error';
  message: string;
  error: string;
  details?: any;
}

// Success response
export interface SuccessResponse<T = any> {
  status: 'success';
  message: string;
  data?: T;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Filter parameters
export interface FilterParams {
  search?: string;
  category?: string;
  difficulty?: string;
  equipment?: string;
  muscle_group?: string;
}

// Sort parameters
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}
