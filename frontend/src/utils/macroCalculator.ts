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
 * Helper function to get base activity level
 * Default to sedentary as a safe, conservative baseline
 * Training activity is added separately via training boost
 */
export function estimateBaseActivityFromProfile(): "sedentary" | "light" | "moderate" | "high" {
  // Default to sedentary (desk job, minimal daily activity outside training)
  // This is conservative and safe - training activity is added separately
  return "sedentary";
}

/**
 * Helper function to estimate training intensity from training plan data
 * Based on training frequency and experience level
 */
export function estimateTrainingIntensity(
  daysPerWeek: number, 
  experienceLevel: string
): "low" | "medium" | "high" {
  // Experience multiplier - advanced athletes train with higher intensity
  const experienceMultiplier = 
    experienceLevel.toLowerCase().includes('advanced') ? 1.2 :
    experienceLevel.toLowerCase().includes('intermediate') ? 1.0 : 0.8;
  
  // Adjust frequency by experience
  const adjustedFrequency = daysPerWeek * experienceMultiplier;
  
  // Classify intensity based on training frequency and experience
  if (adjustedFrequency <= 3) {
    return "low";      // 1-3 days/week (or beginner)
  } else if (adjustedFrequency <= 5) {
    return "medium";   // 4-5 days/week (or intermediate)
  } else {
    return "high";     // 6+ days/week (or advanced)
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

