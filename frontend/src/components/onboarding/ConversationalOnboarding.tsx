import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingBackground, ProgressOverlay } from './ui';
import { WelcomeStep } from '../../screens/onboarding/WelcomeStep';
import { PersonalInfoStep } from '../../screens/onboarding/PersonalInfoStep';
import { GoalDescriptionStep } from '../../screens/onboarding/GoalDescriptionStep';
import { ExperienceLevelStep } from '../../screens/onboarding/ExperienceLevelStep';
import { QuestionsStep } from '../../screens/onboarding/QuestionsStep';
import { ErrorDisplay } from '../ui/ErrorDisplay';
import { trainingService } from '../../services/onboardingService';
import {
  OnboardingState,
  PersonalInfo,
  AIQuestion,
  QuestionType,
} from '../../types/onboarding';
import { useAuth } from '../../context/AuthContext';
import { useProgressOverlay } from '../../hooks/useProgressOverlay';
import { supabase } from '../../config/supabase';
import { cleanUserProfileForResume, isValidFormattedResponse } from '../../utils/validation';
import { logStep, logData, logError, logNavigation } from '../../utils/logger';

const introTracker = {
  initial: false,
};

interface ConversationalOnboardingProps {
  onError: (error: string) => void;
  startFromStep?: 'welcome' | 'initial';
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onError,
  startFromStep = 'welcome',
}) => {
  const { state: authState, dispatch, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({
    username: '',
    usernameValid: false,
    personalInfo: null,
    personalInfoValid: false,
    goalDescription: '',
    goalDescriptionValid: false,
    experienceLevel: 'novice',
    experienceLevelValid: true,
    initialQuestions: [],
    initialResponses: new Map(),
    initialQuestionsLoading: false,
    currentInitialQuestionIndex: 0,
    initialAiMessage: undefined,
    initialIntroShown: introTracker.initial,
    // follow-up removed
    error: null,
  });

  const { progressState, runWithProgress } = useProgressOverlay();
  const [overlayTitle, setOverlayTitle] = useState<string>('Loading…');

  // Add retry state for error recovery
  const [retryCount, setRetryCount] = useState(0);
  const [retryStep, setRetryStep] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  // Determine starting step - either from prop or default to welcome
  const initialStep = startFromStep || 'welcome';
  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'experience' | 'initial'>(initialStep);

  // Track if we've initialized from profile (run only once per component mount)
  const hasInitializedFromProfileRef = useRef(false);

  // Initialize state based on existing user profile when starting from specific steps
  // IMPORTANT: Only runs ONCE on mount to prevent re-initialization when profile updates
  useEffect(() => {
    // Only run once per component mount
    if (hasInitializedFromProfileRef.current) {
      return;
    }

      if (authState.userProfile && startFromStep !== 'welcome') {
      hasInitializedFromProfileRef.current = true;
      
      // Clean and validate user profile data
      const cleanedProfile = cleanUserProfileForResume(authState.userProfile);
      
      if (!cleanedProfile) {
        console.error('Invalid user profile data, cannot resume onboarding');
        onError('Invalid user profile data. Please restart onboarding.');
        return;
      }
      
      // Set the correct current step based on startFromStep
      if (startFromStep === 'initial' || startFromStep === 'followup') {
        // 'followup' maps to 'initial' since follow-up feature is removed
        setCurrentStep('initial');
      }
      
      // Initialize with cleaned and validated profile data
      setState(prev => ({
        ...prev,
        username: cleanedProfile.username,
        usernameValid: true,
        personalInfo: {
          username: cleanedProfile.username,
          age: cleanedProfile.age,
          weight: cleanedProfile.weight,
          height: cleanedProfile.height,
          weight_unit: cleanedProfile.weight_unit,
          height_unit: cleanedProfile.height_unit,
          measurement_system: cleanedProfile.measurement_system as 'imperial' | 'metric',
          gender: cleanedProfile.gender,
          goal_description: cleanedProfile.goal_description,
        },
        personalInfoValid: true,
        goalDescription: cleanedProfile.goal_description,
        goalDescriptionValid: true,
        experienceLevel: cleanedProfile.experience_level,
        experienceLevelValid: true,
        // Load questions and responses from profile
        initialQuestions: cleanedProfile.initial_questions || [],
        initialResponses: cleanedProfile.initial_responses ? new Map(Object.entries(cleanedProfile.initial_responses)) : new Map(),
        
        // Load AI messages from database
        initialAiMessage: cleanedProfile.initial_ai_message,
        initialIntroShown: introTracker.initial,
      }));
      
      console.log(`📍 Onboarding Resume: Starting from ${startFromStep} - Initial: ${cleanedProfile.initial_questions?.length || 0} questions, Initial AI Message: ${cleanedProfile.initial_ai_message?.substring(0, 50) || 'NONE'}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Empty deps - only run on mount, ref prevents duplicate runs

  // Track if we've already triggered loading for each step
  const hasTriggeredInitialQuestionsRef = useRef(false);
  const previousStepRef = useRef<string | null>(null);

  // Reset trigger flags ONLY when step changes (not on every render)
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      if (currentStep === 'initial') {
        hasTriggeredInitialQuestionsRef.current = false;
      }
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Debug: log current step transitions to help trace why API calls may not fire
  useEffect(() => {
    console.log('[Onboarding] currentStep ->', currentStep);
  }, [currentStep]);

  // Step 1: Username and Gender
  const handleUsernameChange = useCallback((username: string) => {
    const isValid = username.trim().length >= 3;
    
    setState(prev => {
      // Initialize personalInfo with default gender if it doesn't exist
      const defaultPersonalInfo: PersonalInfo = {
        username: username.trim(),
        age: 25,
        weight: 70,
        height: 175,
        weight_unit: 'kg',
        height_unit: 'cm',
        measurement_system: 'metric',
        gender: prev.personalInfo?.gender || 'male', // Use existing gender or default to 'male'
        goal_description: prev.personalInfo?.goal_description || '',
      };
      
      return {
        ...prev,
        username,
        usernameValid: isValid,
        // Ensure personalInfo exists with default gender
        personalInfo: prev.personalInfo || defaultPersonalInfo,
      };
    });
  }, []);

  const handleGenderChange = useCallback((gender: 'male' | 'female' | 'other') => {
    setState(prev => {
      // If personalInfo doesn't exist, create it with default values
      const defaultPersonalInfo: PersonalInfo = {
        username: prev.username || '',
        age: 25,
        weight: 70,
        height: 175,
        weight_unit: 'kg',
        height_unit: 'cm',
        measurement_system: 'metric',
        gender: 'male',
        goal_description: '',
      };
      
      return {
        ...prev,
        personalInfo: prev.personalInfo ? {
          ...prev.personalInfo,
          gender,
        } : {
          ...defaultPersonalInfo,
          gender,
        },
      };
    });
  }, []);

  const handleWelcomeNext = useCallback(() => {
    if (!state.usernameValid) {
      Alert.alert('Error', 'Please enter a valid username (3-20 characters)');
      return;
    }
    
    // Ensure personalInfo exists with default gender 'male' if not set
    setState(prev => {
      if (!prev.personalInfo || !prev.personalInfo.gender) {
        const defaultPersonalInfo: PersonalInfo = {
          username: prev.username || '',
          age: 25,
          weight: 70,
          height: 175,
          weight_unit: 'kg',
          height_unit: 'cm',
          measurement_system: 'metric',
          gender: 'male', // Default to 'male'
          goal_description: '',
        };
        
        return {
          ...prev,
          personalInfo: prev.personalInfo || defaultPersonalInfo,
        };
      }
      return prev;
    });
    
    setCurrentStep('personal');
  }, [state.usernameValid]);

  // Step 2: Personal Info
  const handlePersonalInfoChange = useCallback((personalInfo: PersonalInfo) => {
    const isValid = 
      personalInfo.age > 0 && 
      personalInfo.weight > 0 && 
      personalInfo.height > 0 && 
      personalInfo.gender.trim().length > 0;
    
    setState(prev => ({
      ...prev,
      personalInfo,
      personalInfoValid: isValid,
    }));
  }, []);

  const handlePersonalInfoNext = useCallback(() => {
    if (!state.personalInfo || !state.personalInfoValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setCurrentStep('goal');
  }, [state.personalInfo, state.personalInfoValid]);

  // Step 3: Goal Description
  const handleGoalDescriptionChange = useCallback((goalDescription: string) => {
    const isValid = goalDescription.trim().length >= 10;
    
    setState(prev => ({
      ...prev,
      goalDescription,
      goalDescriptionValid: isValid,
    }));
  }, []);

  const handleGoalDescriptionNext = useCallback(() => {
    if (!state.goalDescriptionValid) {
      Alert.alert('Error', 'Please describe your training goal (at least 10 characters)');
      return;
    }
    setCurrentStep('experience');
  }, [state.goalDescriptionValid]);

  // Step 4: Experience Level
  const handleExperienceLevelChange = useCallback((experienceLevel: string) => {
    const isValid = experienceLevel.trim().length > 0;
    
    setState(prev => ({
      ...prev,
      experienceLevel,
      experienceLevelValid: isValid,
    }));
  }, []);

  const handleExperienceLevelNext = useCallback(() => {
    // Simply move to initial questions step
    console.log('[Onboarding] experience completed -> moving to initial questions');
    setCurrentStep('initial');
  }, []);

  // Simple function to load initial questions
  const loadInitialQuestions = useCallback(async () => {
    if (!state.personalInfo) {
      return;
    }
    console.log('[Onboarding] loadInitialQuestions called');
    setOverlayTitle('Analyzing your profile…');
    setState(prev => ({
      ...prev,
      initialQuestionsLoading: true,
    }));

    try {
      const fullPersonalInfo = {
        ...state.personalInfo,
        username: state.username,
        goal_description: state.goalDescription,
        experience_level: state.experienceLevel,
      };

      const jwtToken = authState.session?.access_token;

      const response = await runWithProgress('initial', () =>
        trainingService.getInitialQuestions(
          fullPersonalInfo,
          authState.userProfile?.id,
          jwtToken
        )
      );

      if (response.user_profile_id && response.user_profile_id !== authState.userProfile?.id) {
        if (authState.userProfile) {
          dispatch({
            type: 'SET_USER_PROFILE',
            payload: { ...authState.userProfile, id: response.user_profile_id },
          });
        } else {
          await refreshUserProfile();
        }
      }

      const sortedQuestions = [...(response.questions || [])].sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });

      setState(prev => ({
        ...prev,
        initialQuestions: sortedQuestions,
        initialQuestionsLoading: false,
        currentInitialQuestionIndex: 0,
        initialAiMessage: response.ai_message,
      }));
      if (authState.userProfile) {
        dispatch({
          type: 'SET_USER_PROFILE',
          payload: {
            ...authState.userProfile,
            initial_questions: sortedQuestions,
          },
        });
      }
      setRetryStep(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load questions';
      setState(prev => ({
        ...prev,
        initialQuestionsLoading: false,
        error: errorMessage,
      }));
      setRetryStep('initial');
      onError(errorMessage);
    } finally {
      setOverlayTitle('Loading…');
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, authState.session?.access_token, authState.userProfile, runWithProgress, dispatch, refreshUserProfile, onError]);

  // follow-up flow removed: feature deprecated and handled outside this flow

  // Load questions when step changes to 'initial'
  useEffect(() => {
    if (currentStep === 'initial' &&
        state.initialQuestions.length === 0 &&
        !state.initialQuestionsLoading &&
        !hasTriggeredInitialQuestionsRef.current) {
      hasTriggeredInitialQuestionsRef.current = true;
      loadInitialQuestions();
    }
  }, [currentStep, state.initialQuestions.length, state.initialQuestionsLoading, loadInitialQuestions]);

  // Follow-up flow removed; no effect required.

  // Simple step progression functions
  const handleInitialQuestionsComplete = useCallback(() => {
    // Save initial responses to user profile context and navigate to plan generation.
    const initialResponsesObject = Object.fromEntries(state.initialResponses);
    if (authState.userProfile) {
      dispatch({
        type: 'SET_USER_PROFILE',
        payload: {
          ...authState.userProfile,
          initial_responses: initialResponsesObject,
        },
      });
      console.log('📍 Onboarding: Initial responses saved to context. Routing to plan generation.');
    }
    // Navigate to plan generation screen
    try {
      router.push('/generate-plan');
    } catch (err) {
      console.warn('Navigation to generate-plan failed:', err);
    }
  }, [state.initialResponses, authState.userProfile, dispatch, router]);

  // follow-up removed

  // Step 2: Initial Questions
  const handleInitialResponseChange = useCallback((questionId: string, value: any) => {
    setState(prev => {
      const newResponses = new Map(prev.initialResponses);
      newResponses.set(questionId, value);
      return {
        ...prev,
        initialResponses: newResponses,
      };
    });
  }, []);

  // follow-up removed


  // Navigation handlers
  const handlePrevious = useCallback(() => {
    switch (currentStep) {
      case 'welcome':
        // Can't go back from welcome
        break;
      case 'personal':
        setCurrentStep('welcome');
        break;
      case 'goal':
        setCurrentStep('personal');
        break;
      case 'experience':
        setCurrentStep('goal');
        break;
      case 'initial':
        setCurrentStep('experience');
        break;
      default:
        break;
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      const stepName = retryStep || currentStep;
      const stepDescriptions: Record<string, string> = {
        initial: 'initial questions',
      };

      setState(prev => ({
        ...prev,
        error: `We've tried ${MAX_RETRIES} times to load your ${stepDescriptions[stepName] || 'onboarding step'} but encountered an error. Please try again later or contact support.`
      }));
      return;
    }

    setRetryCount(prev => prev + 1);
    setState(prev => ({ ...prev, error: null }));

    const stepToRetry = retryStep || currentStep;

    switch (stepToRetry) {
      case 'welcome':
        break;
      case 'personal':
        handleWelcomeNext();
        break;
      case 'goal':
        handlePersonalInfoNext();
        break;
      case 'experience':
        handleGoalDescriptionNext();
        break;
      case 'initial':
        loadInitialQuestions();
        break;
      default:
        break;
    }
  }, [currentStep, retryCount, retryStep, handleWelcomeNext, handlePersonalInfoNext, handleGoalDescriptionNext, loadInitialQuestions, router]);

  // Handle start over action
  const handleStartOver = useCallback(() => {
    setRetryCount(0);
    setRetryStep(null);
    setState(prev => ({ ...prev, error: null }));
    setCurrentStep('welcome');
  }, []);

  const renderCurrentStep = () => {
    // Show custom error display for max retries or other global errors
    if (state.error && retryCount >= MAX_RETRIES) {
      return (
        <View style={styles.errorContainer}>
          <ErrorDisplay
            error={state.error}
            onRetry={handleStartOver}
            variant="server"
            showRetry={true}
          />
        </View>
      );
    }
    
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            username={state.username}
            onUsernameChange={handleUsernameChange}
            gender={(state.personalInfo?.gender || 'male') as 'male' | 'female' | 'other'}
            onGenderChange={handleGenderChange}
            onNext={handleWelcomeNext}
            isValid={state.usernameValid}
            error={state.error || undefined}
          />
        );
      
      case 'personal':
        return (
          <PersonalInfoStep
            personalInfo={state.personalInfo}
            onPersonalInfoChange={handlePersonalInfoChange}
            isValid={state.personalInfoValid}
            onNext={handlePersonalInfoNext}
            onPrevious={handlePrevious}
            onBack={handlePrevious}
            onComplete={() => {}}
            isLoading={false}
            error={state.error || undefined}
          />
        );
      
      case 'goal':
        return (
          <GoalDescriptionStep
            goalDescription={state.goalDescription}
            onGoalDescriptionChange={handleGoalDescriptionChange}
            isValid={state.goalDescriptionValid}
            onNext={handleGoalDescriptionNext}
            onPrevious={handlePrevious}
            onBack={handlePrevious}
            onComplete={() => {}}
            isLoading={false}
            error={state.error || undefined}
          />
        );
      
      case 'experience':
        return (
          <ExperienceLevelStep
            experienceLevel={state.experienceLevel}
            onExperienceLevelChange={handleExperienceLevelChange}
            isValid={state.experienceLevelValid}
            onNext={handleExperienceLevelNext}
            onPrevious={handlePrevious}
            onBack={handlePrevious}
            onComplete={() => {}}
            isLoading={false}
            error={state.error || undefined}
          />
        );
      
      case 'initial':
        return (
          <QuestionsStep
            questions={state.initialQuestions}
            responses={state.initialResponses}
            onResponseChange={handleInitialResponseChange}
            currentQuestionIndex={state.currentInitialQuestionIndex}
            totalQuestions={state.initialQuestions.length}
            onNext={handleInitialQuestionsComplete}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Initial Questions"
            username={state.username}
            aiMessage={state.initialAiMessage}
            introAlreadyCompleted={state.initialIntroShown}
            onIntroComplete={() => {
              introTracker.initial = true;
              setState(prev => ({
                ...prev,
                initialIntroShown: true,
              }));
            }}
          />
        );
      
      /* follow-up removed */
      
      default:
        return null;
    }
  };

  const lastResetStepRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentStep === 'welcome' && lastResetStepRef.current !== 'welcome') {
      introTracker.initial = false;
      lastResetStepRef.current = 'welcome';
      setState(prev => {
        if (!prev.initialIntroShown) {
          return prev;
        }
        return {
          ...prev,
          initialIntroShown: false,
        };
      });
    } else if (currentStep !== 'welcome') {
      lastResetStepRef.current = currentStep;
    }
  }, [currentStep]);

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <ProgressOverlay
        visible={progressState.visible}
        progress={progressState.progress}
        title={overlayTitle}
      />
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
