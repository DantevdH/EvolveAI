/**
 * Chat Questions Page Component
 * A full-page chat interface for onboarding questions that reuses ChatModal's design
 * without the modal overlay, adapted for the questions flow
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import { ChatMessage as ChatBubble } from '@/src/components/shared/chat/ChatMessage';
import { AIChatMessage } from '@/src/components/shared/chat/AIChatMessage';
import { TypingDots } from '@/src/components/shared/chat/TypingDots';
import { QuestionRenderer } from '@/src/components/onboarding/questions';
import { OnboardingNavigation } from '@/src/components/onboarding/ui';
import { QuestionsStepProps, QuestionType } from '@/src/types/onboarding';
import { validateQuestionResponse } from '@/src/utils/validation';

interface ChatQuestionsPageProps extends QuestionsStepProps {
  onClose?: () => void;
  showHeader?: boolean;
}

export const ChatQuestionsPage: React.FC<ChatQuestionsPageProps> = ({
  questions,
  responses,
  onResponseChange,
  onNext,
  onPrevious,
  error,
  stepTitle,
  chatMessages,
  onSubmitAnswer,
  isFetchingNext = false,
  informationComplete = false,
  onClose,
  showHeader = true,
}) => {
  const insets = useSafeAreaInsets();
  const hasQuestions = questions.length > 0;
  const activeQuestion = hasQuestions ? questions[questions.length - 1] : undefined;
  const [localResponses, setLocalResponses] = useState(responses);
  const scrollRef = useRef<ScrollView | null>(null);
  
  // Track which messages have completed typing (for consecutive animation)
  const [completedTypingIndices, setCompletedTypingIndices] = useState<Set<number>>(new Set());
  const completedTypingRef = useRef<Set<number>>(new Set());
  
  // Track which messages are ready to start typing (all previous messages have completed)
  const [readyToStartTyping, setReadyToStartTyping] = useState<Set<number>>(new Set([0])); // First message is always ready

  // Track previous message count to detect additions vs removals
  const prevMessagesLengthRef = useRef(chatMessages.length);

  // Track when chat messages have finished loading to prevent visual jumps
  const [chatMessagesStable, setChatMessagesStable] = useState(false);

  // Animation state for answer interface fade-in
  const [answerInterfaceVisible, setAnswerInterfaceVisible] = useState(false);
  const answerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalResponses(responses);
  }, [responses]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [chatMessages]);

  // Create stable typing complete handler
  const handleTypingCompleteForIndex = useCallback((index: number) => {
    // Use ref to avoid unnecessary re-renders
    if (!completedTypingRef.current.has(index)) {
      completedTypingRef.current.add(index);
      setCompletedTypingIndices(new Set(completedTypingRef.current));
      
      // Mark the next message as ready to start typing
      const nextIndex = index + 1;
      if (nextIndex < chatMessages.length) {
        setReadyToStartTyping(prev => {
          const newSet = new Set(prev);
          newSet.add(nextIndex);
          return newSet;
        });
      }
      
      // Auto-scroll to bottom when typing completes
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [chatMessages.length]);

  // Memoize callbacks per message index to prevent infinite loops
  const typingCompleteCallbacks = useMemo(() => {
    const callbacks = new Map<number, () => void>();
    chatMessages.forEach((_, index) => {
      callbacks.set(index, () => handleTypingCompleteForIndex(index));
    });
    return callbacks;
  }, [chatMessages.length, handleTypingCompleteForIndex]);

  // Handle typing state when messages change (smart preservation for existing messages)
  useEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    const currentLength = chatMessages.length;

    if (currentLength > prevLength) {
      // New messages were added - preserve existing ready/completed state
      // Mark all previously existing indices as ready and completed (they were already shown)
      setReadyToStartTyping(prev => {
        const newSet = new Set(prev);
        // Ensure all indices up to previous length are ready
        for (let i = 0; i < prevLength; i++) {
          newSet.add(i);
        }
        // Mark the first new message as ready to start its animation
        if (prevLength < currentLength) {
          newSet.add(prevLength);
        }
        return newSet;
      });

      // Mark all previous messages as completed (they don't need to re-animate)
      setCompletedTypingIndices(prev => {
        const newSet = new Set(prev);
        for (let i = 0; i < prevLength; i++) {
          newSet.add(i);
        }
        return newSet;
      });

      // Also update the ref
      const updatedCompletedRef = new Set(completedTypingRef.current);
      for (let i = 0; i < prevLength; i++) {
        updatedCompletedRef.add(i);
      }
      completedTypingRef.current = updatedCompletedRef;

    } else if (currentLength < prevLength) {
      // Messages were removed - clean up invalid indices
      const validIndices = new Set<number>();
      completedTypingRef.current.forEach(index => {
        if (index < currentLength) {
          validIndices.add(index);
        }
      });
      completedTypingRef.current = validIndices;
      setCompletedTypingIndices(new Set(validIndices));
      setReadyToStartTyping(new Set([0]));
    }
    // If length is same, no changes needed

    prevMessagesLengthRef.current = currentLength;
  }, [chatMessages.length]);

  // Track when chat messages are stable (no more typing indicators)
  useEffect(() => {
    const hasTypingMessage = chatMessages.some(msg => msg.isTyping);
    const hasMessages = chatMessages.length > 0;
    
    // Mark as stable when we have messages and no typing indicators
    if (hasMessages && !hasTypingMessage && !isFetchingNext) {
      setChatMessagesStable(true);
    } else if (isFetchingNext) {
      setChatMessagesStable(false);
    }
  }, [chatMessages, isFetchingNext]);

  const activeResponse = activeQuestion ? localResponses.get(activeQuestion.id) : undefined;

  const handleResponseChange = useCallback((value: any) => {
    if (!activeQuestion) return;
    const newResponses = new Map(localResponses);
    newResponses.set(activeQuestion.id, value);
    setLocalResponses(newResponses);
    onResponseChange(activeQuestion.id, value);
  }, [activeQuestion, localResponses, onResponseChange]);

  useEffect(() => {
    if (!activeQuestion) return;
    if (!localResponses.has(activeQuestion.id)) {
      if (activeQuestion.response_type === QuestionType.SLIDER) {
        const defaultValue = activeQuestion.min_value ?? 0;
        const newResponses = new Map(localResponses);
        newResponses.set(activeQuestion.id, defaultValue);
        setLocalResponses(newResponses);
        onResponseChange(activeQuestion.id, defaultValue);
      } else if (activeQuestion.response_type === QuestionType.RATING) {
        const defaultValue = activeQuestion.min_value ?? 1;
        const newResponses = new Map(localResponses);
        newResponses.set(activeQuestion.id, defaultValue);
        setLocalResponses(newResponses);
        onResponseChange(activeQuestion.id, defaultValue);
      }
    }
  }, [activeQuestion, localResponses, onResponseChange]);

  const formatAnswerDisplay = useCallback((question: any, value: any) => {
    if (value === undefined || value === null) return '';
    switch (question.response_type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.DROPDOWN: {
        const options = question.options || [];
        if (Array.isArray(value)) {
          return options.filter((o: any) => value.includes(o.value)).map((o: any) => o.text).join(', ') || value.join(', ');
        }
        const match = options.find((o: any) => o.value === value);
        return match ? match.text : String(value);
      }
      case QuestionType.SLIDER: {
        const unit = question.unit ? ` ${question.unit}` : '';
        return `${value}${unit}`;
      }
      case QuestionType.RATING: {
        const max = question.max_value ? `/${question.max_value}` : '';
        return `${value}${max}`;
      }
      case QuestionType.CONDITIONAL_BOOLEAN: {
        const boolVal = value?.boolean === true ? 'Yes' : value?.boolean === false ? 'No' : 'N/A';
        const text = value?.text ? ` - ${value.text}` : '';
        return `${boolVal}${text}`;
      }
      case QuestionType.FREE_TEXT:
      default:
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
  }, []);

  const isCurrentQuestionValid = useCallback(() => {
    if (!activeQuestion) return false;
    const response = localResponses.get(activeQuestion.id);
    return validateQuestionResponse(activeQuestion, response).isValid;
  }, [activeQuestion, localResponses]);

  const handleSubmit = useCallback(() => {
    if (!activeQuestion) return;
    if (!isCurrentQuestionValid()) {
      Alert.alert('Incomplete', 'Please answer this question before continuing.');
      return;
    }
    const response = localResponses.get(activeQuestion.id);
    const display = formatAnswerDisplay(activeQuestion, response);
    onSubmitAnswer(activeQuestion, display, response);
  }, [activeQuestion, isCurrentQuestionValid, localResponses, formatAnswerDisplay, onSubmitAnswer]);

  // Check if we're generating the first question
  const isGeneratingFirstQuestion = questions.length === 0 && isFetchingNext;

  // Check if the last message (the question) has finished typing animation
  const lastMessageIndex = chatMessages.length - 1;
  const lastMessageTypingComplete = lastMessageIndex >= 0 &&
    completedTypingIndices.has(lastMessageIndex);

  // Only show answer interface when:
  // 1. There's an active question
  // 2. Information gathering is not complete
  // 3. Chat messages are stable (no loading indicators)
  // 4. Messages exist
  // 5. The last message (question) has finished its typing animation
  const showAnswerInterface = !!activeQuestion &&
                             !informationComplete &&
                             chatMessagesStable &&
                             chatMessages.length > 0 &&
                             lastMessageTypingComplete;

  // Animate answer interface appearance when it becomes visible
  useEffect(() => {
    if (showAnswerInterface && !answerInterfaceVisible) {
      setAnswerInterfaceVisible(true);
      Animated.timing(answerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!showAnswerInterface && answerInterfaceVisible) {
      // Reset animation when hiding
      answerFadeAnim.setValue(0);
      setAnswerInterfaceVisible(false);
    }
  }, [showAnswerInterface, answerInterfaceVisible, answerFadeAnim]);

  // If generating first question, show a dedicated full-screen loading step
  if (isGeneratingFirstQuestion) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.fullscreenLoading}>
          <TypingDots />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      {showHeader && (
        <View style={[styles.header, { paddingTop: 18 }]}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[createColorWithOpacity(colors.secondary, 0.35), createColorWithOpacity(colors.background, 0.9)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerAvatar}
            >
              <Ionicons name="fitness" size={20} color={colors.primary} />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>AI Coach</Text>
              <Text style={styles.headerSubtitle}>Online</Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.contentWrapper}>
        {/* Messages - Scrollable */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map((msg, index) => {
            // Validate message before rendering
            if (!msg || !msg.id || typeof msg.text !== 'string') {
              return null;
            }

            // Sanitize message content (basic XSS protection)
            const sanitizedMessage = msg.text
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');

            if (msg.from === 'user') {
              return (
                <ChatBubble
                  key={msg.id}
                  message={sanitizedMessage || ''}
                  isUser={true}
                  timestamp={new Date()}
                  isTyping={msg.isTyping}
                />
              );
            }

            const isTypingIndicator = msg.isTyping;
            
            // Determine if this message is ready to start typing:
            // - Always ready if it's a typing indicator (these are temporary)
            // - Otherwise, ready only if all previous messages have completed
            const isReadyToStart = isTypingIndicator || readyToStartTyping.has(index);
            
            // Don't render messages that aren't ready yet (they'll appear when previous ones complete)
            if (!isReadyToStart) {
              return null;
            }
            
            // Determine if this message should skip animation:
            // - Skip if it's a typing indicator (show loading dots instead)
            const shouldSkipAnimation = isTypingIndicator;

            return (
              <AIChatMessage
                key={`${msg.id}-${index}`}
                customMessage={isTypingIndicator ? undefined : (sanitizedMessage || '')}
                isLoading={isTypingIndicator}
                skipAnimation={shouldSkipAnimation}
                onTypingComplete={typingCompleteCallbacks.get(index)}
                showHeader={false}
              />
            );
          })}
          {isFetchingNext && questions.length > 0 && (
            <AIChatMessage
              key="typing-inline"
              isLoading={true}
              showHeader={false}
            />
          )}
        </ScrollView>
      </View>

      {/* Answer Interface - Fixed at bottom, fades in after question typing completes */}
      {showAnswerInterface && (
        <Animated.View style={[styles.answerContainer, { opacity: answerFadeAnim }]}>
          <ScrollView
            style={styles.questionRendererWrapper}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <QuestionRenderer
              question={activeQuestion}
              value={activeResponse}
              onChange={handleResponseChange}
              error={error}
              noBackground
              disabled={isFetchingNext}
            />
          </ScrollView>
          <View style={styles.navigationWrapper}>
            <OnboardingNavigation
              onNext={handleSubmit}
              onBack={onPrevious}
              nextTitle={isFetchingNext ? 'Loading…' : 'Send'}
              nextDisabled={isFetchingNext || !isCurrentQuestionValid()}
              showBack={false}
              variant="single"
            />
          </View>
        </Animated.View>
      )}

      {informationComplete && (
        <View style={styles.completionContainer}>
          <View style={styles.completionContent}>
            <TypingDots />
          </View>
          <View style={styles.navigationWrapper}>
            <OnboardingNavigation
              onNext={onNext}
              onBack={onPrevious}
              nextTitle="Continue"
              nextDisabled={false}
              showBack={false}
              variant="single"
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.text, 0.1),
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.tertiary,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  contentWrapper: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  answerContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: createColorWithOpacity(colors.text, 0.1),
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: '55%',
  },
  questionRendererWrapper: {
    marginBottom: 16,
    maxHeight: 280,
  },
  navigationWrapper: {
    // Style for navigation buttons
  },
  completionContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: createColorWithOpacity(colors.text, 0.1),
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  completionContent: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
});