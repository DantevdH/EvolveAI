import React, { useState, useCallback, useEffect } from 'react';
//@ts-ignore
import { View, StyleSheet, Alert } from 'react-native';
//@ts-ignore
import { OnboardingCard, OnboardingNavigation, ProgressIndicator } from '../../components/onboarding/ui';
//@ts-ignore
import { QuestionRenderer } from '../../components/onboarding/questions';
//@ts-ignore
import { QuestionsStepProps, QuestionType } from '../../types/onboarding';
//@ts-ignore
import { colors, spacing } from '../../constants/designSystem';
//@ts-ignore
import { AIChatMessage } from '../../components/shared/chat';
//@ts-ignore
import { validateQuestionResponse } from '../../utils/validation';

//@ts-ignore
const deriveInitialResponses = (questions: any, responses: Map<string, any>) => {
  const answered = new Set<number>();
  questions.forEach((question: any, index: number) => {
    if (responses.has(question.id)) {
      answered.add(index);
    }
  });
  return answered;
};

export const QuestionsStep: React.FC<QuestionsStepProps> = ({
  questions,
  responses,
  onResponseChange,
  currentQuestionIndex,
  totalQuestions,
  onNext,
  onPrevious,
  error,
  stepTitle,
  username,
  aiMessage,
  introAlreadyCompleted = false,
  onIntroComplete,
}) => {
  const hasQuestions = questions.length > 0;
  const [currentIndex, setCurrentIndex] = useState(Math.min(currentQuestionIndex, Math.max(0, questions.length - 1)));
  const [localResponses, setLocalResponses] = useState(responses);
  const [answeredQuestions, setAnsweredQuestions] = useState(() => deriveInitialResponses(questions, responses));
  const [introPhase, setIntroPhase] = useState<'intro' | 'ready'>(() => {
    if (!hasQuestions || introAlreadyCompleted || !aiMessage) {
      return 'ready';
    }
    return 'intro';
  });
  const [introMessageFinished, setIntroMessageFinished] = useState(() => introAlreadyCompleted || !aiMessage);
  const [showAnswerInterface, setShowAnswerInterface] = useState(introPhase === 'ready' && answeredQuestions.has(currentIndex));
  const currentQuestion = hasQuestions ? questions[currentIndex] : undefined;
  const currentResponse = currentQuestion ? localResponses.get(currentQuestion.id) : undefined;
  const showIntroMessage = introPhase === 'intro' && !!aiMessage;
  const showQuestionMessage = introPhase === 'ready' && !!currentQuestion;
  const shouldAnimateIntro = showIntroMessage;
  const shouldAnimateQuestion = introPhase === 'ready' && currentQuestion && !answeredQuestions.has(currentIndex);

  useEffect(() => {
    setLocalResponses(responses);
  }, [responses]);

  useEffect(() => {
    if (!hasQuestions) {
      return;
    }
    setCurrentIndex(Math.min(currentQuestionIndex, questions.length - 1));
  }, [currentQuestionIndex, hasQuestions, questions.length]);

  useEffect(() => {
    if (!hasQuestions) {
      return;
    }
    setAnsweredQuestions(deriveInitialResponses(questions, responses));
  }, [questions, responses, hasQuestions]);

  useEffect(() => {
    if (!hasQuestions) {
      return;
    }

    const nextPhase = introAlreadyCompleted || !aiMessage ? 'ready' : 'intro';
    setIntroPhase(nextPhase);
    setIntroMessageFinished(introAlreadyCompleted || !aiMessage);
    setShowAnswerInterface(nextPhase === 'ready' && answeredQuestions.has(currentIndex));
  }, [questions, introAlreadyCompleted, aiMessage, answeredQuestions, currentIndex, hasQuestions]);

  const handleIntroTypingComplete = useCallback(() => {
    setIntroMessageFinished(true);
  }, []);

  const handleQuestionTypingComplete = useCallback(() => {
    setShowAnswerInterface(true);
  }, []);

  const handleResponseChange = useCallback((value: any) => {
    if (!currentQuestion) {
      return;
    }

    const newResponses = new Map(localResponses);
    newResponses.set(currentQuestion.id, value);
    setLocalResponses(newResponses);
    onResponseChange(currentQuestion.id, value);
    setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
  }, [currentQuestion, currentIndex, localResponses, onResponseChange]);

  useEffect(() => {
    if (introPhase === 'intro') {
      setShowAnswerInterface(false);
    }
  }, [introPhase]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    // Set default values for questions that have them (SLIDER and RATING)
    if (!localResponses.has(currentQuestion.id)) {
      if (currentQuestion.response_type === QuestionType.SLIDER) {
      const defaultValue = currentQuestion.min_value ?? 0;
      const newResponses = new Map(localResponses);
      newResponses.set(currentQuestion.id, defaultValue);
      setLocalResponses(newResponses);
      onResponseChange(currentQuestion.id, defaultValue);
      setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
      } else if (currentQuestion.response_type === QuestionType.RATING) {
        // RATING questions default to min_value (typically 1 for 1-5 scale)
        const defaultValue = currentQuestion.min_value ?? 1;
        const newResponses = new Map(localResponses);
        newResponses.set(currentQuestion.id, defaultValue);
        setLocalResponses(newResponses);
        onResponseChange(currentQuestion.id, defaultValue);
        setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
      }
    }
  }, [currentQuestion, currentIndex, localResponses, onResponseChange]);

  const handleNext = useCallback(() => {
    if (!hasQuestions) {
      return;
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswerInterface(answeredQuestions.has(currentIndex + 1));
      return;
    }

    const unansweredRequired = questions.filter(question => question.required && !localResponses.has(question.id));
    if (unansweredRequired.length > 0) {
      Alert.alert(
        'Incomplete Questions',
        `Please answer all required questions. You have ${unansweredRequired.length} remaining.`
      );
      return;
    }

    onNext();
  }, [currentIndex, totalQuestions, questions, localResponses, onNext, answeredQuestions, hasQuestions]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      setShowAnswerInterface(answeredQuestions.has(nextIndex));
    } else {
      onPrevious();
    }
  }, [currentIndex, onPrevious, answeredQuestions]);

  const isCurrentQuestionValid = useCallback(() => {
    if (!currentQuestion) {
      return false;
    }

    const response = localResponses.get(currentQuestion.id);
    const result = validateQuestionResponse(currentQuestion, response);
    return result.isValid;
  }, [currentQuestion, localResponses]);

  const advanceToQuestions = useCallback(() => {
    if (!introAlreadyCompleted) {
      onIntroComplete?.();
    }
    setIntroPhase('ready');
    setShowAnswerInterface(answeredQuestions.has(currentIndex));
  }, [answeredQuestions, currentIndex, introAlreadyCompleted, onIntroComplete]);

  // FIX: Return minimal structure instead of null when questions are empty
  // Loading spinner is already shown at the top level
  if (!hasQuestions || !currentQuestion) {
    return (
      <OnboardingCard title="" subtitle="" scrollable>
        <View style={styles.container} />
      </OnboardingCard>
    );
  }

  if (showIntroMessage) {
    return (
      <OnboardingCard title="" subtitle="" scrollable>
        <View style={styles.introContainer}>
          <View style={styles.introMessageWrapper}>
            <AIChatMessage
              customMessage={aiMessage}
              username={username}
              onTypingComplete={handleIntroTypingComplete}
              skipAnimation={!shouldAnimateIntro}
            />
          </View>
          <OnboardingNavigation
            onNext={advanceToQuestions}
            onBack={onPrevious}
            nextTitle="Start"
            showBack={false}
            variant="single"
            nextDisabled={!introMessageFinished}
          />
        </View>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard title="" subtitle="" scrollable>
      <View style={styles.container}>
        <View style={styles.progressSection}>
          <ProgressIndicator
            currentStep={currentIndex + 1}
            totalSteps={totalQuestions}
            showStepNumbers={false}
            showPercentage={false}
            thick
            style={styles.progressIndicator}
          />
        </View>

        <View style={styles.contentArea}>
          {showIntroMessage && (
            <View style={styles.chatContainer}>
              <AIChatMessage
                customMessage={aiMessage}
                username={username}
                skipAnimation={!shouldAnimateIntro}
              />
            </View>
          )}

          {showQuestionMessage && (
            <View style={styles.chatContainer}>
              <AIChatMessage
                customMessage={currentQuestion.text}
                onTypingComplete={handleQuestionTypingComplete}
                skipAnimation={!shouldAnimateQuestion}
              />
            </View>
          )}

          {introPhase === 'ready' && showAnswerInterface && (
            <View style={styles.answerContainer}>
              <QuestionRenderer
                question={currentQuestion}
                value={currentResponse}
                onChange={handleResponseChange}
                error={error}
                noBackground
              />
            </View>
          )}
        </View>

        {introPhase === 'ready' && showAnswerInterface && (
          <OnboardingNavigation
            onNext={handleNext}
            onBack={handlePrevious}
            nextTitle={currentIndex === totalQuestions - 1 ? 'Continue' : 'Next'}
            backTitle={currentIndex === 0 ? 'Back' : 'Previous'}
            nextDisabled={!isCurrentQuestionValid()}
            backDisabled={false}
            showBack={currentIndex > 0}
            variant={currentIndex > 0 ? 'dual' : 'single'}
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
  introContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: spacing.xxl,
    justifyContent: 'space-between',
  },
  introMessageWrapper: {
    marginBottom: spacing.xxl,
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
});
