import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation';
import { QuestionRenderer } from '../../components/onboarding/QuestionRenderer';
import { ProgressIndicator } from '../../components/onboarding/ProgressIndicator';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { QuestionsStepProps, QuestionType } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { AIChatMessage } from '../../components/shared/chat';
import { AILoadingScreen } from '../../components/shared/AILoadingScreen';

export const QuestionsStep: React.FC<QuestionsStepProps> = ({
  questions,
  responses,
  onResponseChange,
  currentQuestionIndex,
  totalQuestions,
  isLoading,
  onNext,
  onPrevious,
  error,
  stepTitle,
  username,
  aiMessage, // Add aiMessage prop
}) => {
  const [currentIndex, setCurrentIndex] = useState(currentQuestionIndex);
  const [localResponses, setLocalResponses] = useState(responses);
  const [showAnswerInterface, setShowAnswerInterface] = useState(false);
  const [showAIIntro, setShowAIIntro] = useState(true); // Show AI intro when questions first load
   
  // Essential onboarding flow logging
  
  // Initialize answered questions based on existing responses
  const [answeredQuestions, setAnsweredQuestions] = useState(() => {
    const answered = new Set<number>();
    questions.forEach((question, index) => {
      if (responses.has(question.id)) {
        answered.add(index);
      }
    });
    return answered;
  });

  // Sync internal currentIndex with prop changes
  useEffect(() => {
    setCurrentIndex(currentQuestionIndex);
  }, [currentQuestionIndex]);

  const currentQuestion = questions[currentIndex];
  const currentResponse = localResponses.get(currentQuestion?.id);

  // Update answered questions when questions or responses change
  React.useEffect(() => {
    const answered = new Set<number>();
    questions.forEach((question, index) => {
      if (localResponses.has(question.id)) {
        answered.add(index);
      }
    });
    setAnsweredQuestions(answered);
  }, [questions, localResponses]);

  const handleResponseChange = useCallback((value: any) => {
    if (!currentQuestion) return;
    
    const newResponses = new Map(localResponses);
    newResponses.set(currentQuestion.id, value);
    setLocalResponses(newResponses);
    onResponseChange(currentQuestion.id, value);
    
    // Mark this question as answered
    setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
  }, [currentQuestion, localResponses, onResponseChange, currentIndex]);

  const handleTypingComplete = useCallback(() => {
    setShowAnswerInterface(true);
  }, []);

  // Reset AI intro and current index when questions change
  React.useEffect(() => {
    if (questions.length > 0) {
      setShowAIIntro(true);
      // Reset to first question when questions array changes
      setCurrentIndex(0);
    }
  }, [questions.length]);

  // Reset showAnswerInterface when question changes
  React.useEffect(() => {
    // If this question has been answered before, show answer interface immediately
    if (answeredQuestions.has(currentIndex)) {
      setShowAnswerInterface(true);
    } else {
      setShowAnswerInterface(false);
    }
  }, [currentIndex, answeredQuestions]);

  // Auto-set default value for slider questions if not already answered
  React.useEffect(() => {
    if (!currentQuestion) return;
    
    // Only for slider questions that haven't been answered yet
    if (currentQuestion.response_type === QuestionType.SLIDER && !localResponses.has(currentQuestion.id)) {
      const defaultValue = currentQuestion.min_value ?? 0;
      const newResponses = new Map(localResponses);
      newResponses.set(currentQuestion.id, defaultValue);
      setLocalResponses(newResponses);
      onResponseChange(currentQuestion.id, defaultValue);
      
      // Mark as answered so the user can proceed without adjusting
      setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
    }
  }, [currentQuestion, currentIndex, localResponses, onResponseChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Check if all required questions are answered
      const unansweredRequired = questions.filter(q => 
        q.required && !localResponses.has(q.id)
      );
      
      if (unansweredRequired.length > 0) {
        Alert.alert(
          'Incomplete Questions',
          `Please answer all required questions. You have ${unansweredRequired.length} remaining.`
        );
        return;
      }
      
      onNext();
    }
  }, [currentIndex, totalQuestions, questions, localResponses, onNext]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onPrevious();
    }
  }, [currentIndex, onPrevious]);

  const isCurrentQuestionValid = useCallback(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    
    const response = localResponses.get(currentQuestion.id);
    if (!response) return false;
    
    // Special validation for conditional boolean questions
    if (currentQuestion.response_type === QuestionType.CONDITIONAL_BOOLEAN) {
      // Must have a boolean value
      if (response.boolean === null || response.boolean === undefined) return false;
      
      // If "No" is selected, that's valid
      if (response.boolean === false) return true;
      
      // If "Yes" is selected, must have at least 20 characters
      if (response.boolean === true) {
        return response.text && response.text.trim().length >= 20;
      }
    }
    
    // For other question types, check if response exists and is not empty
    return response !== '';
  }, [currentQuestion, localResponses]);

  if (isLoading) {
    // Determine analysis phase based on step title
    const analysisPhase = stepTitle?.includes('Initial') ? 'initial' : 
                         stepTitle?.includes('Follow') ? 'followup' : null;
    
    return (
      <AILoadingScreen 
        username={username}
        analysisPhase={analysisPhase}
        aiMessage={aiMessage}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <OnboardingCard
        title=""
        subtitle=""
        scrollable={true}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No questions available</Text>
        </View>
      </OnboardingCard>
    );
  }

  // Show AI intro after questions are loaded, before showing questions
  if (showAIIntro && questions.length > 0) {
    const analysisPhase = stepTitle?.includes('Initial') ? 'initial' : 
                         stepTitle?.includes('Follow') ? 'followup' : null;
    
    return (
      <AILoadingScreen 
        username={username}
        analysisPhase={analysisPhase}
        aiMessage={aiMessage}
        showContinueButton={true}
        onContinue={() => setShowAIIntro(false)}
      />
    );
  }

  return (
    <OnboardingCard
      title=""
      subtitle=""
      scrollable={true}
    >
      <View style={styles.container}>
        {/* Progress Indicator at the top */}
        <View style={styles.progressSection}>
          <ProgressIndicator
            currentStep={currentIndex + 1}
            totalSteps={totalQuestions}
            showStepNumbers={false}
            showPercentage={false}
            thick={true}
            style={styles.progressIndicator}
          />
        </View>

        <View style={styles.contentArea}>
          {/* AI Chat Message with Current Question Text */}
          <View style={styles.chatContainer}>
            <AIChatMessage
              customMessage={currentQuestion.text}
              onTypingComplete={handleTypingComplete}
              skipAnimation={answeredQuestions.has(currentIndex)}
            />
          </View>

          {/* Answer Interface - shown after typing is complete */}
          {showAnswerInterface && (
            <View style={styles.answerContainer}>
              <QuestionRenderer
                question={currentQuestion}
                value={currentResponse}
                onChange={handleResponseChange}
                error={error}
                noBackground={true}
              />
            </View>
          )}
        </View>

        {/* Navigation - shown after typing is complete */}
        {showAnswerInterface && (
          <OnboardingNavigation
            onNext={handleNext}
            onBack={handlePrevious}
            nextTitle={currentIndex === totalQuestions - 1 ? 'Continue' : 'Next'}
            backTitle={currentIndex === 0 ? 'Back' : 'Previous'}
            nextDisabled={!isCurrentQuestionValid()}
            backDisabled={false}
            showBack={currentIndex > 0}
            variant={currentIndex > 0 ? "dual" : "single"}
          />
        )}
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressSection: {
    marginTop: -20,
    marginBottom: 1,
  },
  contentArea: {
    flex: 1,
  },
  chatContainer: {
    marginBottom: 25,
  },
  answerContainer: {
    marginBottom: 16,
  },
  progressIndicator: {
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
});
