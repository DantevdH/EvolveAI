/**
 * Onboarding Context for managing onboarding state and flow
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  OnboardingData, 
  OnboardingState, 
  OnboardingContextType, 
  OnboardingProgress,
  defaultOnboardingData,
  onboardingSteps
} from '../types/onboarding';
import { 
  validateStep, 
  canCompleteStep, 
  getCompletionPercentage 
} from '../utils/onboardingValidation';
import { sanitizeOnboardingData, formatForAPI } from '../utils/onboardingUtils';

// Action types
type OnboardingAction =
  | { type: 'UPDATE_DATA'; payload: Partial<OnboardingData> }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COMPLETE'; payload: boolean }
  | { type: 'SET_GENERATING_PLAN'; payload: boolean }
  | { type: 'RESET_ONBOARDING' }
  | { type: 'LOAD_PROGRESS'; payload: OnboardingData }
  | { type: 'UPDATE_PROGRESS' };

// Initial state
const initialState: OnboardingState = {
  data: defaultOnboardingData,
  progress: {
    currentStep: 1,
    totalSteps: onboardingSteps.length,
    completedSteps: [],
    isValid: false,
    canProceed: false,
    canGoBack: false
  },
  isLoading: false,
  error: null,
  isComplete: false,
  isGeneratingPlan: false
};

// Reducer
const onboardingReducer = (state: OnboardingState, action: OnboardingAction): OnboardingState => {
  switch (action.type) {
    case 'UPDATE_DATA':
      const updatedData = { ...state.data, ...action.payload };
      return {
        ...state,
        data: updatedData,
        error: null
      };
      
    case 'NEXT_STEP':
      const nextStep = Math.min(state.progress.currentStep + 1, state.progress.totalSteps);
      return {
        ...state,
        progress: {
          ...state.progress,
          currentStep: nextStep,
          canGoBack: nextStep > 1
        }
      };
      
    case 'PREVIOUS_STEP':
      const prevStep = Math.max(state.progress.currentStep - 1, 1);
      return {
        ...state,
        progress: {
          ...state.progress,
          currentStep: prevStep,
          canGoBack: prevStep > 1
        }
      };
      
    case 'GO_TO_STEP':
      const targetStep = Math.max(1, Math.min(action.payload, state.progress.totalSteps));
      return {
        ...state,
        progress: {
          ...state.progress,
          currentStep: targetStep,
          canGoBack: targetStep > 1
        }
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
      
    case 'SET_COMPLETE':
      return {
        ...state,
        isComplete: action.payload,
        isLoading: false
      };
      
    case 'SET_GENERATING_PLAN':
      return {
        ...state,
        isGeneratingPlan: action.payload,
        isLoading: action.payload
      };
      
    case 'RESET_ONBOARDING':
      return {
        ...initialState,
        progress: {
          ...initialState.progress,
          currentStep: 1
        }
      };
      
    case 'LOAD_PROGRESS':
      return {
        ...state,
        data: action.payload,
        error: null
      };
      
    case 'UPDATE_PROGRESS':
      const currentStepValid = canCompleteStep(state.progress.currentStep, state.data);
      const completedSteps = onboardingSteps
        .filter(step => canCompleteStep(step.id, state.data))
        .map(step => step.id);
      
      return {
        ...state,
        progress: {
          ...state.progress,
          completedSteps,
          isValid: currentStepValid,
          canProceed: currentStepValid && state.progress.currentStep < state.progress.totalSteps,
          canGoBack: state.progress.currentStep > 1
        }
      };
      
    default:
      return state;
  }
};

// Context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider
interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // Update progress whenever data changes
  useEffect(() => {
    dispatch({ type: 'UPDATE_PROGRESS' });
  }, [state.data]);

  // Auto-save progress
  useEffect(() => {
    const saveProgress = async () => {
      try {
        await AsyncStorage.setItem('onboarding_progress', JSON.stringify(state.data));
      } catch (error) {
        console.error('Failed to save onboarding progress:', error);
      }
    };

    // Debounce saves to avoid too frequent writes
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.data]);

  // Context methods
  const updateData = (updates: Partial<OnboardingData>) => {
    dispatch({ type: 'UPDATE_DATA', payload: updates });
  };

  const nextStep = () => {
    if (state.progress.canProceed) {
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  const previousStep = () => {
    if (state.progress.canGoBack) {
      dispatch({ type: 'PREVIOUS_STEP' });
    }
  };

  const goToStep = (step: number) => {
    dispatch({ type: 'GO_TO_STEP', payload: step });
  };

  const validateStep = (step: number): boolean => {
    return canCompleteStep(step, state.data);
  };

  const completeOnboarding = async (): Promise<boolean> => {
    try {
      console.log('🚀 Starting completeOnboarding...');
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('📊 Current onboarding data:', JSON.stringify(state.data, null, 2));
      console.log('📋 Total onboarding steps:', onboardingSteps.length);

      // Validate all steps
      console.log('🔍 Validating all steps...');
      const stepValidationResults = onboardingSteps.map(step => {
        const isValid = canCompleteStep(step.id, state.data);
        console.log(`Step ${step.id} (${step.title}): ${isValid ? '✅' : '❌'}`);
        return { step, isValid };
      });

      const allStepsValid = stepValidationResults.every(result => result.isValid);
      console.log('🎯 All steps valid:', allStepsValid);

      if (!allStepsValid) {
        // Debug: Log which steps are failing
        const failingSteps = stepValidationResults.filter(result => !result.isValid);
        console.error('❌ Failing onboarding steps:', failingSteps.map(result => ({
          id: result.step.id,
          title: result.step.title,
          validationRules: result.step.validationRules
        })));
        console.error('📊 Current onboarding data:', state.data);
        throw new Error('Please complete all required fields');
      }

      // Sanitize and format data
      const sanitizedData = sanitizeOnboardingData(state.data);
      const apiData = formatForAPI(sanitizedData);

      // Here you would typically send to your backend
      // For now, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear saved progress
      await AsyncStorage.removeItem('onboarding_progress');

      // Mark onboarding as complete in the context
      dispatch({ type: 'SET_COMPLETE', payload: true });
      
      // Note: The actual integration with AuthContext to mark onboarding complete
      // would be handled by the parent component or through a service call
      // For now, we'll just mark it complete in the onboarding context
      
      return true;

    } catch (error) {
      console.error('💥 Error in completeOnboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
      console.error('📝 Error message:', errorMessage);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
    }
  };

  const resetOnboarding = () => {
    dispatch({ type: 'RESET_ONBOARDING' });
  };

  const saveProgress = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem('onboarding_progress', JSON.stringify(state.data));
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      throw error;
    }
  };

  const loadProgress = async (): Promise<void> => {
    try {
      const savedProgress = await AsyncStorage.getItem('onboarding_progress');
      if (savedProgress) {
        const parsedData = JSON.parse(savedProgress);
        dispatch({ type: 'LOAD_PROGRESS', payload: parsedData });
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  };

  const setGeneratingPlan = (isGenerating: boolean) => {
    dispatch({ type: 'SET_GENERATING_PLAN', payload: isGenerating });
  };

  const contextValue: OnboardingContextType = {
    state,
    updateData,
    nextStep,
    previousStep,
    goToStep,
    validateStep,
    completeOnboarding,
    resetOnboarding,
    saveProgress,
    loadProgress,
    setGeneratingPlan
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Hook
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// Progress hook
export const useOnboardingProgress = () => {
  const { state } = useOnboarding();
  
  const progressPercentage = Math.round(
    (state.progress.completedSteps.length / state.progress.totalSteps) * 100
  );
  
  const currentStepInfo = onboardingSteps.find(step => step.id === state.progress.currentStep);
  
  const isFirstStep = state.progress.currentStep === 1;
  const isLastStep = state.progress.currentStep === state.progress.totalSteps;
  
  const canProceed = state.progress.canProceed && !state.isLoading;
  const canGoBack = state.progress.canGoBack && !state.isLoading;
  
  return {
    currentStep: state.progress.currentStep,
    totalSteps: state.progress.totalSteps,
    progressPercentage,
    currentStepInfo,
    isFirstStep,
    isLastStep,
    canProceed,
    canGoBack,
    completedSteps: state.progress.completedSteps,
    isValid: state.progress.isValid
  };
};
