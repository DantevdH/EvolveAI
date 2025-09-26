import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { OnboardingBackground } from './OnboardingBackground';
import { WelcomeStep } from './WelcomeStep';
import { PersonalInfoStep } from './PersonalInfoStep';
import { GoalDescriptionStep } from './GoalDescriptionStep';
import { QuestionsStep } from './QuestionsStep';
import { PlanGenerationStep } from './PlanGenerationStep';
import { OnboardingService } from '../../services/onboardingService';
import { 
  OnboardingState, 
  PersonalInfo, 
  AIQuestion, 
  QuestionCategory 
} from '../../types/onboarding';

interface ConversationalOnboardingProps {
  onComplete: (workoutPlan: any) => void;
  onError: (error: string) => void;
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onComplete,
  onError,
}) => {
  const [state, setState] = useState<OnboardingState>({
    username: '',
    usernameValid: false,
    personalInfo: null,
    personalInfoValid: false,
    goalDescription: '',
    goalDescriptionValid: false,
    initialQuestions: [],
    initialResponses: new Map(),
    initialQuestionsLoading: false,
    currentInitialQuestionIndex: 0,
    followUpQuestions: [],
    followUpResponses: new Map(),
    followUpQuestionsLoading: false,
    currentFollowUpQuestionIndex: 0,
    planGenerationLoading: false,
    workoutPlan: null,
    error: null,
    aiHasQuestions: false,
    aiAnalysisPhase: null,
  });

  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'initial' | 'followup' | 'generation'>('welcome');

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

  const handleGoalDescriptionNext = useCallback(async () => {
    console.log('🎯 Goal description next button pressed');
    console.log('📋 Current goal description:', state.goalDescription);
    console.log('✅ Goal description valid:', state.goalDescriptionValid);
    
    if (!state.goalDescriptionValid) {
      console.log('❌ Goal description validation failed');
      Alert.alert('Error', 'Please describe your fitness goal (at least 10 characters)');
      return;
    }

    if (!state.personalInfo) {
      console.log('❌ Personal info missing');
      Alert.alert('Error', 'Personal information is missing');
      return;
    }

    // Combine all info with goal description
    const fullPersonalInfo = {
      ...state.personalInfo,
      username: state.username,
      goal_description: state.goalDescription,
    };

    console.log('🚀 Starting AI analysis...');
    setState(prev => ({ 
      ...prev, 
      planGenerationLoading: true,
      aiAnalysisPhase: 'initial'
    }));
    setCurrentStep('generation');

    try {
      // Test backend connection first
      console.log('🔍 Testing backend connection...');
      const backendAvailable = await OnboardingService.testBackendConnection();
      if (!backendAvailable) {
        throw new Error('Backend server is not accessible. Please make sure the backend is running on http://127.0.0.1:8000');
      }
      
      // Simulate AI thinking time, then get initial questions
      setTimeout(async () => {
        try {
          console.log('📞 Calling OnboardingService.getInitialQuestions...');
          const response = await OnboardingService.getInitialQuestions(fullPersonalInfo);
          
          console.log('✅ Initial questions received:', {
            questionCount: response.questions?.length || 0,
            estimatedTime: response.estimated_time_minutes
          });
          
          setState(prev => ({
            ...prev,
            initialQuestions: response.questions,
            planGenerationLoading: false,
            currentInitialQuestionIndex: 0,
            aiHasQuestions: true, // New state to show continue button
          }));
        } catch (error) {
          console.error('❌ Error getting initial questions in component:', error);
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load questions',
          }));
          onError(error instanceof Error ? error.message : 'Failed to load questions');
        }
      }, 2000); // 2 second delay to show AI thinking
      
    } catch (error) {
      console.error('❌ Error in goal description next:', error);
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

    console.log('🚀 Starting AI analysis for follow-up questions...');
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
          console.log('📤 Sending follow-up request with responses:', responsesObject);
          const response = await OnboardingService.getFollowUpQuestions(state.personalInfo!, responsesObject);
          
          console.log('📥 Follow-up questions response:', {
            questions: response.questions,
            questionCount: response.questions?.length || 0,
            totalQuestions: response.total_questions,
            estimatedTime: response.estimated_time_minutes
          });
          
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

    console.log('🚀 Starting AI analysis for final plan generation...');
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
          
          const workoutPlan = await OnboardingService.generateWorkoutPlan(
            state.personalInfo!,
            initialResponsesObject,
            followUpResponsesObject
          );
          
          setState(prev => ({
            ...prev,
            planGenerationLoading: false,
            workoutPlan,
          }));
          
          onComplete(workoutPlan);
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
        error: error instanceof Error ? error.message : 'Failed to start AI analysis',
      }));
      onError(error instanceof Error ? error.message : 'Failed to start AI analysis');
    }
  }, [state.personalInfo, state.initialResponses, state.followUpResponses, onComplete, onError]);

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
      case 'initial':
        setCurrentStep('goal');
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
      case 'initial':
        handleGoalDescriptionNext();
        break;
      case 'followup':
        handleInitialQuestionsNext();
        break;
      case 'generation':
        handleFollowUpQuestionsNext();
        break;
    }
  }, [currentStep, handleWelcomeNext, handlePersonalInfoNext, handleGoalDescriptionNext, handleInitialQuestionsNext, handleFollowUpQuestionsNext]);

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
