/**
 * Onboarding utility functions and helpers
 */

import { OnboardingData, ExperienceLevel, EquipmentType } from '../types/onboarding';

/**
 * Converts weight between units
 */
export const convertWeight = (value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number => {
  if (from === to) return value;
  
  if (from === 'lbs' && to === 'kg') {
    return value * 0.453592;
  }
  
  if (from === 'kg' && to === 'lbs') {
    return value / 0.453592;
  }
  
  return value;
};

/**
 * Converts height between units
 */
export const convertHeight = (value: number, from: 'cm' | 'in', to: 'cm' | 'in'): number => {
  if (from === to) return value;
  
  if (from === 'in' && to === 'cm') {
    return value * 2.54;
  }
  
  if (from === 'cm' && to === 'in') {
    return value / 2.54;
  }
  
  return value;
};

/**
 * Calculates BMI
 */
export const calculateBMI = (weight: number, height: number, weightUnit: 'kg' | 'lbs', heightUnit: 'cm' | 'in'): number => {
  // Convert to kg and meters
  const weightInKg = weightUnit === 'lbs' ? convertWeight(weight, 'lbs', 'kg') : weight;
  const heightInM = heightUnit === 'in' ? convertHeight(height, 'in', 'cm') / 100 : height / 100;
  
  return weightInKg / (heightInM * heightInM);
};

/**
 * Gets BMI category
 */
export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Calculates ideal weight range based on height and gender
 */
export const getIdealWeightRange = (
  height: number, 
  heightUnit: 'cm' | 'in', 
  gender: 'Male' | 'Female' | 'Other',
  weightUnit: 'kg' | 'lbs'
): { min: number; max: number } => {
  // Convert height to cm
  const heightInCm = heightUnit === 'in' ? convertHeight(height, 'in', 'cm') : height;
  
  // Calculate ideal BMI range (18.5-24.9)
  const minBMI = 18.5;
  const maxBMI = 24.9;
  
  // Calculate weight range in kg
  const heightInM = heightInCm / 100;
  const minWeightKg = minBMI * (heightInM * heightInM);
  const maxWeightKg = maxBMI * (heightInM * heightInM);
  
  // Convert to desired unit
  const minWeight = weightUnit === 'lbs' ? convertWeight(minWeightKg, 'kg', 'lbs') : minWeightKg;
  const maxWeight = weightUnit === 'lbs' ? convertWeight(maxWeightKg, 'kg', 'lbs') : maxWeightKg;
  
  return { min: Math.round(minWeight * 10) / 10, max: Math.round(maxWeight * 10) / 10 };
};

/**
 * Formats weight for display
 */
export const formatWeight = (weight: number, unit: 'kg' | 'lbs'): string => {
  return `${weight.toFixed(1)} ${unit}`;
};

/**
 * Formats height for display
 */
export const formatHeight = (height: number, unit: 'cm' | 'in'): string => {
  if (unit === 'in') {
    const feet = Math.floor(height / 12);
    const inches = Math.round(height % 12);
    return `${feet}'${inches}"`;
  }
  return `${height.toFixed(0)} cm`;
};

/**
 * Gets experience level description
 */
export const getExperienceDescription = (level: ExperienceLevel): string => {
  const descriptions = {
    'Beginner': 'New to fitness or returning after a long break',
    'Intermediate': 'Some experience with regular exercise',
    'Advanced': 'Experienced with various training methods',
    'Expert': 'Highly experienced with advanced training'
  };
  
  return descriptions[level] || '';
};

/**
 * Gets equipment description
 */
export const getEquipmentDescription = (equipment: EquipmentType): string => {
  const descriptions = {
    'Full Gym': 'Access to a complete gym facility',
    'Home Gym': 'Basic equipment at home',
    'Dumbbells Only': 'Just dumbbells available',
    'Bodyweight Only': 'No equipment, bodyweight exercises only',
    'Cardio Equipment': 'Treadmill, bike, or other cardio machines',
    'Resistance Bands': 'Resistance bands for strength training',
    'Kettlebells': 'Kettlebells for functional training',
    'Yoga Mat': 'Yoga mat for floor exercises'
  };
  
  return descriptions[equipment] || '';
};

/**
 * Generates workout frequency recommendation based on experience
 */
export const getRecommendedWorkoutFrequency = (experience: ExperienceLevel): { days: number; minutes: number } => {
  const recommendations = {
    'Beginner': { days: 3, minutes: 30 },
    'Intermediate': { days: 4, minutes: 45 },
    'Advanced': { days: 5, minutes: 60 },
    'Expert': { days: 6, minutes: 75 }
  };
  
  return recommendations[experience] || { days: 3, minutes: 30 };
};

/**
 * Generates equipment recommendations based on goals
 */
export const getRecommendedEquipment = (goal: string): EquipmentType[] => {
  const recommendations: Record<string, EquipmentType[]> = {
    'Weight Loss': ['Cardio Equipment', 'Dumbbells Only', 'Bodyweight Only'],
    'Muscle Gain': ['Full Gym', 'Home Gym', 'Dumbbells Only'],
    'Endurance': ['Cardio Equipment', 'Bodyweight Only'],
    'Strength': ['Full Gym', 'Home Gym', 'Dumbbells Only', 'Kettlebells'],
    'General Fitness': ['Home Gym', 'Dumbbells Only', 'Bodyweight Only', 'Resistance Bands'],
    'Athletic Performance': ['Full Gym', 'Home Gym', 'Kettlebells', 'Resistance Bands']
  };
  
  return recommendations[goal] || ['Bodyweight Only'];
};

/**
 * Calculates estimated workout duration based on goals and experience
 */
export const getEstimatedWorkoutDuration = (
  goal: string, 
  experience: ExperienceLevel, 
  daysPerWeek: number
): number => {
  const baseMinutes = {
    'Weight Loss': 45,
    'Muscle Gain': 60,
    'Endurance': 40,
    'Strength': 75,
    'General Fitness': 35,
    'Athletic Performance': 90
  };
  
  const experienceMultiplier = {
    'Beginner': 0.8,
    'Intermediate': 1.0,
    'Advanced': 1.2,
    'Expert': 1.4
  };
  
  const frequencyMultiplier = daysPerWeek <= 3 ? 1.2 : daysPerWeek <= 5 ? 1.0 : 0.8;
  
  const baseTime = baseMinutes[goal] || 45;
  const experienceTime = baseTime * (experienceMultiplier[experience] || 1.0);
  const finalTime = experienceTime * frequencyMultiplier;
  
  return Math.round(finalTime);
};

/**
 * Generates motivation tips based on motivation level
 */
export const getMotivationTips = (level: number): string[] => {
  if (level <= 3) {
    return [
      'Start small with 10-15 minute workouts',
      'Find a workout buddy for accountability',
      'Set achievable weekly goals',
      'Celebrate small victories',
      'Focus on how exercise makes you feel'
    ];
  } else if (level <= 6) {
    return [
      'Mix up your routine to stay engaged',
      'Track your progress regularly',
      'Join fitness challenges',
      'Set both short and long-term goals',
      'Reward yourself for consistency'
    ];
  } else {
    return [
      'Push yourself with progressive overload',
      'Try new training methods',
      'Set ambitious but realistic goals',
      'Share your journey with others',
      'Consider becoming a fitness mentor'
    ];
  }
};

/**
 * Generates personalized recommendations based on onboarding data
 */
export const generatePersonalizedRecommendations = (data: OnboardingData): {
  workoutFrequency: { days: number; minutes: number };
  recommendedEquipment: EquipmentType[];
  motivationTips: string[];
  estimatedDuration: number;
} => {
  const workoutFrequency = getRecommendedWorkoutFrequency(data.experienceLevel);
  const recommendedEquipment = getRecommendedEquipment(data.primaryGoal);
  const motivationTips = getMotivationTips(data.motivationLevel);
  const estimatedDuration = getEstimatedWorkoutDuration(
    data.primaryGoal,
    data.experienceLevel,
    data.daysPerWeek
  );
  
  return {
    workoutFrequency,
    recommendedEquipment,
    motivationTips,
    estimatedDuration
  };
};

/**
 * Validates and sanitizes onboarding data
 */
export const sanitizeOnboardingData = (data: OnboardingData): OnboardingData => {
  return {
    ...data,
    username: data.username.trim(),
    goalDescription: data.goalDescription.trim(),
    limitationsDescription: data.limitationsDescription.trim(),
    injuryHistory: data.injuryHistory.trim(),
    previousExperience: data.previousExperience.trim(),
    supportSystem: data.supportSystem.trim(),
    finalNotes: data.finalNotes.trim(),
    medications: data.medications.trim(),
    allergies: data.allergies.trim()
  };
};

/**
 * Generates a summary of onboarding data for review
 */
export const generateOnboardingSummary = (data: OnboardingData): {
  personalInfo: string;
  fitnessInfo: string;
  preferences: string;
  goals: string;
} => {
  const personalInfo = `${data.username}, ${data.age} years old, ${data.gender}. ${formatHeight(data.height, data.heightUnit)} tall, ${formatWeight(data.weight, data.weightUnit)}.`;
  
  const fitnessInfo = `${data.experienceLevel} level with ${data.equipment.join(', ')} available. ${data.daysPerWeek} days per week, ${data.minutesPerSession} minutes per session.`;
  
  const preferences = `Prefers ${data.scheduleFlexibility.toLowerCase()} schedule. Motivation level: ${data.motivationLevel}/10. ${data.hasLimitations ? `Has limitations: ${data.limitationsDescription}` : 'No physical limitations.'}`;
  
  const goals = `Primary goal: ${data.primaryGoal}. ${data.goalDescription ? `Details: ${data.goalDescription}` : ''} Timeline: ${data.timeline}.`;
  
  return {
    personalInfo,
    fitnessInfo,
    preferences,
    goals
  };
};

/**
 * Calculates progress percentage for onboarding
 */
export const calculateProgressPercentage = (data: OnboardingData): number => {
  const requiredFields = [
    'username', 'age', 'weight', 'height', 'gender',
    'hasHealthConditions', 'primaryGoal', 'experienceLevel',
    'equipment', 'daysPerWeek', 'minutesPerSession',
    'hasLimitations', 'motivationLevel', 'termsAccepted', 'privacyAccepted'
  ];
  
  let completedFields = 0;
  
  for (const field of requiredFields) {
    const value = data[field as keyof OnboardingData];
    if (value !== null && value !== undefined && value !== '' && 
        !(Array.isArray(value) && value.length === 0)) {
      completedFields++;
    }
  }
  
  return Math.round((completedFields / requiredFields.length) * 100);
};

/**
 * Formats onboarding data for API submission
 */
export const formatForAPI = (data: OnboardingData): any => {
  const sanitized = sanitizeOnboardingData(data);
  
  return {
    personal_info: {
      username: sanitized.username,
      age: sanitized.age,
      weight: sanitized.weight,
      weight_unit: sanitized.weightUnit,
      height: sanitized.height,
      height_unit: sanitized.heightUnit,
      gender: sanitized.gender
    },
    health_info: {
      has_health_conditions: sanitized.hasHealthConditions,
      health_conditions: sanitized.healthConditions,
      medications: sanitized.medications,
      allergies: sanitized.allergies
    },
    fitness_goals: {
      primary_goal: sanitized.primaryGoal,
      goal_description: sanitized.goalDescription,
      target_weight: sanitized.targetWeight,
      target_weight_unit: sanitized.targetWeightUnit,
      timeline: sanitized.timeline
    },
    experience: {
      experience_level: sanitized.experienceLevel
    },
    equipment: {
      equipment_types: sanitized.equipment,
      home_gym: sanitized.homeGym,
      gym_membership: sanitized.gymMembership
    },
    schedule: {
      days_per_week: sanitized.daysPerWeek,
      minutes_per_session: sanitized.minutesPerSession,
      preferred_workout_times: sanitized.preferredWorkoutTimes,
      schedule_flexibility: sanitized.scheduleFlexibility
    },
    limitations: {
      has_limitations: sanitized.hasLimitations,
      limitations: sanitized.limitations,
      limitations_description: sanitized.limitationsDescription,
      injury_history: sanitized.injuryHistory
    },
    motivation: {
      motivation_level: sanitized.motivationLevel,
      motivation_factors: sanitized.motivationFactors,
      previous_experience: sanitized.previousExperience,
      support_system: sanitized.supportSystem
    },
    completion: {
      final_notes: sanitized.finalNotes,
      terms_accepted: sanitized.termsAccepted,
      privacy_accepted: sanitized.privacyAccepted
    }
  };
};
