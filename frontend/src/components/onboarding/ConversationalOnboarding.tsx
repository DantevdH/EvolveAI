import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { OnboardingBackground } from './OnboardingBackground';
import { WelcomeStep } from '../../screens/onboarding/WelcomeStep';
import { PersonalInfoStep } from '../../screens/onboarding/PersonalInfoStep';
import { GoalDescriptionStep } from '../../screens/onboarding/GoalDescriptionStep';
import { ExperienceLevelStep } from '../../screens/onboarding/ExperienceLevelStep';
import { QuestionsStep } from '../../screens/onboarding/QuestionsStep';
import { PlanGenerationStep } from '../../screens/onboarding/PlanGenerationStep';
import PlanPreviewStep from '../../screens/onboarding/PlanPreviewStep';
import { ErrorDisplay } from '../ui/ErrorDisplay';
import { trainingService } from '../../services/onboardingService';
import { 
  OnboardingState, 
  PersonalInfo, 
  AIQuestion,
} from '../../types/onboarding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { UserService } from '../../services/userService';
import { cleanUserProfileForResume, isValidFormattedResponse } from '../../utils/validation';
import { logStep, logData, logError, logNavigation } from '../../utils/logger';

interface ConversationalOnboardingProps {
  onComplete: (trainingPlan: any) => Promise<void>;
  onError: (error: string) => void;
  startFromStep?: 'welcome' | 'initial' | 'followup' | 'generation';
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onComplete,
  onError,
  startFromStep = 'welcome',
}) => {
  const { state: authState, refreshUserProfile, setTrainingPlan, setExercises } = useAuth();
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
    followUpQuestions: [],
    followUpResponses: new Map(),
    followUpQuestionsLoading: false,
    currentFollowUpQuestionIndex: 0,
    followUpAiMessage: undefined,
    planGenerationLoading: false,
    trainingPlan: null,
    completionMessage: null,
    hasSeenCompletionMessage: false,
    error: null,
    aiHasQuestions: false,
    aiAnalysisPhase: null,
    planMetadata: undefined,
  });

  // Add retry state for error recovery
  const [retryCount, setRetryCount] = useState(0);
  const [retryStep, setRetryStep] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  // Configurable AI thinking delays (can be made environment-specific)
  const AI_DELAYS = {
    initialQuestions: 2000,    // 2 seconds for initial questions
    followUpQuestions: 2000,   // 2 seconds for follow-up questions
    planGeneration: 3000,      // 3 seconds for final plan generation
  };

  // Determine starting step - either from prop or default to welcome
  const initialStep = startFromStep || 'welcome';
  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'experience' | 'initial' | 'followup' | 'generation' | 'preview'>(initialStep);

  // Track if we've initialized from profile (run only once per component mount)
  const hasInitializedFromProfileRef = useRef(false);

  // Initialize state based on existing user profile when starting from specific steps
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
      } else if (startFromStep === 'generation') {
        setCurrentStep('generation');
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
      }));
      
      console.log(`📍 Onboarding Resume: Starting from ${startFromStep} - Initial: ${cleanedProfile.initial_questions?.length || 0} questions, Follow-up: ${cleanedProfile.follow_up_questions?.length || 0} questions, Initial AI Message: ${cleanedProfile.initial_ai_message?.substring(0, 50) || 'NONE'}`);
    }
  }, [authState.userProfile, startFromStep, onError]);

  // Check if user has a plan but hasn't accepted it yet - show preview step
  useEffect(() => {
    if (authState.userProfile && authState.trainingPlan && !authState.userProfile.planAccepted) {
      console.log('📍 Onboarding: User has plan but not accepted - showing preview step');
      
      // Extract AI message from training plan
      const aiMessageFromPlan = (authState.trainingPlan as any)?.aiMessage || 
        (authState.trainingPlan as any)?.ai_message;
      
      console.log(`📍 Onboarding: AI message from plan: ${aiMessageFromPlan ? aiMessageFromPlan.substring(0, 50) + '...' : 'NONE - using fallback'}`);
      
      setCurrentStep('preview');
      
      // Load the training plan into state
      setState(prev => ({
        ...prev,
        trainingPlan: authState.trainingPlan,
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
  const hasTriggeredPlanGenerationRef = useRef(false);
  const previousStepRef = useRef<string | null>(null);

  // Reset trigger flags ONLY when step changes (not on every render)
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      if (currentStep === 'initial') {
        hasTriggeredInitialQuestionsRef.current = false;
      } else if (currentStep === 'followup') {
        hasTriggeredFollowUpQuestionsRef.current = false;
      } else if (currentStep === 'generation') {
        hasTriggeredPlanGenerationRef.current = false;
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
  }, [currentStep, state.initialQuestions.length, state.initialQuestionsLoading]);

  // Load follow-up questions when step changes to 'followup'
  useEffect(() => {
    if (currentStep === 'followup' && 
        state.followUpQuestions.length === 0 && 
        !state.followUpQuestionsLoading && 
        !hasTriggeredFollowUpQuestionsRef.current) {
      hasTriggeredFollowUpQuestionsRef.current = true;
      loadFollowUpQuestions();
    }
  }, [currentStep, state.followUpQuestions.length, state.followUpQuestionsLoading]);

  // Auto-trigger plan generation when we have all required data
  useEffect(() => {
    if (currentStep === 'generation' && 
        state.personalInfo && 
        !state.planGenerationLoading && 
        !state.trainingPlan && 
        !state.error &&
        !hasTriggeredPlanGenerationRef.current) {
      console.log('🚀 Auto-triggering plan generation with complete state');
      hasTriggeredPlanGenerationRef.current = true;
      handlePlanGeneration();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, state.personalInfo, state.planGenerationLoading, state.trainingPlan, state.error]);

  // Track plan generation in progress to prevent race conditions
  const planGenerationRef = useRef<{ inProgress: boolean; timeoutId?: ReturnType<typeof setTimeout> }>({ inProgress: false });

  // Handle plan generation (extracted from handleOutlineNext)
  const handlePlanGeneration = useCallback(() => {
    logStep('Plan Generation', 'started');
    
    if (!state.personalInfo) {
      logError('Plan Generation: Missing personal info');
      return;
    }

    // Prevent duplicate calls
    if (planGenerationRef.current.inProgress) {
      logError('Plan Generation: Already in progress');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'generation'
    }));

    // Mark as in progress
    planGenerationRef.current.inProgress = true;
  }, [state.personalInfo]);

  // useEffect to handle plan generation with proper cleanup
  useEffect(() => {
    if (!state.planGenerationLoading || !planGenerationRef.current.inProgress) {
      return;
    }

    // Clear any existing timeout
    if (planGenerationRef.current.timeoutId) {
      clearTimeout(planGenerationRef.current.timeoutId);
    }

    // Set timeout for AI thinking simulation
    const timeoutId = setTimeout(async () => {
      try {
        // Check if component is still mounted and still in loading state
        if (!planGenerationRef.current.inProgress) {
          return;
        }

        // Get JWT token from AuthContext state
        const jwtToken = authState.session?.access_token;
        
        if (!jwtToken) {
          throw new Error('JWT token is missing - cannot generate training plan');
        }
        
        // Get raw responses - backend will handle formatting
        const initialResponses = Object.fromEntries(state.initialResponses);
        const followUpResponses = Object.fromEntries(state.followUpResponses);
        
        const fullPersonalInfo = {
          ...state.personalInfo!,
          username: state.username,
          goal_description: state.goalDescription,
          experience_level: state.experienceLevel,
        };
        
        const response = await trainingService.generateTrainingPlan(
          fullPersonalInfo,
          initialResponses,
          followUpResponses,
          state.initialQuestions,
          state.followUpQuestions,
          authState.userProfile?.id,
          jwtToken
        );
        
        // Check again if still in progress (component might have unmounted)
        if (!planGenerationRef.current.inProgress) {
          return;
        }
        
        logData('Generate Plan', response.success ? 'success' : 'error');
        
        if (response.success && response.data) {
          // Backend now returns the complete enriched plan with database IDs
          // Transform from backend format (snake_case) to frontend format (camelCase)
          logStep('Plan Generation', 'completed', 'Training plan received from backend with database IDs');
          console.log('✅ ConversationalOnboarding: Using enriched plan from backend (no refetch needed)');
          
          // Transform the plan from backend format to frontend format
          const { transformTrainingPlan } = await import('../../utils/trainingPlanTransformer');
          const transformedPlan = transformTrainingPlan(response.data);
          console.log('✅ ConversationalOnboarding: Transformed plan to frontend format');
              
          // Set plan in AuthContext - already has all database IDs
          setTrainingPlan(transformedPlan);
              
          // Store exercises in AuthContext for future use
          if (response.metadata?.exercises) {
            setExercises(response.metadata.exercises);
          }
              
          // Stop spinner and show plan
          setState(prev => ({
            ...prev,
            trainingPlan: transformedPlan,
            completionMessage: response.completion_message || "🎉 Amazing! I've created your personalized plan! We work in focused 2-week blocks so we can track your progress and adapt as you grow stronger. Take a look at your plan - I'm curious what you think! 💪✨",
            planGenerationLoading: false,
            planMetadata: {
              formattedInitialResponses: response.metadata?.formatted_initial_responses,
              formattedFollowUpResponses: response.metadata?.formatted_follow_up_responses,
            },
          }));
          
          // Automatically transition to preview/feedback step (skip completion message)
          setCurrentStep('preview');
          
          // Reset in progress flag
          planGenerationRef.current.inProgress = false;
        } else {
          logError('Plan generation failed', response.message);
          throw new Error(response.message || 'Failed to generate training plan');
        }
      } catch (error) {
        // Only update state if still in progress (component still mounted)
        if (planGenerationRef.current.inProgress) {
          logError('Plan generation error', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate training plan';
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            aiAnalysisPhase: null,
            error: errorMessage,
          }));
          onError(errorMessage);
          planGenerationRef.current.inProgress = false;
        }
      }
    }, AI_DELAYS.planGeneration);

    planGenerationRef.current.timeoutId = timeoutId;

    // Cleanup function
    return () => {
      if (planGenerationRef.current.timeoutId) {
        clearTimeout(planGenerationRef.current.timeoutId);
        planGenerationRef.current.timeoutId = undefined;
      }
      planGenerationRef.current.inProgress = false;
    };
  }, [state.planGenerationLoading, state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.initialResponses, state.followUpResponses, state.initialQuestions, state.followUpQuestions, authState.userProfile, authState.userProfile?.id, authState.session?.access_token, setTrainingPlan, setExercises, onError]);

  // Step 1: Username
  const handleUsernameChange = useCallback((username: string) => {
    const isValid = username.trim().length >= 3;
    
    setState(prev => ({
      ...prev,
      username,
      usernameValid: isValid,
    }));
  }, []);

  const handleWelcomeNext = useCallback(() => {
    if (!state.usernameValid) {
      Alert.alert('Error', 'Please enter a valid username (3-20 characters)');
      return;
    }
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
    if (!state.personalInfo) return;

    setState(prev => ({ 
      ...prev, 
      initialQuestionsLoading: true,
      aiAnalysisPhase: 'initial'
    }));

    try {
      const fullPersonalInfo = {
        ...state.personalInfo,
        username: state.username,
        goal_description: state.goalDescription,
        experience_level: state.experienceLevel,
      };

      const jwtToken = authState.session?.access_token;
      
      const response = await trainingService.getInitialQuestions(
        fullPersonalInfo,
        authState.userProfile?.id,
        jwtToken
      );
      
      
      setState(prev => ({
        ...prev,
        initialQuestions: response.questions,
        initialQuestionsLoading: false,
        currentInitialQuestionIndex: 0,
        aiHasQuestions: true,
        initialAiMessage: response.ai_message,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load questions';
      setState(prev => ({
        ...prev,
        initialQuestionsLoading: false,
        error: errorMessage,
      }));
      onError(errorMessage);
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, authState.userProfile?.id, onError]);

  // Simple function to load follow-up questions
  const loadFollowUpQuestions = useCallback(async () => {
    if (!state.personalInfo) return;

    setState(prev => ({ 
      ...prev, 
      followUpQuestionsLoading: true,
      aiAnalysisPhase: 'followup'
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
      
      const response = await trainingService.getFollowUpQuestions(
        fullPersonalInfo, 
        responsesObject,
        state.initialQuestions,
        authState.userProfile?.id,
        jwtToken
      );

      setState(prev => ({
        ...prev,
        followUpQuestions: response.questions || [],
        followUpQuestionsLoading: false,
        currentFollowUpQuestionIndex: 0,
        aiHasQuestions: true,
        followUpAiMessage: response.ai_message,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load follow-up questions';
      setState(prev => ({
        ...prev,
        followUpQuestionsLoading: false,
        error: errorMessage,
      }));
      onError(errorMessage);
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.initialResponses, state.initialQuestions, authState.userProfile?.id, onError]);

  // Simple step progression functions
  const handleInitialQuestionsComplete = useCallback(() => {
    setCurrentStep('followup');
  }, []);

  const handleFollowUpQuestionsComplete = useCallback(() => {
    setCurrentStep('generation');
  }, []);

  // Handle continue to questions after AI analysis
  const handleContinueToQuestions = useCallback(() => {
    if (state.aiAnalysisPhase === 'initial') {
      setCurrentStep('initial');
    } else if (state.aiAnalysisPhase === 'followup') {
      setCurrentStep('followup');
    }
    // Reset the analysis phase and questions flag
    setState(prev => ({
      ...prev,
      aiAnalysisPhase: null,
      aiHasQuestions: false,
    }));
  }, [state.aiAnalysisPhase]);

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

  // Track follow-up questions loading to prevent race conditions
  const followUpQuestionsRef = useRef<{ inProgress: boolean; timeoutId?: ReturnType<typeof setTimeout> }>({ inProgress: false });

  const handleInitialQuestionsNext = useCallback(() => {
    if (!state.personalInfo) return;

    // Prevent duplicate calls
    if (followUpQuestionsRef.current.inProgress) {
      logError('Follow-up questions: Already in progress');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'initial'
    }));
    setCurrentStep('initial');
    followUpQuestionsRef.current.inProgress = true;
  }, [state.personalInfo]);

  // useEffect to handle follow-up questions with proper cleanup
  useEffect(() => {
    if (currentStep !== 'initial' || !state.planGenerationLoading || !followUpQuestionsRef.current.inProgress) {
      return;
    }

    // Clear any existing timeout
    if (followUpQuestionsRef.current.timeoutId) {
      clearTimeout(followUpQuestionsRef.current.timeoutId);
    }

    // Set timeout for AI thinking simulation
    const timeoutId = setTimeout(async () => {
      try {
        // Check if component is still mounted and still in progress
        if (!followUpQuestionsRef.current.inProgress) {
          return;
        }

        const responsesObject = Object.fromEntries(state.initialResponses);
        
        // Get JWT token from AuthContext state
        const jwtToken = authState.session?.access_token;
        
        const fullPersonalInfo = {
          ...state.personalInfo!,
          username: state.username,
          goal_description: state.goalDescription,
          experience_level: state.experienceLevel,
        };
        
        const response = await trainingService.getFollowUpQuestions(
          fullPersonalInfo, 
          responsesObject, // Send raw responses - backend will format them
          state.initialQuestions, // Send initial questions
          authState.userProfile?.id,
          jwtToken
        );
        
        // Check again if still in progress (component might have unmounted)
        if (!followUpQuestionsRef.current.inProgress) {
          return;
        }
        
        setState(prev => ({
          ...prev,
          followUpQuestions: response.questions,
          initialQuestions: response.initial_questions || prev.initialQuestions, // Use returned questions
          planGenerationLoading: false,
          currentFollowUpQuestionIndex: 0,
          aiHasQuestions: true,
          followUpAiMessage: response.ai_message,
        }));
        
        // Reset in progress flag
        followUpQuestionsRef.current.inProgress = false;
      } catch (error) {
        // Only update state if still in progress (component still mounted)
        if (followUpQuestionsRef.current.inProgress) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load follow-up questions';
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: errorMessage,
          }));
          
          // Set retry step for error recovery
          setRetryStep('followup');
          onError(errorMessage);
          followUpQuestionsRef.current.inProgress = false;
        }
      }
    }, AI_DELAYS.followUpQuestions);

    followUpQuestionsRef.current.timeoutId = timeoutId;

    // Cleanup function
    return () => {
      if (followUpQuestionsRef.current.timeoutId) {
        clearTimeout(followUpQuestionsRef.current.timeoutId);
        followUpQuestionsRef.current.timeoutId = undefined;
      }
      followUpQuestionsRef.current.inProgress = false;
    };
  }, [currentStep, state.planGenerationLoading, state.initialResponses, state.initialQuestions, state.personalInfo, state.username, state.goalDescription, state.experienceLevel, authState.userProfile?.id, authState.session?.access_token, onError]);

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
      case 'generation':
        setCurrentStep('followup');
        break;
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    // Check if we've exceeded max retries
    if (retryCount >= MAX_RETRIES) {
      const stepName = retryStep || currentStep;
      const stepDescriptions = {
        'initial': 'initial questions',
        'followup': 'follow-up questions', 
        'outline': 'plan outline',
        'generation': 'training plan generation'
      };
      
      // Set error state instead of showing alert
      setState(prev => ({
        ...prev,
        error: `We've tried ${MAX_RETRIES} times to load your ${stepDescriptions[stepName as keyof typeof stepDescriptions] || 'onboarding step'} but encountered an error. Please try again later or contact support.`
      }));
      return;
    }

    // Increment retry count
    setRetryCount(prev => prev + 1);
    setState(prev => ({ ...prev, error: null }));
    
    // Retry based on the step that failed
    const stepToRetry = retryStep || currentStep;
    console.log(`📍 Onboarding Retry: ${stepToRetry} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    
    switch (stepToRetry) {
      case 'welcome':
        // No retry needed for welcome step
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
        handleInitialQuestionsNext();
        break;
      case 'followup':
        handleInitialQuestionsComplete();
        break;
      case 'generation':
        handleFollowUpQuestionsComplete();
        break;
    }
  }, [currentStep, retryCount, retryStep, handleWelcomeNext, handlePersonalInfoNext, handleGoalDescriptionNext, handleExperienceLevelNext, handleInitialQuestionsNext, handleInitialQuestionsComplete, handleFollowUpQuestionsComplete]);

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
    // Essential onboarding flow logging - render step
    
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
            isLoading={state.initialQuestionsLoading}
            onNext={handleInitialQuestionsComplete}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Initial Questions"
            username={state.username}
            aiMessage={state.initialAiMessage}
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
            isLoading={state.followUpQuestionsLoading}
            onNext={handleFollowUpQuestionsComplete}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Follow-up Questions"
            username={state.username}
            aiMessage={state.followUpAiMessage}
          />
        );
      
      case 'generation':
        return (
          <PlanGenerationStep
            isLoading={state.planGenerationLoading}
            error={state.error || undefined}
            onRetry={handleRetry}
            onStartGeneration={handlePlanGeneration}
            username={state.username}
            isCompleted={!!state.trainingPlan && !state.planGenerationLoading}
            completionMessage={state.completionMessage || undefined}
            onContinue={() => {
              setState(prev => ({ ...prev, hasSeenCompletionMessage: true }));
              handleComplete();
            }}
            onViewPlan={() => {
              setState(prev => ({ ...prev, hasSeenCompletionMessage: true }));
              setCurrentStep('preview');
            }}
          />
        );
      
      case 'preview':
        return (
          <PlanPreviewStep
            onContinue={handleComplete}
            onBack={() => setCurrentStep('generation')}
            planMetadata={state.planMetadata}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />
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
