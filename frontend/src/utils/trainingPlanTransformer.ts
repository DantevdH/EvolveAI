/**
 * Transform training plan from backend format (snake_case) to frontend format (camelCase)
 */

export interface BackendTrainingPlan {
  id: number;
  user_profile_id: number;
  title: string;
  summary: string;
  justification: string;
  ai_message?: string;
  weekly_schedules: BackendWeeklySchedule[];
}

export interface BackendWeeklySchedule {
  id: number;
  training_plan_id: number;
  week_number: number;
  justification: string;
  daily_trainings: BackendDailyTraining[];
}

export interface BackendDailyTraining {
  id: number;
  weekly_schedule_id: number;
  day_of_week: string;
  is_rest_day: boolean;
  training_type: string;
  justification: string;
  strength_exercises: BackendStrengthExercise[];
  endurance_sessions: BackendEnduranceSession[];
}

export interface BackendStrengthExercise {
  id: number;
  daily_training_id: number;
  exercise_id: number;
  exercise_name: string;
  sets: number;
  reps: number[];
  weight: number[];  // Actual weight used (may be null during planning)
  weight_1rm: number[];
  main_muscle?: string;
  equipment?: string;
}

export interface BackendEnduranceSession {
  id: number;
  daily_training_id: number;
  name: string;
  description: string;
  sport_type: string;
  training_volume: number;
  unit: string;
  heart_rate_zone?: number;
}

/**
 * Transform a training plan from backend format to frontend format
 */
export function transformTrainingPlan(backendPlan: BackendTrainingPlan): any {
  // Debug logging to trace null IDs before toString conversions
  if (backendPlan.id == null) console.error('[PlanTransform] Null plan id detected');
  if (!backendPlan.weekly_schedules) console.warn('[PlanTransform] weekly_schedules missing');
  return {
    id: backendPlan.id.toString(),
    title: backendPlan.title,
    description: backendPlan.summary,
    totalWeeks: backendPlan.weekly_schedules?.length || 0,
    currentWeek: 1,
    aiMessage: backendPlan.ai_message,
    createdAt: new Date(),
    updatedAt: new Date(),
    completed: false,
    weeklySchedules: backendPlan.weekly_schedules?.map(transformWeeklySchedule) || [],
  };
}

function transformWeeklySchedule(backendWeek: BackendWeeklySchedule): any {
  if (backendWeek.id == null) console.error('[PlanTransform] Null weekly_schedule id', backendWeek);
  return {
    id: backendWeek.id.toString(),
    weekNumber: backendWeek.week_number,
    justification: backendWeek.justification,
    dailyTrainings: backendWeek.daily_trainings?.map(transformDailyTraining) || [],
  };
}

function transformDailyTraining(backendDaily: BackendDailyTraining): any {
  if (backendDaily.id == null) console.error('[PlanTransform] Null daily_training id', backendDaily);
  // Transform strength exercises
  const strengthExercises = backendDaily.strength_exercises?.map(transformStrengthExercise) || [];
  
  // Transform endurance sessions
  const enduranceSessions = backendDaily.endurance_sessions?.map(transformEnduranceSession) || [];
  
  // Combine into a single exercises array (expected by SimplePlanPreview)
  const exercises = [...strengthExercises, ...enduranceSessions];
  
  return {
    id: backendDaily.id.toString(),
    dayOfWeek: backendDaily.day_of_week,
    isRestDay: backendDaily.is_rest_day,
    trainingType: backendDaily.training_type,
    justification: backendDaily.justification,
    completed: false,
    // Keep separate arrays for compatibility with other components
    strengthExercises: strengthExercises,
    enduranceSessions: enduranceSessions,
    // Combined array for SimplePlanPreview
    exercises: exercises,
  };
}

function transformStrengthExercise(backendExercise: BackendStrengthExercise): any {
  if (backendExercise.id == null) console.error('[PlanTransform] Null strength_exercise id', backendExercise);
  if (backendExercise.exercise_id == null) console.error('[PlanTransform] Null exercise_id in strength_exercise', backendExercise);
  // Extract exercise name - handle both snake_case and potential camelCase
  const exerciseName = backendExercise.exercise_name || (backendExercise as any).exerciseName || 'Unknown Exercise';
  
  return {
    id: backendExercise.id.toString(),
    exerciseId: backendExercise.exercise_id?.toString(),
    exerciseName: exerciseName,
    sets: Array.from({ length: backendExercise.sets }, (_, i) => ({
      reps: backendExercise.reps?.[i] || 10,
      weight: null,
      weight1rm: backendExercise.weight_1rm?.[i] || 70,
      completed: false,
    })),
    // Add nested exercise object for SimplePlanPreview compatibility
    exercise: {
      id: backendExercise.exercise_id?.toString(),
      name: exerciseName,
      mainMuscle: backendExercise.main_muscle,
      equipment: backendExercise.equipment,
    },
    mainMuscle: backendExercise.main_muscle,
    equipment: backendExercise.equipment,
    completed: false,
  };
}

function transformEnduranceSession(backendSession: BackendEnduranceSession): any {
  if (backendSession.id == null) console.error('[PlanTransform] Null endurance_session id', backendSession);
  return {
    id: backendSession.id.toString(),
    // Use special exerciseId format for endurance (component checks for this)
    exerciseId: `endurance_${backendSession.id}`,
    name: backendSession.name,
    description: backendSession.description,
    sportType: backendSession.sport_type,
    trainingVolume: backendSession.training_volume,
    unit: backendSession.unit,
    heartRateZone: backendSession.heart_rate_zone,
    // Add nested enduranceSession object for SimplePlanPreview compatibility
    enduranceSession: {
      name: backendSession.name,
      description: backendSession.description,
      sportType: backendSession.sport_type,
      trainingVolume: backendSession.training_volume,
      unit: backendSession.unit,
      heartRateZone: backendSession.heart_rate_zone,
    },
    completed: false,
  };
}

/**
 * ===========================================================================================
 * REVERSE TRANSFORMATION: Frontend (camelCase) → Backend (snake_case)
 * ===========================================================================================
 * These functions convert the frontend plan format back to backend format for API requests
 */

/**
 * Transform a training plan from frontend format back to backend format
 */
export function reverseTransformTrainingPlan(frontendPlan: any): BackendTrainingPlan {
  return {
    id: typeof frontendPlan.id === 'string' ? parseInt(frontendPlan.id, 10) : frontendPlan.id,
    user_profile_id: frontendPlan.userProfileId || frontendPlan.user_profile_id || 0,
    title: frontendPlan.title,
    summary: frontendPlan.description || frontendPlan.summary,
    justification: frontendPlan.justification || '',
    ai_message: frontendPlan.aiMessage,
    weekly_schedules: frontendPlan.weeklySchedules?.map(reverseTransformWeeklySchedule) || [],
  };
}

function reverseTransformWeeklySchedule(frontendWeek: any): BackendWeeklySchedule {
  return {
    id: typeof frontendWeek.id === 'string' ? parseInt(frontendWeek.id, 10) : frontendWeek.id,
    training_plan_id: frontendWeek.trainingPlanId || frontendWeek.training_plan_id || 0,
    week_number: frontendWeek.weekNumber,
    justification: frontendWeek.justification,
    daily_trainings: frontendWeek.dailyTrainings?.map(reverseTransformDailyTraining) || [],
  };
}

function reverseTransformDailyTraining(frontendDaily: any): BackendDailyTraining {
  // Extract strength exercises from either the separate array or combined exercises array
  const strengthExercises = (frontendDaily.strengthExercises || [])
    .map(reverseTransformStrengthExercise);
  
  // Extract endurance sessions from either the separate array or combined exercises array
  const enduranceSessions = (frontendDaily.enduranceSessions || [])
    .map(reverseTransformEnduranceSession);
  
  return {
    id: typeof frontendDaily.id === 'string' ? parseInt(frontendDaily.id, 10) : frontendDaily.id,
    weekly_schedule_id: frontendDaily.weeklyScheduleId || frontendDaily.weekly_schedule_id || 0,
    day_of_week: frontendDaily.dayOfWeek,
    is_rest_day: frontendDaily.isRestDay,
    training_type: frontendDaily.trainingType,
    justification: frontendDaily.justification,
    strength_exercises: strengthExercises,
    endurance_sessions: enduranceSessions,
  };
}

function reverseTransformStrengthExercise(frontendExercise: any): BackendStrengthExercise {
  // Extract reps, weight, and weight_1rm from sets array
  const reps = frontendExercise.sets?.map((set: any) => set.reps) || [];
  const weight = frontendExercise.sets?.map((set: any) => set.weight ?? 0) || [];  // Use 0 for null weights
  const weight_1rm = frontendExercise.sets?.map((set: any) => set.weight1rm) || [];
  
  return {
    id: typeof frontendExercise.id === 'string' ? parseInt(frontendExercise.id, 10) : frontendExercise.id,
    daily_training_id: frontendExercise.dailyTrainingId || frontendExercise.daily_training_id || 0,
    exercise_id: typeof frontendExercise.exerciseId === 'string' 
      ? parseInt(frontendExercise.exerciseId, 10) 
      : frontendExercise.exerciseId,
    exercise_name: frontendExercise.exerciseName || frontendExercise.exercise?.name,
    sets: frontendExercise.sets?.length || 0,
    reps: reps,
    weight: weight,
    weight_1rm: weight_1rm,
    main_muscle: frontendExercise.mainMuscle || frontendExercise.exercise?.mainMuscle,
    equipment: frontendExercise.equipment || frontendExercise.exercise?.equipment,
  };
}

function reverseTransformEnduranceSession(frontendSession: any): BackendEnduranceSession {
  // Handle both direct properties and nested enduranceSession object
  const session = frontendSession.enduranceSession || frontendSession;
  
  return {
    id: typeof frontendSession.id === 'string' ? parseInt(frontendSession.id, 10) : frontendSession.id,
    daily_training_id: frontendSession.dailyTrainingId || frontendSession.daily_training_id || 0,
    name: session.name,
    description: session.description,
    sport_type: session.sportType,
    training_volume: session.trainingVolume,
    unit: session.unit,
    heart_rate_zone: session.heartRateZone,
  };
}

