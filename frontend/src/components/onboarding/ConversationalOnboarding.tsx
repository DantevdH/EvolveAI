import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { OnboardingBackground } from './OnboardingBackground';
import { WelcomeStep } from '../../screens/onboarding/WelcomeStep';
import { PersonalInfoStep } from '../../screens/onboarding/PersonalInfoStep';
import { GoalDescriptionStep } from '../../screens/onboarding/GoalDescriptionStep';
import { ExperienceLevelStep } from '../../screens/onboarding/ExperienceLevelStep';
import { QuestionsStep } from '../../screens/onboarding/QuestionsStep';
import { PlanGenerationStep } from '../../screens/onboarding/PlanGenerationStep';
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

// Transform backend data structure to frontend format
const transformBackendToFrontend = (backendData: any) => {
  if (!backendData) return null;
  
  return {
    id: backendData.id?.toString(),
    title: backendData.title,
    description: backendData.summary,
    totalWeeks: backendData.weekly_schedules?.length || 1,
    currentWeek: 1, // Default to week 1
    weeklySchedules: backendData.weekly_schedules?.map((schedule: any) => {
      // Sort daily trainings by day order (Monday = 0, Tuesday = 1, etc.)
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const sortedDailyTrainings = schedule.daily_training?.sort((a: any, b: any) => {
        const aIndex = dayOrder.indexOf(a.day_of_week);
        const bIndex = dayOrder.indexOf(b.day_of_week);
        return aIndex - bIndex;
      }) || [];

      return {
        id: schedule.id?.toString(),
        weekNumber: schedule.week_number,
        dailyTrainings: sortedDailyTrainings.map((daily: any) => {
          // Combine strength exercises and endurance sessions into exercises array
          const exercises: any[] = [];
          
          // Add strength exercises
          if (daily.strength_exercise && daily.strength_exercise.length > 0) {
            daily.strength_exercise.forEach((se: any) => {
              exercises.push({
                id: se.id?.toString(),
                exerciseId: se.exercise_id?.toString(),
                exercise: se.exercise || null,
                sets: Array.from({ length: se.sets || 0 }, (_, index) => ({
                  id: `set-${index}`,
                  reps: se.reps?.[index] || 0,
                  weight: se.weight?.[index] || 0,
                  completed: false,
                  restTime: 60
                })),
                completed: se.completed || false,
                order: exercises.length
              });
            });
          }
          
          // Add endurance sessions
          if (daily.endurance_session && daily.endurance_session.length > 0) {
            daily.endurance_session.forEach((es: any) => {
              exercises.push({
                id: es.id?.toString(),
                exerciseId: `endurance_${es.id}`,
                exercise: {
                  id: `endurance_${es.id}`,
                  name: `${es.sport_type} - ${es.training_volume} ${es.unit}`,
                  instructions: `${es.sport_type} session`,
                  target_area: 'Endurance',
                  force: null,
                  equipment: null,
                  secondary_muscles: [],
                  main_muscles: [],
                  difficulty: null,
                  exercise_tier: null,
                  imageUrl: null,
                  videoUrl: null
                },
                sets: [],
                completed: es.completed || false,
                order: exercises.length
              });
            });
          }

          return {
            id: daily.id?.toString(),
            dayOfWeek: daily.day_of_week,
            isRestDay: daily.is_rest_day || false,
            exercises,
            completed: daily.completed || false
          };
        }),
        completed: false,
        completedAt: undefined
      };
    }) || [],
    createdAt: backendData.created_at ? new Date(backendData.created_at) : new Date(),
    updatedAt: backendData.updated_at ? new Date(backendData.updated_at) : new Date(),
    completed: false,
    completedAt: undefined
  };
};

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
  const { state: authState, refreshUserProfile, setTrainingPlan } = useAuth();
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
    error: null,
    aiHasQuestions: false,
    aiAnalysisPhase: null,
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
  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'experience' | 'initial' | 'followup' | 'generation'>(initialStep);

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

  // Handle plan generation (extracted from handleOutlineNext)
  const handlePlanGeneration = useCallback(async () => {
    logStep('Plan Generation', 'started');
    
    if (!state.personalInfo) {
      logError('Plan Generation: Missing personal info');
      return;
    }
    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'generation'
    }));

    try {
      // Simulate AI thinking time, then generate final plan
      setTimeout(async () => {
        try {
          // Get JWT token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          const jwtToken = session?.access_token;
          
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
          
          logData('Generate Plan', response.success ? 'success' : 'error');
          
          if (response.success && response.data) {
            // Backend now returns the complete formatted training plan
            logStep('Plan Generation', 'completed', 'Training plan received from backend');
            
            // Transform backend data to frontend format before setting
            const transformedPlan = transformBackendToFrontend(response.data);
            if (transformedPlan) {
              setTrainingPlan(transformedPlan);
            } else {
              throw new Error('Failed to transform training plan data');
            }
            
            setState(prev => ({
              ...prev,
              trainingPlan: transformedPlan,
              planGenerationLoading: false,
            }));
            
            // Navigate to main app with the transformed plan
            onComplete(transformedPlan!);
          } else {
            logError('Plan generation failed', response.message);
            throw new Error(response.message || 'Failed to generate training plan');
          }
        } catch (error) {
          logError('Plan generation error', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate training plan';
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            aiAnalysisPhase: null,
            error: errorMessage,
          }));
          onError(errorMessage);
        }
      }, AI_DELAYS.planGeneration);
    } catch (error) {
      logError('Error in plan generation setup', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate training plan';
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        aiAnalysisPhase: null,
        error: errorMessage,
      }));
      onError(errorMessage);
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.initialResponses, state.followUpResponses, state.trainingPlanOutline, state.outlineFeedback, state.initialQuestions, state.followUpQuestions, authState.userProfile, onComplete, onError]);

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

      const { data: { session } } = await supabase.auth.getSession();
      const jwtToken = session?.access_token;
      
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
      const { data: { session } } = await supabase.auth.getSession();
      const jwtToken = session?.access_token;
      
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

  const handleInitialQuestionsNext = useCallback(async () => {
    if (!state.personalInfo) return;

    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'initial'
    }));
    setCurrentStep('initial');

    try {
      // Simulate AI thinking time, then get follow-up questions
      setTimeout(async () => {
        try {
          const responsesObject = Object.fromEntries(state.initialResponses);
          
          
          // Get JWT token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          const jwtToken = session?.access_token;
          
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
          
          setState(prev => ({
            ...prev,
            followUpQuestions: response.questions,
            initialQuestions: response.initial_questions || prev.initialQuestions, // Use returned questions
            planGenerationLoading: false,
            currentFollowUpQuestionIndex: 0,
            aiHasQuestions: true,
            followUpAiMessage: response.ai_message,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load follow-up questions';
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: errorMessage,
          }));
          
          // Set retry step for error recovery
          setRetryStep('followup');
          onError(errorMessage);
        }
      }, AI_DELAYS.followUpQuestions); // Configurable delay to show AI thinking
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start AI analysis',
      }));
      onError(error instanceof Error ? error.message : 'Failed to start AI analysis');
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.initialResponses, state.initialQuestions, authState.userProfile?.id, onError]);

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
