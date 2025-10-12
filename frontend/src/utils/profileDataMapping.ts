/**
 * Utility functions for mapping profile data between different formats
 */

export interface OnboardingData {
  username?: string;
  goalDescription?: string;
  experienceLevel?: string;
  daysPerWeek?: number;
  minutesPerSession?: number;
  equipment?: string | string[];
  age?: number;
  weight?: number;
  weightUnit?: string;
  height?: number;
  heightUnit?: string;
  gender?: string;
  hasLimitations?: boolean;
  limitationsDescription?: string;
  finalNotes?: string;
  selectedCoachId?: number;
}

export interface DatabaseProfileData {
  user_id: string;
  username: string;
  goal_description: string;
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
  limitations_description: string;
  final_chat_notes: string;
  coach_id?: number;
}

export interface BackendRequestData {
  goalDescription: string;
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

/**
 * Convert onboarding data to database format (snake_case)
 */
export const mapOnboardingToDatabase = (
  userId: string,
  onboardingData: OnboardingData
): DatabaseProfileData => {
  return {
    user_id: userId,
    username: onboardingData.username || '',
    goal_description: onboardingData.goalDescription || '',
    experience_level: onboardingData.experienceLevel || '',
    days_per_week: onboardingData.daysPerWeek || 3,
    minutes_per_session: onboardingData.minutesPerSession || 45,
    equipment: Array.isArray(onboardingData.equipment) 
      ? onboardingData.equipment[0] || '' 
      : onboardingData.equipment || '',
    age: onboardingData.age || 25,
    weight: onboardingData.weight || 70,
    weight_unit: onboardingData.weightUnit || 'kg',
    height: onboardingData.height || 170,
    height_unit: onboardingData.heightUnit || 'cm',
    gender: onboardingData.gender || '',
    has_limitations: onboardingData.hasLimitations || false,
    limitations_description: onboardingData.limitationsDescription || '',
    final_chat_notes: onboardingData.finalNotes || '',
    coach_id: onboardingData.selectedCoachId || undefined,
  };
};

/**
 * Convert profile data to backend request format (camelCase)
 */
export const mapProfileToBackendRequest = (
  profileData: any,
  userId: string,
  userProfileId: number
): BackendRequestData => {
  return {
    goalDescription: profileData.goal_description || profileData.goalDescription || '',
    experienceLevel: profileData.experience_level || profileData.experienceLevel || '',
    daysPerWeek: profileData.days_per_week || profileData.daysPerWeek,
    minutesPerSession: profileData.minutes_per_session || profileData.minutesPerSession,
    equipment: profileData.equipment,
    age: profileData.age,
    weight: profileData.weight,
    weightUnit: profileData.weight_unit || profileData.weightUnit,
    height: profileData.height,
    heightUnit: profileData.height_unit || profileData.heightUnit,
    gender: profileData.gender,
    hasLimitations: profileData.has_limitations || profileData.hasLimitations || false,
    limitationsDescription: profileData.limitations_description || profileData.limitationsDescription || '',
    finalChatNotes: profileData.final_chat_notes || profileData.finalChatNotes || '',
    user_id: userId,
    user_profile_id: userProfileId,
  };
};

/**
 * Convert database profile to navigation params format
 */
export const mapDatabaseToNavigationParams = (
  profileData: any,
  profileId: number,
  userId: string
): any => {
  return {
    id: profileId,
    user_id: userId,
    username: profileData.username || '',
    goal_description: profileData.goalDescription || '',
    experience_level: profileData.experienceLevel || '',
    days_per_week: profileData.daysPerWeek || 3,
    minutes_per_session: profileData.minutesPerSession || 45,
    equipment: Array.isArray(profileData.equipment) ? profileData.equipment[0] || '' : profileData.equipment || '',
    age: profileData.age || 25,
    weight: profileData.weight || 70,
    weight_unit: profileData.weightUnit || 'kg',
    height: profileData.height || 170,
    height_unit: profileData.heightUnit || 'cm',
    gender: profileData.gender || '',
    has_limitations: profileData.hasLimitations || false,
    limitations_description: profileData.limitationsDescription || '',
    final_chat_notes: profileData.finalNotes || '',
  };
};
