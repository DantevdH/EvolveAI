import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { OnboardingBackground } from './OnboardingBackground';
import { WelcomeStep } from '../../screens/onboarding/WelcomeStep';
import { PersonalInfoStep } from '../../screens/onboarding/PersonalInfoStep';
import { GoalDescriptionStep } from '../../screens/onboarding/GoalDescriptionStep';
import { ExperienceLevelStep } from '../../screens/onboarding/ExperienceLevelStep';
import { QuestionsStep } from '../../screens/onboarding/QuestionsStep';
import PlanPreviewStep from '../../screens/onboarding/PlanPreviewStep';
import { ProgressOverlay } from './ProgressOverlay';
import { ErrorDisplay } from '../ui/ErrorDisplay';
import { trainingService } from '../../services/onboardingService';
import {
  OnboardingState,
  PersonalInfo,
  AIQuestion,
} from '../../types/onboarding';
import { useAuth } from '../../context/AuthContext';
import { useProgressOverlay } from '../../hooks/useProgressOverlay';
import { supabase } from '../../config/supabase';
import { cleanUserProfileForResume, isValidFormattedResponse } from '../../utils/validation';
import { logStep, logData, logError, logNavigation } from '../../utils/logger';

const introTracker = {
  initial: false,
  followup: false,
};

interface ConversationalOnboardingProps {
  onComplete: (trainingPlan: any) => Promise<void>;
  onError: (error: string) => void;
  startFromStep?: 'welcome' | 'initial' | 'followup';
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onComplete,
  onError,
  startFromStep = 'welcome',
}) => {
  const { state: authState, dispatch, refreshUserProfile, setTrainingPlan, setExercises } = useAuth();
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
    followUpQuestions: [],
    followUpResponses: new Map(),
    followUpQuestionsLoading: false,
    currentFollowUpQuestionIndex: 0,
    followUpAiMessage: undefined,
    followUpIntroShown: introTracker.followup,
    planGenerationLoading: false,
    trainingPlan: null,
    completionMessage: null,
    hasSeenCompletionMessage: false,
    error: null,
    planMetadata: undefined,
  });

  const { progressState, runWithProgress } = useProgressOverlay();

  // Add retry state for error recovery
  const [retryCount, setRetryCount] = useState(0);
  const [retryStep, setRetryStep] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  // Determine starting step - either from prop or default to welcome
  const initialStep = startFromStep || 'welcome';
  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'experience' | 'initial' | 'followup' | 'preview'>(initialStep);

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
      if (startFromStep === 'initial') {
        setCurrentStep('initial');
      } else if (startFromStep === 'followup') {
        setCurrentStep('followup');
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
        followUpQuestions: cleanedProfile.follow_up_questions || [],
        initialResponses: cleanedProfile.initial_responses ? new Map(Object.entries(cleanedProfile.initial_responses)) : new Map(),
        followUpResponses: cleanedProfile.follow_up_responses ? new Map(Object.entries(cleanedProfile.follow_up_responses)) : new Map(),
        
        // Load AI messages from database
        initialAiMessage: cleanedProfile.initial_ai_message,
        followUpAiMessage: cleanedProfile.follow_up_ai_message,
        initialIntroShown: introTracker.initial,
        followUpIntroShown: introTracker.followup,
      }));
      
      console.log(`📍 Onboarding Resume: Starting from ${startFromStep} - Initial: ${cleanedProfile.initial_questions?.length || 0} questions, Follow-up: ${cleanedProfile.follow_up_questions?.length || 0} questions, Initial AI Message: ${cleanedProfile.initial_ai_message?.substring(0, 50) || 'NONE'}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Empty deps - only run on mount, ref prevents duplicate runs

  // Check if user has a plan but hasn't accepted it yet - show preview step
  useEffect(() => {
    if (authState.userProfile && authState.trainingPlan && !authState.userProfile.planAccepted) {
      console.log('📍 Onboarding: User has plan but not accepted - showing preview step');
      
      // Extract AI message from training plan
      const aiMessageFromPlan = (authState.trainingPlan as any)?.aiMessage || 
        (authState.trainingPlan as any)?.ai_message;
      
      console.log(`📍 Onboarding: AI message from plan: ${aiMessageFromPlan ? aiMessageFromPlan.substring(0, 50) + '...' : 'NONE - using fallback'}`);
      
      setCurrentStep('preview');
      
      // Load the training plan AND questions/responses from profile into state
      setState(prev => ({
        ...prev,
        trainingPlan: authState.trainingPlan,
        // Load questions and responses from user profile (Option 2: user resumes later)
        initialQuestions: authState.userProfile?.initial_questions || prev.initialQuestions,
        followUpQuestions: authState.userProfile?.follow_up_questions || prev.followUpQuestions,
        initialResponses: authState.userProfile?.initial_responses ? 
          new Map(Object.entries(authState.userProfile.initial_responses)) : prev.initialResponses,
        followUpResponses: authState.userProfile?.follow_up_responses ? 
          new Map(Object.entries(authState.userProfile.follow_up_responses)) : prev.followUpResponses,
        planMetadata: {
          formattedInitialResponses: authState.userProfile?.initial_responses ? 
            Object.entries(authState.userProfile.initial_responses)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n') : '',
          formattedFollowUpResponses: authState.userProfile?.follow_up_responses ? 
            Object.entries(authState.userProfile.follow_up_responses)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n') : '',
        },
      }));
    }
  }, [authState.userProfile, authState.trainingPlan]);

  // Track if we've already triggered loading for each step
  const hasTriggeredInitialQuestionsRef = useRef(false);
  const hasTriggeredFollowUpQuestionsRef = useRef(false);
  const previousStepRef = useRef<string | null>(null);

  // Reset trigger flags ONLY when step changes (not on every render)
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      if (currentStep === 'initial') {
        hasTriggeredInitialQuestionsRef.current = false;
      } else if (currentStep === 'followup') {
        hasTriggeredFollowUpQuestionsRef.current = false;
      }
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

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

  // Load follow-up questions when step changes to 'followup'
  useEffect(() => {
    if (currentStep === 'followup' &&
        state.followUpQuestions.length === 0 &&
        !state.followUpQuestionsLoading &&
        !hasTriggeredFollowUpQuestionsRef.current) {
      hasTriggeredFollowUpQuestionsRef.current = true;
      loadFollowUpQuestions();
    }
  }, [currentStep, state.followUpQuestions.length, state.followUpQuestionsLoading, loadFollowUpQuestions]);

  const planGenerationInProgressRef = useRef(false);

  const handlePlanGeneration = useCallback(async () => {
    if (planGenerationInProgressRef.current) {
      return;
    }

    if (!state.personalInfo) {
      logError('Plan Generation: Missing personal info');
      return;
    }

    planGenerationInProgressRef.current = true;

    setState(prev => ({
      ...prev,
      planGenerationLoading: true,
    }));

    try {
      const jwtToken = authState.session?.access_token;
      if (!jwtToken) {
        throw new Error('JWT token is missing - cannot generate training plan');
      }

      const effectiveUserProfileId = authState.userProfile?.id;
      if (!effectiveUserProfileId) {
        throw new Error('User profile not found. Please complete initial questions first.');
      }

      const fullPersonalInfo = {
        ...state.personalInfo,
        username: state.username,
        goal_description: state.goalDescription,
        experience_level: state.experienceLevel,
      };

      const initialResponsesObject = Object.fromEntries(state.initialResponses);
      const followUpResponsesObject = Object.fromEntries(state.followUpResponses);

      const response = await runWithProgress('plan', () =>
        trainingService.generateTrainingPlan(
          fullPersonalInfo,
          initialResponsesObject,
          followUpResponsesObject,
          state.initialQuestions,
          state.followUpQuestions,
          effectiveUserProfileId,
          jwtToken
        )
      );

      logData('Generate Plan', response.success ? 'success' : 'error');

      if (response.success && response.data) {
        const { transformTrainingPlan } = await import('../../utils/trainingPlanTransformer');
        const transformedPlan = transformTrainingPlan(response.data);

        if (response.playbook && authState.userProfile) {
          dispatch({
            type: 'SET_USER_PROFILE',
            payload: {
              ...authState.userProfile,
              playbook: response.playbook,
            },
          });
        }

        setTrainingPlan(transformedPlan);

        if (response.metadata?.exercises) {
          setExercises(response.metadata.exercises);
        }

        setState(prev => ({
          ...prev,
          trainingPlan: transformedPlan,
          completionMessage:
            response.completion_message ||
            "🎉 Amazing! I've created your personalized plan! We work in focused 2-week blocks so we can track your progress and adapt as you grow stronger. Take a look at your plan - I'm curious what you think! 💪✨",
          planGenerationLoading: false,
          hasSeenCompletionMessage: false,
          planMetadata: {
            formattedInitialResponses: response.metadata?.formatted_initial_responses,
            formattedFollowUpResponses: response.metadata?.formatted_follow_up_responses,
          },
        }));

        setRetryStep(null);
        setCurrentStep('preview');
      } else {
        throw new Error(response.message || 'Failed to generate training plan');
      }
    } catch (error) {
      logError('Plan generation error', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate training plan';
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        error: errorMessage,
      }));
      setRetryStep('preview');
      onError(errorMessage);
    } finally {
      planGenerationInProgressRef.current = false;
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.initialResponses, state.followUpResponses, state.initialQuestions, state.followUpQuestions, authState.session?.access_token, authState.userProfile, runWithProgress, dispatch, setTrainingPlan, setExercises, onError]);

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
    setCurrentStep('initial');
  }, []);

  // Simple function to load initial questions
  const loadInitialQuestions = useCallback(async () => {
    if (!state.personalInfo) {
      return;
    }

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
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, authState.session?.access_token, authState.userProfile, runWithProgress, dispatch, refreshUserProfile, onError]);

  // Simple function to load follow-up questions
  const loadFollowUpQuestions = useCallback(async () => {
    if (!state.personalInfo) {
      return;
    }

    setState(prev => ({
      ...prev,
      followUpQuestionsLoading: true,
    }));

    try {
      const responsesObject = Object.fromEntries(state.initialResponses);
      const jwtToken = authState.session?.access_token;

      const fullPersonalInfo = {
        ...state.personalInfo,
        username: state.username,
        goal_description: state.goalDescription,
        experience_level: state.experienceLevel,
      };

      const response = await runWithProgress('followup', () =>
        trainingService.getFollowUpQuestions(
          fullPersonalInfo,
          responsesObject,
          state.initialQuestions,
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

      const sortedFollowUpQuestions = [...(response.questions || [])].sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });

      setState(prev => ({
        ...prev,
        followUpQuestions: sortedFollowUpQuestions,
        followUpQuestionsLoading: false,
        currentFollowUpQuestionIndex: 0,
        aiHasQuestions: true,
        followUpAiMessage: response.ai_message,
      }));
      setRetryStep(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load follow-up questions';
      setState(prev => ({
        ...prev,
        followUpQuestionsLoading: false,
        error: errorMessage,
      }));
      setRetryStep('followup');
      onError(errorMessage);
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.initialResponses, state.initialQuestions, authState.session?.access_token, authState.userProfile, runWithProgress, dispatch, refreshUserProfile, onError]);

  // Simple step progression functions
  const handleInitialQuestionsComplete = useCallback(() => {
    setCurrentStep('followup');
  }, []);

  const handleFollowUpQuestionsComplete = useCallback(() => {
    handlePlanGeneration();
  }, [handlePlanGeneration]);

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

  // Step 3: Follow-up Questions
  const handleFollowUpResponseChange = useCallback((questionId: string, value: any) => {
    setState(prev => {
      const newResponses = new Map(prev.followUpResponses);
      newResponses.set(questionId, value);
      return {
        ...prev,
        followUpResponses: newResponses,
      };
    });
  }, []);


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
      case 'followup':
        setCurrentStep('initial');
        break;
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      const stepName = retryStep || currentStep;
      const stepDescriptions: Record<string, string> = {
        initial: 'initial questions',
        followup: 'follow-up questions',
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
      case 'followup':
        loadFollowUpQuestions();
        break;
      case 'preview':
        handlePlanGeneration();
        break;
      default:
        break;
    }
  }, [currentStep, retryCount, retryStep, handleWelcomeNext, handlePersonalInfoNext, handleGoalDescriptionNext, handlePlanGeneration, loadInitialQuestions, loadFollowUpQuestions]);

  // Handle start over action
  const handleStartOver = useCallback(() => {
    setRetryCount(0);
    setRetryStep(null);
    setState(prev => ({ ...prev, error: null }));
    setCurrentStep('welcome');
  }, []);

  // Handle completion of onboarding
  const handleComplete = useCallback(() => {
    console.log('📍 Onboarding: Completing onboarding flow');
    if (state.trainingPlan) {
      onComplete(state.trainingPlan);
    }
  }, [state.trainingPlan, onComplete]);


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
      
      case 'followup':
        return (
          <QuestionsStep
            questions={state.followUpQuestions}
            responses={state.followUpResponses}
            onResponseChange={handleFollowUpResponseChange}
            currentQuestionIndex={state.currentFollowUpQuestionIndex}
            totalQuestions={state.followUpQuestions.length}
            onNext={handleFollowUpQuestionsComplete}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Follow-up Questions"
            username={state.username}
            aiMessage={state.followUpAiMessage}
            introAlreadyCompleted={state.followUpIntroShown}
            onIntroComplete={() => {
              introTracker.followup = true;
              setState(prev => ({
                ...prev,
                followUpIntroShown: true,
              }));
            }}
          />
        );
      
      case 'preview':
        return (
          <PlanPreviewStep
            onContinue={handleComplete}
            onBack={() => setCurrentStep('followup')}
            planMetadata={state.planMetadata}
            initialQuestions={state.initialQuestions}
            initialResponses={state.initialResponses}
            followUpQuestions={state.followUpQuestions}
            followUpResponses={state.followUpResponses}
          />
        );
      
      default:
        return null;
    }
  };

  const lastResetStepRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentStep === 'welcome' && lastResetStepRef.current !== 'welcome') {
      introTracker.initial = false;
      introTracker.followup = false;
      lastResetStepRef.current = 'welcome';
      setState(prev => {
        if (!prev.initialIntroShown && !prev.followUpIntroShown) {
          return prev;
        }
        return {
          ...prev,
          initialIntroShown: false,
          followUpIntroShown: false,
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
