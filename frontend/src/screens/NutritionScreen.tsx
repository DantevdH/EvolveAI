/**
 * Nutrition Screen - Displays user's calculated calories and macros
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';
import {
  calculateMacros,
  estimateBaseActivityFromProfile,
  estimateTrainingIntensity,
  estimateWeightGoalFromProfile,
  convertWeightToKg,
  convertHeightToCm,
  MacroCalculationResult,
} from '../utils/macroCalculator';

const { width } = Dimensions.get('window');

interface MacroCardProps {
  title: string;
  value: number;
  unit: string;
  percentage?: number;
  color: string;
}

const MacroCard: React.FC<MacroCardProps> = ({
  title,
  value,
  unit,
  percentage,
  color,
}) => (
  <View style={[styles.macroCard, { borderLeftColor: color }]}>
    <Text style={styles.macroTitle}>{title}</Text>
    <Text style={[styles.macroValue, { color }]}>{value}</Text>
    <Text style={styles.macroUnit}>{unit}</Text>
    {percentage && (
      <Text style={styles.macroPercentage}>{percentage}% of calories</Text>
    )}
  </View>
);

interface CalorieRingProps {
  calories: number;
  goal: string;
}

const CalorieRing: React.FC<CalorieRingProps> = ({ calories, goal }) => (
  <View style={styles.calorieRingContainer}>
    <View style={styles.calorieRing}>
      <Text style={styles.calorieValue}>{calories}</Text>
      <Text style={styles.calorieUnit}>calories</Text>
    </View>
    <Text style={styles.goalText}>Goal: {goal}</Text>
  </View>
);

export const NutritionScreen: React.FC = () => {
  const { state } = useAuth();
  const { userProfile } = state;

  const macroCalculation = useMemo((): MacroCalculationResult | null => {
    if (!userProfile) return null;

    try {
      // Convert units if needed
      const weightKg = convertWeightToKg(userProfile.weight, userProfile.weightUnit);
      const heightCm = convertHeightToCm(userProfile.height, userProfile.heightUnit);
      
      // Estimate parameters from user profile
      const baseActivity = estimateBaseActivityFromProfile(
        userProfile.daysPerWeek,
        userProfile.minutesPerSession
      );
      const trainingIntensity = estimateTrainingIntensity(
        userProfile.daysPerWeek,
        userProfile.minutesPerSession
      );
      const weightGoal = estimateWeightGoalFromProfile(
        userProfile.goalDescription || '',
        weightKg
      );
      
      // Determine sex from gender
      const sex = userProfile.gender.toLowerCase().includes('male') ? 'male' : 'female';

      return calculateMacros({
        sex,
        weight: weightKg,
        height: heightCm,
        age: userProfile.age,
        baseActivity,
        trainingsPerWeek: userProfile.daysPerWeek,
        trainingIntensity,
        targetWeight: weightGoal.targetWeight,
        timeframeWeeks: weightGoal.timeframeWeeks,
      });
    } catch (error) {
      console.error('Error calculating macros:', error);
      return null;
    }
  }, [userProfile]);

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user profile found</Text>
      </View>
    );
  }

  if (!macroCalculation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to calculate nutrition data</Text>
      </View>
    );
  }

  const { calories, protein, carbs, fat, bmr, tdee } = macroCalculation;

  // Calculate macro percentages
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;

  const proteinPercentage = Math.round((proteinCalories / calories) * 100);
  const carbsPercentage = Math.round((carbsCalories / calories) * 100);
  const fatPercentage = Math.round((fatCalories / calories) * 100);

  // Get goal description
  const getGoalDescription = () => {
    if (!macroCalculation || !userProfile) return 'Maintenance';
    
    const weightChange = macroCalculation.calories - macroCalculation.tdee;
    const weightKg = convertWeightToKg(userProfile.weight, userProfile.weightUnit);
    const weightGoal = estimateWeightGoalFromProfile(userProfile.goalDescription || '', weightKg);
    
    if (weightGoal.targetWeight && weightChange !== 0) {
      const weeklyChange = Math.abs(weightChange * 7 / 7700); // Convert daily kcal to weekly kg
      if (weightChange > 0) {
        return `Muscle Gain (${weeklyChange.toFixed(1)}kg/week)`;
      } else {
        return `Weight Loss (${weeklyChange.toFixed(1)}kg/week)`;
      }
    }
    
    return 'Maintenance';
  };

  const goalDescription = getGoalDescription();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.subtitle}>Your personalized macro targets</Text>
          </View>
        </View>
      </View>

      <CalorieRing calories={calories} goal={goalDescription} />

      <View style={styles.macrosSection}>
        <Text style={styles.sectionTitle}>Macronutrients</Text>
        <View style={styles.macrosGrid}>
          <MacroCard
            title="Protein"
            value={protein}
            unit="g"
            percentage={proteinPercentage}
            color={colors.primary}
          />
          <MacroCard
            title="Carbs"
            value={carbs}
            unit="g"
            percentage={carbsPercentage}
            color={colors.secondary}
          />
          <MacroCard
            title="Fat"
            value={fat}
            unit="g"
            percentage={fatPercentage}
            color={colors.tertiary}
          />
        </View>
      </View>

      <View style={styles.metabolismSection}>
        <Text style={styles.sectionTitle}>Metabolism</Text>
        <View style={styles.metabolismCards}>
          <View style={styles.metabolismCard}>
            <Text style={styles.metabolismLabel}>BMR</Text>
            <Text style={styles.metabolismValue}>{bmr}</Text>
            <Text style={styles.metabolismUnit}>calories/day</Text>
            <Text style={styles.metabolismDescription}>Basal Metabolic Rate</Text>
          </View>
          <View style={styles.metabolismCard}>
            <Text style={styles.metabolismLabel}>TDEE</Text>
            <Text style={styles.metabolismValue}>{tdee}</Text>
            <Text style={styles.metabolismUnit}>calories/day</Text>
            <Text style={styles.metabolismDescription}>Total Daily Energy Expenditure</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Based on Your Profile</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Goal:</Text>
            <Text style={styles.infoValue}>{userProfile.goalDescription}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Activity Level:</Text>
            <Text style={styles.infoValue}>
              {userProfile.daysPerWeek} days/week, {userProfile.minutesPerSession} min/session
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>
              {userProfile.weight} {userProfile.weightUnit}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.infoValue}>
              {userProfile.height} {userProfile.heightUnit}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{userProfile.age} years</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 0,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 50,
  },
  calorieRingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: colors.card,
    margin: 20,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  calorieRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  calorieUnit: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  goalText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  macrosSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 15,
    marginHorizontal: 4,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  macroTitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  macroUnit: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  macroPercentage: {
    fontSize: 11,
    color: colors.muted,
  },
  metabolismSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  metabolismCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metabolismCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 20,
    marginHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  metabolismLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  metabolismValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metabolismUnit: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  metabolismDescription: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
});

export default NutritionScreen;
