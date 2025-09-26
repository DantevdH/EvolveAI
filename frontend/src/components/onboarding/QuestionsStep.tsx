import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { OnboardingCard } from './OnboardingCard';
import { OnboardingNavigation } from './OnboardingNavigation';
import { QuestionRenderer } from './QuestionRenderer';
import { ProgressIndicator } from './ProgressIndicator';
import { QuestionsStepProps } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

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
}) => {
  const [currentIndex, setCurrentIndex] = useState(currentQuestionIndex);
  const [localResponses, setLocalResponses] = useState(responses);

  const currentQuestion = questions[currentIndex];
  const currentResponse = localResponses.get(currentQuestion?.id);
  
  console.log('🔍 QuestionsStep Debug:', {
    questionsLength: questions.length,
    currentIndex: currentIndex,
    totalQuestions: totalQuestions,
    currentQuestion: currentQuestion,
    hasCurrentQuestion: !!currentQuestion,
    questionsArray: questions
  });

  const handleResponseChange = useCallback((value: any) => {
    if (!currentQuestion) return;
    
    const newResponses = new Map(localResponses);
    newResponses.set(currentQuestion.id, value);
    setLocalResponses(newResponses);
    onResponseChange(currentQuestion.id, value);
  }, [currentQuestion, localResponses, onResponseChange]);

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
    return localResponses.has(currentQuestion.id) && localResponses.get(currentQuestion.id) !== '';
  }, [currentQuestion, localResponses]);

  if (isLoading) {
    return (
      <OnboardingCard
        title={stepTitle}
        subtitle="Generating personalized questions..."
        scrollable={true}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>AI is creating questions just for you...</Text>
          <View style={styles.loadingSpinner} />
        </View>
      </OnboardingCard>
    );
  }

  if (!currentQuestion) {
    return (
      <OnboardingCard
        title={stepTitle}
        subtitle="No questions available"
        scrollable={true}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No questions available</Text>
        </View>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard
      title={stepTitle}
      subtitle={`Question ${currentIndex + 1} of ${totalQuestions}`}
      scrollable={true}
    >
      <View style={styles.container}>
        <View style={styles.contentArea}>
          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={currentIndex + 1}
            totalSteps={totalQuestions}
            style={styles.progressIndicator}
          />

          {/* Question */}
          <View style={styles.questionContainer}>
            <QuestionRenderer
              question={currentQuestion}
              value={currentResponse}
              onChange={handleResponseChange}
              error={error}
            />
          </View>
        </View>

        {/* Navigation */}
        <OnboardingNavigation
          onNext={handleNext}
          onBack={handlePrevious}
          nextTitle={currentIndex === totalQuestions - 1 ? 'Continue' : 'Next'}
          backTitle={currentIndex === 0 ? 'Back' : 'Previous'}
          nextDisabled={!isCurrentQuestionValid()}
          backDisabled={false}
          showBack={true}
          variant="dual"
        />
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    // Add rotation animation here if needed
  },
  progressIndicator: {
    marginBottom: 24,
  },
  questionContainer: {
    flex: 1,
    marginBottom: 32,
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
