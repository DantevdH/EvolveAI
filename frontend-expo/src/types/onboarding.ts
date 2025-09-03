/**
 * Onboarding-specific types and interfaces
 */

export interface OnboardingData {
  // Step 1: Welcome
  username: string;
  
  // Step 2: Personal Information
  age: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  height: number;
  heightUnit: 'cm' | 'in';
  gender: 'Male' | 'Female' | 'Other';
  
  // Step 3: Health Information
  hasHealthConditions: boolean;
  healthConditions: string[];
  medications: string;
  allergies: string;
  
  // Step 4: Fitness Goals
  primaryGoal: string;
  goalDescription: string;
  targetWeight?: number;
  targetWeightUnit: 'kg' | 'lbs';
  timeline: string;
  
  // Step 5: Experience Level
  experienceLevel: ExperienceLevel;
  
  // Step 6: Equipment Access
  equipment: EquipmentType[];
  homeGym: boolean;
  gymMembership: boolean;
  
  // Step 7: Time Availability
  daysPerWeek: number;
  minutesPerSession: number;
  preferredWorkoutTimes: string[];
  scheduleFlexibility: 'Very Flexible' | 'Somewhat Flexible' | 'Not Flexible';
  
  // Step 8: Physical Limitations
  hasLimitations: boolean;
  limitations: string[];
  limitationsDescription: string;
  injuryHistory: string;
  
  // Step 9: Motivation
  motivationLevel: number; // 1-10 scale
  motivationFactors: string[];
  previousExperience: string;
  supportSystem: string;
  
  // Step 10: Completion
  finalNotes: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export type ExperienceLevel = 
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert';

export type EquipmentType = 
  | 'Full Gym'
  | 'Home Gym'
  | 'Dumbbells Only'
  | 'Bodyweight Only'
  | 'Cardio Equipment'
  | 'Resistance Bands'
  | 'Kettlebells'
  | 'Yoga Mat';

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  component: string;
  isRequired: boolean;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  field: keyof OnboardingData;
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  isValid: boolean;
  canProceed: boolean;
  canGoBack: boolean;
}

export interface OnboardingState {
  data: OnboardingData;
  progress: OnboardingProgress;
  isLoading: boolean;
  error: string | null;
  isComplete: boolean;
  isGeneratingPlan: boolean;
}

export interface OnboardingContextType {
  state: OnboardingState;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  validateStep: (step: number) => boolean;
  completeOnboarding: () => Promise<boolean>;
  resetOnboarding: () => void;
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  setGeneratingPlan: (isGenerating: boolean) => void;
}

// Default onboarding data
export const defaultOnboardingData: OnboardingData = {
  username: '',
  age: 25,
  weight: 70,
  weightUnit: 'kg',
  height: 170,
  heightUnit: 'cm',
  gender: 'Male',
  hasHealthConditions: false,
  healthConditions: [],
  medications: '',
  allergies: '',
  primaryGoal: '',
  goalDescription: '',
  targetWeight: undefined,
  targetWeightUnit: 'kg',
  timeline: '',
  experienceLevel: 'Beginner',
  equipment: [],
  homeGym: false,
  gymMembership: false,
  daysPerWeek: 3,
  minutesPerSession: 45,
  preferredWorkoutTimes: [],
  scheduleFlexibility: 'Somewhat Flexible',
  hasLimitations: false,
  limitations: [],
  limitationsDescription: '',
  injuryHistory: '',
  motivationLevel: 5,
  motivationFactors: [],
  previousExperience: '',
  supportSystem: '',
  finalNotes: '',
  termsAccepted: false,
  privacyAccepted: false,
};

// Onboarding steps configuration
export const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome',
    description: 'Let\'s get to know you',
    component: 'WelcomeScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'username',
        type: 'required',
        message: 'Username is required'
      },
      {
        field: 'username',
        type: 'min',
        value: 3,
        message: 'Username must be at least 3 characters'
      }
    ]
  },
  {
    id: 2,
    title: 'Personal Information',
    description: 'Basic details about you',
    component: 'PersonalInfoScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'age',
        type: 'required',
        message: 'Age is required'
      },
      {
        field: 'age',
        type: 'min',
        value: 13,
        message: 'Age must be at least 13'
      },
      {
        field: 'age',
        type: 'max',
        value: 100,
        message: 'Age must be less than 100'
      },
      {
        field: 'weight',
        type: 'required',
        message: 'Weight is required'
      },
      {
        field: 'height',
        type: 'required',
        message: 'Height is required'
      },
      {
        field: 'gender',
        type: 'required',
        message: 'Gender is required'
      }
    ]
  },
  {
    id: 3,
    title: 'Health Information',
    description: 'Your health background',
    component: 'HealthInfoScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'hasHealthConditions',
        type: 'required',
        message: 'Please indicate if you have health conditions'
      }
    ]
  },
  {
    id: 4,
    title: 'Fitness Goals',
    description: 'What do you want to achieve?',
    component: 'FitnessGoalsScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'primaryGoal',
        type: 'required',
        message: 'Primary goal is required'
      }
    ]
  },
  {
    id: 5,
    title: 'Experience Level',
    description: 'Your fitness experience',
    component: 'ExperienceLevelScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'experienceLevel',
        type: 'required',
        message: 'Experience level is required'
      }
    ]
  },
  {
    id: 6,
    title: 'Equipment Access',
    description: 'What equipment do you have?',
    component: 'EquipmentAccessScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'equipment',
        type: 'required',
        message: 'At least one equipment type is required'
      }
    ]
  },
  {
    id: 7,
    title: 'Time Availability',
    description: 'When can you work out?',
    component: 'TimeAvailabilityScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'daysPerWeek',
        type: 'required',
        message: 'Days per week is required'
      },
      {
        field: 'minutesPerSession',
        type: 'required',
        message: 'Minutes per session is required'
      }
    ]
  },
  {
    id: 8,
    title: 'Physical Limitations',
    description: 'Any limitations we should know about?',
    component: 'PhysicalLimitationsScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'hasLimitations',
        type: 'required',
        message: 'Please indicate if you have limitations'
      }
    ]
  },
  {
    id: 9,
    title: 'Motivation',
    description: 'What drives you?',
    component: 'MotivationScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'motivationLevel',
        type: 'required',
        message: 'Motivation level is required'
      }
    ]
  },
  {
    id: 10,
    title: 'Complete',
    description: 'Final review and completion',
    component: 'OnboardingCompleteScreen',
    isRequired: true,
    validationRules: [
      {
        field: 'termsAccepted',
        type: 'required',
        message: 'You must accept the terms of service'
      },
      {
        field: 'privacyAccepted',
        type: 'required',
        message: 'You must accept the privacy policy'
      }
    ]
  }
];

// Experience level options
export const experienceLevels = [
  {
    value: 'Beginner' as ExperienceLevel,
    title: 'Beginner',
    description: 'New to fitness or returning after a long break',
    infoText: 'Perfect for those starting their fitness journey. We\'ll focus on proper form and building a solid foundation.'
  },
  {
    value: 'Intermediate' as ExperienceLevel,
    title: 'Intermediate',
    description: 'Some experience with regular exercise',
    infoText: 'You have a good understanding of basic exercises and can handle moderate intensity workouts.'
  },
  {
    value: 'Advanced' as ExperienceLevel,
    title: 'Advanced',
    description: 'Experienced with various training methods',
    infoText: 'You\'re comfortable with complex movements and can handle high-intensity training sessions.'
  },
  {
    value: 'Expert' as ExperienceLevel,
    title: 'Expert',
    description: 'Highly experienced with advanced training',
    infoText: 'You have extensive experience and can handle the most challenging workout programs.'
  }
];

// Fitness goals options
export const fitnessGoals = [
  {
    value: 'Weight Loss',
    title: 'Weight Loss',
    icon: 'scalemass.fill',
    description: 'Burn fat and improve body composition'
  },
  {
    value: 'Muscle Gain',
    title: 'Muscle Gain',
    icon: 'dumbbell.fill',
    description: 'Build muscle mass and strength'
  },
  {
    value: 'Endurance',
    title: 'Endurance',
    icon: 'figure.run',
    description: 'Improve cardiovascular fitness and stamina'
  },
  {
    value: 'Strength',
    title: 'Strength',
    icon: 'flame.fill',
    description: 'Increase raw power and lifting capacity'
  },
  {
    value: 'General Fitness',
    title: 'General Fitness',
    icon: 'heart.fill',
    description: 'Maintain overall health and well-being'
  },
  {
    value: 'Athletic Performance',
    title: 'Athletic Performance',
    icon: 'trophy.fill',
    description: 'Enhance sport-specific skills and performance'
  }
];

// Equipment options
export const equipmentOptions = [
  {
    value: 'Full Gym' as EquipmentType,
    title: 'Full Gym',
    icon: 'figure.strengthtraining.functional',
    description: 'Access to a complete gym facility'
  },
  {
    value: 'Home Gym' as EquipmentType,
    title: 'Home Gym',
    icon: 'house.fill',
    description: 'Basic equipment at home'
  },
  {
    value: 'Dumbbells Only' as EquipmentType,
    title: 'Dumbbells Only',
    icon: 'dumbbell.fill',
    description: 'Just dumbbells available'
  },
  {
    value: 'Bodyweight Only' as EquipmentType,
    title: 'Bodyweight Only',
    icon: 'figure.run',
    description: 'No equipment, bodyweight exercises only'
  },
  {
    value: 'Cardio Equipment' as EquipmentType,
    title: 'Cardio Equipment',
    icon: 'figure.walk',
    description: 'Treadmill, bike, or other cardio machines'
  },
  {
    value: 'Resistance Bands' as EquipmentType,
    title: 'Resistance Bands',
    icon: 'bandage.fill',
    description: 'Resistance bands for strength training'
  },
  {
    value: 'Kettlebells' as EquipmentType,
    title: 'Kettlebells',
    icon: 'circle.fill',
    description: 'Kettlebells for functional training'
  },
  {
    value: 'Yoga Mat' as EquipmentType,
    title: 'Yoga Mat',
    icon: 'rectangle.fill',
    description: 'Yoga mat for floor exercises'
  }
];

// Workout time options
export const workoutTimeOptions = [
  'Early Morning (5-8 AM)',
  'Morning (8-11 AM)',
  'Lunch Time (11 AM-2 PM)',
  'Afternoon (2-5 PM)',
  'Evening (5-8 PM)',
  'Night (8-11 PM)'
];

// Motivation factors
export const motivationFactors = [
  'Health and Longevity',
  'Weight Management',
  'Stress Relief',
  'Confidence Building',
  'Athletic Performance',
  'Social Connection',
  'Energy and Vitality',
  'Mental Clarity',
  'Body Image',
  'Personal Challenge'
];

// Schedule flexibility options
export const scheduleFlexibilityOptions = [
  'Very Flexible',
  'Somewhat Flexible',
  'Not Flexible'
];

// Timeline options
export const timelineOptions = [
  '1-3 months',
  '3-6 months',
  '6-12 months',
  '1-2 years',
  'Long-term lifestyle change'
];
