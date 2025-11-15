/**
 * Utility functions for mapping profile data between different formats
 */

export interface OnboardingData {
  username?: string;
  experienceLevel?: string;
  age?: number;
  weight?: number;
  weightUnit?: string;
  height?: number;
  heightUnit?: string;
  gender?: string;
  finalNotes?: string;
  selectedCoachId?: number;
}

export interface DatabaseProfileData {
  user_id: string;
  username: string;
  experience_level: string;
  age: number;
  weight: number;
  weight_unit: string;
  height: number;
  height_unit: string;
  gender: string;
  final_chat_notes: string;
  coach_id?: number;
}

export interface BackendRequestData {
  experienceLevel: string;
  age: number;
  weight: number;
  weightUnit: string;
  height: number;
  heightUnit: string;
  gender: string;
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
    experience_level: onboardingData.experienceLevel || '',
    age: onboardingData.age || 25,
    weight: onboardingData.weight || 70,
    weight_unit: onboardingData.weightUnit || 'kg',
    height: onboardingData.height || 170,
    height_unit: onboardingData.heightUnit || 'cm',
    gender: onboardingData.gender || '',
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
    experienceLevel: profileData.experience_level || profileData.experienceLevel || '',
    age: profileData.age,
    weight: profileData.weight,
    weightUnit: profileData.weight_unit || profileData.weightUnit,
    height: profileData.height,
    heightUnit: profileData.height_unit || profileData.heightUnit,
    gender: profileData.gender,
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
    experience_level: profileData.experienceLevel || '',
    age: profileData.age || 25,
    weight: profileData.weight || 70,
    weight_unit: profileData.weightUnit || 'kg',
    height: profileData.height || 170,
    height_unit: profileData.heightUnit || 'cm',
    gender: profileData.gender || '',
    final_chat_notes: profileData.finalNotes || '',
  };
};
