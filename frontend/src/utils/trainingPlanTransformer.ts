/**
 * Transform training plan from backend format (snake_case) to frontend format (camelCase)
 */

import { parseLocalDate } from './trainingDateUtils';

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
  focus_theme?: string;
  primary_goal?: string;
  progression_lever?: string;
  daily_trainings: BackendDailyTraining[];
}

export interface BackendDailyTraining {
  id: number;
  weekly_schedule_id: number;
  day_of_week: string;
  is_rest_day: boolean;
  training_type: string;
  justification: string;
  scheduled_date?: string; // ISO date string from backend
  strength_exercises: BackendStrengthExercise[];
  endurance_sessions: BackendEnduranceSession[];
}

export interface BackendStrengthExercise {
  id: number;
  daily_training_id: number;
  exercise_id: number | null;  // Can be null when undefined values are sent
  exercise_name: string | null;  // Can be null for defensive fallback
  sets: number;
  reps: number[];
  weight: number[];  // Actual weight values (in kg or lbs)
  execution_order: number;  // Order in which to execute this exercise (1-based)
  main_muscle?: string | null;
  equipment?: string | null;
  // Enriched fields from exercises table (populated via JOIN or enrichment)
  target_area?: string;
  main_muscles?: string[];  // List of main muscles (from exercises.primary_muscles)
  secondary_muscles?: string[];  // List of secondary muscles
  force?: string;  // Type of force (push, pull, static, etc.)
  difficulty?: string;  // Difficulty level (Beginner, Intermediate, Advanced)
  exercise_tier?: string;  // Exercise tier (foundational, standard, variety)
  preparation?: string;  // Preparation instructions
  execution?: string;  // Execution instructions
  description?: string;  // Exercise description
  video_url?: string | null;  // Video URL
  tips?: string;  // Exercise tips
  exercises?: any;  // Full exercise metadata object from exercises table (for round-trip preservation)
}

export interface BackendEnduranceSession {
  id: number;
  daily_training_id: number;
  name: string;
  description: string;
  sport_type: string;
  training_volume: number;
  unit: string;
  execution_order: number;  // Order in which to execute this session (1-based)
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

export function transformWeeklySchedule(backendWeek: BackendWeeklySchedule): any {
  if (backendWeek.id == null) console.error('[PlanTransform] Null weekly_schedule id', backendWeek);
  return {
    id: backendWeek.id.toString(),
    weekNumber: backendWeek.week_number,
    justification: backendWeek.justification,
    focusTheme: backendWeek.focus_theme || undefined,
    primaryGoal: backendWeek.primary_goal || undefined,
    progressionLever: backendWeek.progression_lever || undefined,
    dailyTrainings: backendWeek.daily_trainings?.map(transformDailyTraining) || [],
  };
}

function transformDailyTraining(backendDaily: BackendDailyTraining): any {
  if (backendDaily.id == null) console.error('[PlanTransform] Null daily_training id', backendDaily);
  // Transform strength exercises
  const strengthExercises = backendDaily.strength_exercises?.map(transformStrengthExercise) || [];
  
  // Transform endurance sessions
  const enduranceSessions = backendDaily.endurance_sessions?.map(transformEnduranceSession) || [];
  
  // Combine into a single exercises array and sort by execution_order (expected by SimplePlanPreview)
  const exercises = [...strengthExercises, ...enduranceSessions]
    .sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0));
  
  return {
    id: backendDaily.id.toString(),
    dayOfWeek: backendDaily.day_of_week,
    isRestDay: backendDaily.is_rest_day,
    trainingType: backendDaily.training_type,
    justification: backendDaily.justification,
    scheduledDate: backendDaily.scheduled_date ? parseLocalDate(backendDaily.scheduled_date) : undefined,
    completed: false,
    // Keep separate arrays for compatibility with other components (sorted by execution_order)
    strengthExercises: strengthExercises.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)),
    enduranceSessions: enduranceSessions.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)),
    // Combined array for SimplePlanPreview (sorted by execution_order)
    exercises: exercises,
  };
}

function transformStrengthExercise(backendExercise: BackendStrengthExercise): any {
  // Note: id (strength_exercise table record ID) may be null during plan generation (before saving to DB)
  // exercise_id (exercises table ID) should exist after matching, but may be null if matching failed
  if (backendExercise.id == null) {
    console.warn('[PlanTransform] Null strength_exercise id (expected during plan generation before saving)', backendExercise);
  }
  if (backendExercise.exercise_id == null) {
    console.error('[PlanTransform] Null exercise_id in strength_exercise (matching may have failed)', backendExercise);
  }
  
  // CRITICAL: Extract exercise name with multiple fallbacks to handle different data sources
  // Priority: 1) top-level exercise_name (from backend enrichment), 2) nested exercises.name (from Supabase JOIN), 3) camelCase variant, 4) fallback
  const nestedExercise = (backendExercise as any).exercises; // Nested object from Supabase JOIN
  const exerciseName = 
    backendExercise.exercise_name ||  // From backend enrichment (save_training_plan/update_training_plan)
    nestedExercise?.name ||            // From Supabase JOIN (getTrainingPlan)
    (backendExercise as any).exerciseName ||  // Fallback for camelCase
    'Unknown Exercise';                // Final fallback
  
  // Extract other metadata with same fallback strategy
  // For main_muscle: use top-level OR extract from nested exercises.main_muscles array (first item)
  const mainMuscle = backendExercise.main_muscle || 
    (nestedExercise?.main_muscles && nestedExercise.main_muscles.length > 0 ? nestedExercise.main_muscles[0] : null) ||
    nestedExercise?.main_muscle;
  const equipment = backendExercise.equipment || nestedExercise?.equipment;
  
  // Generate temporary ID if id is missing (during plan generation before saving)
  // Use exercise_id as fallback, or generate a temporary ID based on exercise name and execution order
  const exerciseRecordId = backendExercise.id 
    ? backendExercise.id.toString() 
    : `temp_${backendExercise.exercise_id || 'unknown'}_${backendExercise.execution_order || 0}`;
  
  return {
    id: exerciseRecordId,
    exerciseId: backendExercise.exercise_id?.toString(),
    exerciseName: exerciseName,
    sets: Array.from({ length: backendExercise.sets }, (_, i) => ({
      reps: backendExercise.reps?.[i] || 10,
      weight: backendExercise.weight?.[i] || 0,
      completed: false,
    })),
    executionOrder: backendExercise.execution_order || 0,
    order: backendExercise.execution_order || 0, // Legacy field for backward compatibility
    // Add nested exercise object for SimplePlanPreview compatibility (includes enriched fields)
    // Read ALL enriched fields from nested exercises object (cleaner than manual enrichment)
    // Fallback to top-level if present (for Pydantic validation fields)
    exercise: {
      id: backendExercise.exercise_id?.toString(),
      name: exerciseName,
      mainMuscle: mainMuscle,  // Keep camelCase (not in Exercise type, used by row)
      equipment: equipment,
      // Enriched fields from exercises table - use snake_case to match Exercise type and getTrainingPlan
      // Priority: top-level (from backend enrichment) > nested object (from JOIN)
      target_area: backendExercise.target_area || nestedExercise?.target_area,
      main_muscles: backendExercise.main_muscles || nestedExercise?.primary_muscles || nestedExercise?.main_muscles,
      secondary_muscles: nestedExercise?.secondary_muscles,
      force: backendExercise.force || nestedExercise?.force,
      difficulty: nestedExercise?.difficulty,
      exercise_tier: nestedExercise?.exercise_tier || nestedExercise?.tier,
      preparation: nestedExercise?.preparation,
      execution: nestedExercise?.execution,
      description: nestedExercise?.description,
      videoUrl: nestedExercise?.video_url,  // Keep camelCase (it's videoUrl in Exercise type)
      tips: nestedExercise?.tips,
    },
    mainMuscle: mainMuscle,
    equipment: equipment,
    // Enriched fields (available for round-trip) - read from nested object
    // Priority: top-level (from backend enrichment) > nested object (from JOIN)
    targetArea: backendExercise.target_area || nestedExercise?.target_area,
    mainMuscles: backendExercise.main_muscles || nestedExercise?.primary_muscles || nestedExercise?.main_muscles,
    secondaryMuscles: nestedExercise?.secondary_muscles,
    force: backendExercise.force || nestedExercise?.force,
    difficulty: nestedExercise?.difficulty,
    exerciseTier: nestedExercise?.exercise_tier || nestedExercise?.tier,
    preparation: nestedExercise?.preparation,
    execution: nestedExercise?.execution,
    description: nestedExercise?.description,
    videoUrl: nestedExercise?.video_url,
    tips: nestedExercise?.tips,
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
    executionOrder: backendSession.execution_order || 0,
    order: backendSession.execution_order || 0, // Legacy field for backward compatibility
    heartRateZone: backendSession.heart_rate_zone,
    // Add nested enduranceSession object for SimplePlanPreview compatibility
    enduranceSession: {
      name: backendSession.name,
      description: backendSession.description,
      sportType: backendSession.sport_type,
      trainingVolume: backendSession.training_volume,
      unit: backendSession.unit,
      heartRateZone: backendSession.heart_rate_zone,
      executionOrder: backendSession.execution_order || 0,
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
    focus_theme: frontendWeek.focusTheme || frontendWeek.focus_theme || null,
    primary_goal: frontendWeek.primaryGoal || frontendWeek.primary_goal || null,
    progression_lever: frontendWeek.progressionLever || frontendWeek.progression_lever || null,
  };
}

function reverseTransformDailyTraining(frontendDaily: any): BackendDailyTraining {
  // Extract strength exercises: prefer separate array, fall back to combined exercises array
  // The combined array is created during transformDailyTraining (line 98) for SimplePlanPreview compatibility
  let strengthExercises: any[] = [];
  if (frontendDaily.strengthExercises && frontendDaily.strengthExercises.length > 0) {
    // Use separate array if available (preferred)
    strengthExercises = frontendDaily.strengthExercises.map(reverseTransformStrengthExercise);
  } else if (frontendDaily.exercises && frontendDaily.exercises.length > 0) {
    // Fallback: filter from combined exercises array
    // Strength exercises have numeric exerciseId (not starting with 'endurance_') and no enduranceSession property
    strengthExercises = frontendDaily.exercises
      .filter((ex: any) => ex && !ex.enduranceSession && !ex.exerciseId?.toString().startsWith('endurance_'))
      .map(reverseTransformStrengthExercise);
  }
  
  // Extract endurance sessions: prefer separate array, fall back to combined exercises array
  let enduranceSessions: any[] = [];
  if (frontendDaily.enduranceSessions && frontendDaily.enduranceSessions.length > 0) {
    // Use separate array if available (preferred)
    enduranceSessions = frontendDaily.enduranceSessions.map(reverseTransformEnduranceSession);
  } else if (frontendDaily.exercises && frontendDaily.exercises.length > 0) {
    // Fallback: filter from combined exercises array
    // Endurance sessions have exerciseId starting with 'endurance_' or have enduranceSession property
    enduranceSessions = frontendDaily.exercises
      .filter((ex: any) => ex && (ex.enduranceSession || ex.exerciseId?.toString().startsWith('endurance_')))
      .map(reverseTransformEnduranceSession);
  }
  
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
  // Extract reps and weight from sets array
  const reps = frontendExercise.sets?.map((set: any) => set.reps) || [];
  const weight = frontendExercise.sets?.map((set: any) => set.weight ?? 0) || [];  // Use 0 for null weights
  
  // Extract enriched fields from exercise object (critical for round-trip preservation)
  // These fields come from the exercises table and must be preserved when sending back to backend
  const exercise = frontendExercise.exercise || {};
  
  // CRITICAL: Parse exercise_id properly and ensure it's never undefined (use null as fallback)
  // This prevents Pydantic from treating it as None and triggering the validate_exercise_mode validator
  let exerciseId: number | null = null;
  if (frontendExercise.exerciseId !== undefined && frontendExercise.exerciseId !== null) {
    exerciseId = typeof frontendExercise.exerciseId === 'string' 
      ? parseInt(frontendExercise.exerciseId, 10) 
      : frontendExercise.exerciseId;
  }
  
  // CRITICAL: Ensure exercise_name, main_muscle, equipment are always present (never undefined)
  // Priority: 1) top-level fields, 2) nested exercise object, 3) null as fallback
  const exerciseName = frontendExercise.exerciseName || exercise.name || null;
  const mainMuscle = frontendExercise.mainMuscle || exercise.mainMuscle || null;
  const equipmentValue = frontendExercise.equipment || exercise.equipment || null;
  
  // CRITICAL: Preserve all enriched fields for round-trip compatibility
  // These fields must be preserved so backend doesn't lose metadata for other weeks
  // Read from frontend exercise object first, then fallback to nested exercise object
  const targetArea = frontendExercise.targetArea || exercise.targetArea || null;
  const mainMuscles = frontendExercise.mainMuscles || exercise.mainMuscles || null;
  const secondaryMuscles = frontendExercise.secondaryMuscles || exercise.secondaryMuscles || null;
  const force = frontendExercise.force || exercise.force || null;
  const difficulty = frontendExercise.difficulty || exercise.difficulty || null;
  const exerciseTier = frontendExercise.exerciseTier || exercise.exerciseTier || null;
  const preparation = frontendExercise.preparation || exercise.preparation || null;
  const execution = frontendExercise.execution || exercise.execution || null;
  const description = frontendExercise.description || exercise.description || null;
  const videoUrl = frontendExercise.videoUrl || exercise.videoUrl || null;
  const tips = frontendExercise.tips || exercise.tips || null;
  
  // Preserve the full exercises metadata object if available (for complete round-trip)
  const exercisesMetadata = frontendExercise.exercises || exercise || null;
  
  return {
    id: typeof frontendExercise.id === 'string' ? parseInt(frontendExercise.id, 10) : frontendExercise.id,
    daily_training_id: frontendExercise.dailyTrainingId || frontendExercise.daily_training_id || 0,
    exercise_id: exerciseId,
    exercise_name: exerciseName,
    sets: frontendExercise.sets?.length || 0,
    reps: reps,
    weight: weight,
    execution_order: frontendExercise.executionOrder || frontendExercise.order || 0,
    main_muscle: mainMuscle,
    equipment: equipmentValue,
    // CRITICAL: Preserve all enriched fields for round-trip
    target_area: targetArea,
    main_muscles: mainMuscles,
    secondary_muscles: secondaryMuscles,
    force: force,
    difficulty: difficulty,
    exercise_tier: exerciseTier,
    preparation: preparation,
    execution: execution,
    description: description,
    video_url: videoUrl,
    tips: tips,
    // Preserve full exercises metadata object if available (for complete round-trip)
    exercises: exercisesMetadata,
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
    execution_order: session.executionOrder || frontendSession.executionOrder || frontendSession.order || 0,
    heart_rate_zone: session.heartRateZone,
  };
}

/**
 * Transform UserProfile to PersonalInfo format expected by backend
 */
export function transformUserProfileToPersonalInfo(userProfile: any): any {
  if (!userProfile) {
    return null;
  }
  
  return {
    user_id: userProfile.userId || undefined,
    username: userProfile.username || '',
    age: userProfile.age || 0,
    weight: userProfile.weight || 0,
    height: userProfile.height || 0,
    weight_unit: userProfile.weightUnit || 'kg',
    height_unit: userProfile.heightUnit || 'cm',
    measurement_system: userProfile.weightUnit === 'lbs' || userProfile.heightUnit === 'inches' ? 'imperial' : 'metric',
    gender: userProfile.gender || '',
    goal_description: userProfile.goalDescription || '',
    experience_level: userProfile.experienceLevel || 'novice',
  };
}

