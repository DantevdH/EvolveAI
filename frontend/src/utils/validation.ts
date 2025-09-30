/**
 * Validation utilities for onboarding data
 */

/**
 * Validates if a value is a properly formatted response string
 */
export const isValidFormattedResponse = (response: any): response is string => {
  return typeof response === 'string' && 
         response.length > 0 && 
         response.includes('Q:') && 
         response.includes('A:');
};

/**
 * Validates if a value is a valid plan outline object
 */
export const isValidPlanOutline = (outline: any): outline is object => {
  return typeof outline === 'object' && 
         outline !== null && 
         !Array.isArray(outline) &&
         (outline.weekly_schedule || outline.focus_areas || outline.progression);
};

/**
 * Validates if a value is a valid user profile for onboarding
 */
export const isValidUserProfile = (profile: any): boolean => {
  return profile && 
         typeof profile === 'object' &&
         typeof profile.username === 'string' &&
         typeof profile.age === 'number' &&
         typeof profile.weight === 'number' &&
         typeof profile.height === 'number';
};

/**
 * Validates if a value is a valid workout plan
 */
export const isValidWorkoutPlan = (plan: any): boolean => {
  return plan && 
         typeof plan === 'object' &&
         (plan.weekly_schedules || plan.workout_plan_id);
};

/**
 * Cleans and validates user profile data for resume flow
 */
export const cleanUserProfileForResume = (profile: any) => {
  if (!isValidUserProfile(profile)) {
    console.warn('Invalid user profile detected, using defaults');
    return null;
  }

  return {
    username: profile.username || '',
    age: profile.age || 25,
    weight: profile.weight || 70,
    height: profile.height || 175,
    weight_unit: profile.weight_unit || 'kg',
    height_unit: profile.height_unit || 'cm',
    measurement_system: profile.weight_unit === 'lbs' ? 'imperial' : 'metric',
    gender: profile.gender || 'male',
    goal_description: profile.goal_description || profile.primaryGoalDescription || '',
    experience_level: profile.experience_level || 'novice',
    initial_questions: profile.initial_questions || null,
    follow_up_questions: profile.follow_up_questions || null,
    initial_responses: profile.initial_responses || null,
    follow_up_responses: profile.follow_up_responses || null,
    plan_outline: isValidPlanOutline(profile.plan_outline) 
      ? profile.plan_outline 
      : null,
  };
};