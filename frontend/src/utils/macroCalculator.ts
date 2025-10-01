/**
 * Macro Calculator - Calculate TDEE, calories, and macros
 * Based on user profile data and training goals
 */

export interface MacroCalculationParams {
  sex: "male" | "female";
  weight: number; // in kg
  height: number; // in cm
  age: number; // in years
  baseActivity: "sedentary" | "light" | "moderate" | "high"; // non-exercise PAL
  trainingsPerWeek: number;
  trainingIntensity: "low" | "medium" | "high";
  targetWeight?: number; // goal weight in kg
  timeframeWeeks?: number; // weeks to reach goal
}

export interface MacroCalculationResult {
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  bmr: number; // basal metabolic rate
  tdee: number; // total daily energy expenditure
}

/**
 * Calculate TDEE, calories, and macros with flexible activity & goal period
 *
 * @param params - User parameters for calculation
 * @returns Macro calculation results
 */
export function calculateMacros({
  sex,
  weight,
  height,
  age,
  baseActivity,
  trainingsPerWeek,
  trainingIntensity,
  targetWeight,
  timeframeWeeks,
}: MacroCalculationParams): MacroCalculationResult {
  // --- Step 1: BMR (Mifflin–St Jeor) ---
  let bmr =
    10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);

  // --- Step 2: Base PAL ---
  const basePALMap = {
    sedentary: 1.2,
    light: 1.35,
    moderate: 1.55,
    high: 1.75,
  };
  let pal = basePALMap[baseActivity] || 1.2;

  // --- Step 3: Add training PAL boost ---
  const intensityFactor = {
    low: 0.05,
    medium: 0.075,
    high: 0.1,
  };
  let trainingBoost =
    (trainingsPerWeek / 7) * (intensityFactor[trainingIntensity] || 0.075);
  pal += trainingBoost;

  // --- Step 4: TDEE ---
  let tdee = bmr * pal;

  // --- Step 5: Goal adjustment ---
  let targetCalories = tdee;
  if (targetWeight && timeframeWeeks && timeframeWeeks > 0) {
    const weightChange = targetWeight - weight; // kg
    const totalCalorieChange = weightChange * 7700; // kcal (7700 kcal per kg fat)
    const dailyAdjustment = totalCalorieChange / (timeframeWeeks * 7);
    targetCalories = tdee + dailyAdjustment;
  }

  // --- Step 6: Macros ---
  const protein = Math.round(weight * 2); // 2 g/kg
  const fat = Math.round(weight * 1); // 1 g/kg
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbs = Math.round(
    (targetCalories - (proteinCalories + fatCalories)) / 4
  );

  return {
    calories: Math.round(targetCalories),
    protein,
    carbs,
    fat,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

/**
 * Base activity levels for PAL (Physical Activity Level)
 */
export const BASE_ACTIVITY_LEVELS = {
  sedentary: "sedentary" as const,
  light: "light" as const,
  moderate: "moderate" as const,
  high: "high" as const,
} as const;

/**
 * Training intensity levels
 */
export const WORKOUT_INTENSITY = {
  low: "low" as const,
  medium: "medium" as const,
  high: "high" as const,
} as const;

/**
 * Helper function to estimate base activity level from user profile
 * This is a simplified estimation - ideally would come from onboarding
 */
export function estimateBaseActivityFromProfile(daysPerWeek: number, minutesPerSession: number): "sedentary" | "light" | "moderate" | "high" {
  // For now, we'll make assumptions based on training frequency
  // In the future, this should come from onboarding questions about job type, daily steps, etc.
  
  if (daysPerWeek <= 2) {
    return "sedentary"; // Assumes desk job, minimal daily activity
  } else if (daysPerWeek <= 4) {
    return "light"; // Assumes some daily movement, standing job
  } else if (daysPerWeek <= 5) {
    return "moderate"; // Assumes active lifestyle, on feet often
  } else {
    return "high"; // Assumes very active lifestyle
  }
}

/**
 * Helper function to estimate training intensity from user profile
 */
export function estimateTrainingIntensity(daysPerWeek: number, minutesPerSession: number): "low" | "medium" | "high" {
  const totalMinutesPerWeek = daysPerWeek * minutesPerSession;
  
  if (totalMinutesPerWeek <= 200) {
    return "low"; // Light trainings
  } else if (totalMinutesPerWeek <= 400) {
    return "medium"; // Moderate intensity
  } else {
    return "high"; // High intensity
  }
}

/**
 * Helper function to estimate target weight and timeframe from primary goal
 */
export function estimateWeightGoalFromProfile(primaryGoal: string, currentWeight: number): { targetWeight?: number; timeframeWeeks?: number } {
  const goal = primaryGoal.toLowerCase();
  
  // Default timeframe based on training plan (assuming 4-8 week plans)
  const defaultTimeframe = 6; // weeks
  
  if (goal.includes('weight loss') || goal.includes('lose') || goal.includes('cut')) {
    // Conservative weight loss: 0.5-1 kg per week
    const weeklyLoss = 0.75; // kg per week
    const targetWeight = Math.max(currentWeight - (weeklyLoss * defaultTimeframe), currentWeight * 0.85); // Max 15% weight loss
    return { targetWeight, timeframeWeeks: defaultTimeframe };
  } else if (goal.includes('muscle') || goal.includes('bulk') || goal.includes('gain')) {
    // Conservative muscle gain: 0.25-0.5 kg per week
    const weeklyGain = 0.35; // kg per week
    const targetWeight = currentWeight + (weeklyGain * defaultTimeframe);
    return { targetWeight, timeframeWeeks: defaultTimeframe };
  } else {
    // Maintenance - no weight change
    return { targetWeight: currentWeight, timeframeWeeks: defaultTimeframe };
  }
}

/**
 * Helper function to convert weight units
 */
export function convertWeightToKg(weight: number, unit: string): number {
  if (unit.toLowerCase() === 'lbs' || unit.toLowerCase() === 'lb') {
    return weight * 0.453592; // Convert lbs to kg
  }
  return weight; // Already in kg
}

/**
 * Helper function to convert height units
 */
export function convertHeightToCm(height: number, unit: string): number {
  if (unit.toLowerCase() === 'ft' || unit.toLowerCase() === 'feet') {
    return height * 30.48; // Convert feet to cm
  } else if (unit.toLowerCase() === 'in' || unit.toLowerCase() === 'inches') {
    return height * 2.54; // Convert inches to cm
  }
  return height; // Already in cm
}

