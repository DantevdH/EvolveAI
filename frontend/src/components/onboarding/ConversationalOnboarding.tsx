import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { OnboardingBackground } from './OnboardingBackground';
import { WelcomeStep } from '../../screens/onboarding/WelcomeStep';
import { PersonalInfoStep } from '../../screens/onboarding/PersonalInfoStep';
import { GoalDescriptionStep } from '../../screens/onboarding/GoalDescriptionStep';
import { ExperienceLevelStep } from '../../screens/onboarding/ExperienceLevelStep';
import { QuestionsStep } from '../../screens/onboarding/QuestionsStep';
import { TrainingPlanOutlineStep } from '../../screens/onboarding';
import { PlanGenerationStep } from '../../screens/onboarding/PlanGenerationStep';
import { FitnessService } from '../../services/onboardingService';
import { 
  OnboardingState, 
  PersonalInfo, 
  AIQuestion, 
  QuestionCategory 
} from '../../types/onboarding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { UserService } from '../../services/userService';

interface ConversationalOnboardingProps {
  onComplete: (workoutPlan: any) => Promise<void>;
  onError: (error: string) => void;
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onComplete,
  onError,
}) => {
  const { state: authState, refreshUserProfile } = useAuth();
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
    followUpQuestions: [],
    followUpResponses: new Map(),
    followUpQuestionsLoading: false,
    currentFollowUpQuestionIndex: 0,
    trainingPlanOutline: null,
    outlineFeedback: '',
    outlineLoading: false,
    planGenerationLoading: false,
    workoutPlan: null,
    error: null,
    aiHasQuestions: false,
    aiAnalysisPhase: null,
  });

  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'experience' | 'initial' | 'followup' | 'outline' | 'generation'>('welcome');

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
      Alert.alert('Error', 'Please describe your fitness goal (at least 10 characters)');
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

  const handleExperienceLevelNext = useCallback(async () => {
    // Skip validation checks - proceed directly
    if (!state.personalInfo) {
      Alert.alert('Error', 'Personal information is missing');
      return;
    }

    // Combine all info with goal description and experience level
    const fullPersonalInfo = {
      ...state.personalInfo,
      username: state.username,
      goal_description: state.goalDescription,
      experience_level: state.experienceLevel,
    };

    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'initial'
    }));
    setCurrentStep('generation');

    try {
      // Test backend connection first
      const backendAvailable = await FitnessService.testBackendConnection();
      if (!backendAvailable) {
        throw new Error('Backend server is not accessible. Please make sure the backend is running on http://127.0.0.1:8000');
      }
      
      // Simulate AI thinking time, then get initial questions
      setTimeout(async () => {
        try {
          // Get JWT token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          const jwtToken = session?.access_token;
          
          const response = await FitnessService.getInitialQuestions(
            fullPersonalInfo,
            authState.userProfile?.id,
            jwtToken
          );
          
          setState(prev => ({
            ...prev,
            initialQuestions: response.questions,
            planGenerationLoading: false,
            currentInitialQuestionIndex: 0,
            aiHasQuestions: true, // New state to show continue button
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load questions',
          }));
          onError(error instanceof Error ? error.message : 'Failed to load questions');
        }
      }, 2000); // 2 second delay to show AI thinking
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start AI analysis',
      }));
      onError(error instanceof Error ? error.message : 'Failed to start AI analysis');
    }
  }, [state.goalDescription, state.goalDescriptionValid, state.personalInfo, state.username, onError]);

  // Handle continue to questions after AI analysis
  const handleContinueToQuestions = useCallback(() => {
    if (state.aiAnalysisPhase === 'initial') {
      setCurrentStep('initial');
    } else if (state.aiAnalysisPhase === 'followup') {
      setCurrentStep('followup');
    } else if (state.aiAnalysisPhase === 'outline') {
      setCurrentStep('outline');
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
      aiAnalysisPhase: 'followup'
    }));
    setCurrentStep('generation');

    try {
      // Simulate AI thinking time, then get follow-up questions
      setTimeout(async () => {
        try {
          const responsesObject = Object.fromEntries(state.initialResponses);
          
          // Get JWT token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          const jwtToken = session?.access_token;
          
          const response = await FitnessService.getFollowUpQuestions(
            state.personalInfo!, 
            responsesObject,
            state.initialQuestions,
            authState.userProfile?.id,
            jwtToken
          );
          
          setState(prev => ({
            ...prev,
            followUpQuestions: response.questions,
            planGenerationLoading: false,
            currentFollowUpQuestionIndex: 0,
            aiHasQuestions: true,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load follow-up questions',
          }));
          onError(error instanceof Error ? error.message : 'Failed to load follow-up questions');
        }
      }, 2000); // 2 second delay to show AI thinking
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start AI analysis',
      }));
      onError(error instanceof Error ? error.message : 'Failed to start AI analysis');
    }
  }, [state.personalInfo, state.initialResponses, onError]);

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

  const handleFollowUpQuestionsNext = useCallback(async () => {
    if (!state.personalInfo) return;

    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'outline'
    }));
    setCurrentStep('generation');

    try {
      // Simulate AI thinking time, then generate training plan outline
      setTimeout(async () => {
        try {
          const initialResponsesObject = Object.fromEntries(state.initialResponses);
          const followUpResponsesObject = Object.fromEntries(state.followUpResponses);
          
          // Get JWT token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          const jwtToken = session?.access_token;
          
          if (!jwtToken) {
            throw new Error('JWT token is missing - cannot generate workout plan');
          }
          
          const response = await FitnessService.generateTrainingPlanOutline(
            state.personalInfo!,
            initialResponsesObject,
            followUpResponsesObject,
            state.initialQuestions,
            state.followUpQuestions,
            jwtToken
          );
          
          if (response.success) {
            console.log(`✅ FRONTEND: Training plan outline generated successfully!`);
            setState(prev => ({
              ...prev,
              planGenerationLoading: false,
              trainingPlanOutline: response.data?.outline || null,
              aiHasQuestions: true, // Show continue button to go to outline
            }));
          } else {
            console.error('❌ FRONTEND: Training plan outline generation failed:', response.message);
            throw new Error(response.message || 'Failed to generate training plan outline');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: error instanceof Error ? error.message : 'Failed to generate training plan outline',
          }));
          onError(error instanceof Error ? error.message : 'Failed to generate training plan outline');
        }
      }, 3000); // 3 second delay for outline generation
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate training plan outline',
      }));
      onError(error instanceof Error ? error.message : 'Failed to generate training plan outline');
    }
  }, [state.personalInfo, state.initialResponses, state.followUpResponses, state.initialQuestions, state.followUpQuestions, onError, authState.userProfile?.id]);

  // Step 4: Training Plan Outline
  const handleOutlineFeedbackChange = useCallback((feedback: string) => {
    setState(prev => ({
      ...prev,
      outlineFeedback: feedback,
    }));
  }, []);

  const handleOutlineNext = useCallback(async () => {
    if (!state.personalInfo) return;

    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'generation'
    }));
    setCurrentStep('generation');

    try {
      // Simulate AI thinking time, then generate final plan
      setTimeout(async () => {
        try {
          const initialResponsesObject = Object.fromEntries(state.initialResponses);
          const followUpResponsesObject = Object.fromEntries(state.followUpResponses);
          
          // Get JWT token from Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          const jwtToken = session?.access_token;
          
          if (!jwtToken) {
            throw new Error('JWT token is missing - cannot generate workout plan');
          }
          
          const response = await FitnessService.generateWorkoutPlan(
            state.personalInfo!,
            initialResponsesObject,
            followUpResponsesObject,
            state.initialQuestions,
            state.followUpQuestions,
            jwtToken,
            state.outlineFeedback
          );
          
          if (response.success) {
            console.log(`✅ FRONTEND: Onboarding completed successfully! Workout plan ID: ${response.data?.workout_plan_id}`);
            setState(prev => ({
              ...prev,
              planGenerationLoading: false,
            }));
            
            // Refresh user profile to fetch the newly created profile and workout plan
            console.log('🔄 Refreshing user profile and workout plan...');
            await refreshUserProfile();
            
            // Complete onboarding
            await onComplete(null);
          } else {
            console.error('❌ FRONTEND: Workout plan generation failed:', response.message);
            throw new Error(response.message || 'Failed to generate workout plan');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: error instanceof Error ? error.message : 'Failed to generate workout plan',
          }));
          onError(error instanceof Error ? error.message : 'Failed to generate workout plan');
        }
      }, 3000); // 3 second delay for final plan generation
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        planGenerationLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate workout plan',
      }));
      onError(error instanceof Error ? error.message : 'Failed to generate workout plan');
    }
  }, [state.personalInfo, state.initialResponses, state.followUpResponses, state.initialQuestions, state.followUpQuestions, state.outlineFeedback, onComplete, onError, refreshUserProfile]);

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
      case 'outline':
        setCurrentStep('followup');
        break;
      case 'generation':
        setCurrentStep('outline');
        break;
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    
    switch (currentStep) {
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
        handleExperienceLevelNext();
        break;
      case 'followup':
        handleInitialQuestionsNext();
        break;
      case 'outline':
        handleFollowUpQuestionsNext();
        break;
      case 'generation':
        handleOutlineNext();
        break;
    }
  }, [currentStep, handleWelcomeNext, handlePersonalInfoNext, handleGoalDescriptionNext, handleExperienceLevelNext, handleInitialQuestionsNext, handleFollowUpQuestionsNext, handleOutlineNext]);

  const renderCurrentStep = () => {
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
            onNext={handleInitialQuestionsNext}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Initial Questions"
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
            onNext={handleFollowUpQuestionsNext}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Follow-up Questions"
          />
        );
      
      case 'outline':
        return (
          <TrainingPlanOutlineStep
            outline={state.trainingPlanOutline}
            feedback={state.outlineFeedback}
            onFeedbackChange={handleOutlineFeedbackChange}
            onNext={handleOutlineNext}
            onPrevious={handlePrevious}
            isLoading={state.outlineLoading}
            error={state.error || undefined}
          />
        );
      
      case 'generation':
        return (
          <PlanGenerationStep
            isLoading={state.planGenerationLoading}
            error={state.error || undefined}
            onRetry={handleRetry}
            aiHasQuestions={state.aiHasQuestions}
            onContinueToQuestions={handleContinueToQuestions}
            analysisPhase={state.aiAnalysisPhase}
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
});
