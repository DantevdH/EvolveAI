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
import { PROGRESS_CONFIG } from '@/src/constants/progressConfig';
import { InlineProgressIndicator } from '@/src/components/shared/InlineProgressIndicator';

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
  isGeneratingPlan = false,
  planGenerationError = null,
  planGenerationProgress = 0,
  onClose,
  showHeader = true,
}) => {
  const insets = useSafeAreaInsets();
  const hasQuestions = questions.length > 0;
  const activeQuestion = hasQuestions ? questions[questions.length - 1] : undefined;
  const [localResponses, setLocalResponses] = useState(responses);
  const scrollRef = useRef<ScrollView | null>(null);
  
  // Track which messages have completed typing (ID-based for stability)
  const [completedTypingIds, setCompletedTypingIds] = useState<Set<string>>(new Set());

  // Track previous message count to detect additions vs removals
  const prevMessagesLengthRef = useRef(chatMessages.length);

  // Track when chat messages have finished loading to prevent visual jumps
  const [chatMessagesStable, setChatMessagesStable] = useState(false);

  // Animation state for answer interface fade-in
  const [answerInterfaceVisible, setAnswerInterfaceVisible] = useState(false);
  const answerFadeAnim = useRef(new Animated.Value(0)).current;

  // Chat progress status text state
  const [chatStatusText, setChatStatusText] = useState<string | null>(null);
  const chatRequestStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalResponses(responses);
  }, [responses]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [chatMessages]);

  // Store chat messages length in ref for stable callback access
  const chatMessagesLengthRef = useRef(chatMessages.length);
  chatMessagesLengthRef.current = chatMessages.length;

  // Create stable typing complete handler - uses message ID for stability
  const handleTypingComplete = useCallback((messageId: string) => {
    setCompletedTypingIds(prev => {
      if (prev.has(messageId)) return prev;
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });

    // Auto-scroll to bottom when typing completes
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, []);

  // Handle typing state when messages change (ID-based tracking)
  useEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    const currentLength = chatMessages.length;



    if (currentLength > prevLength) {
      // New messages added - determine which to mark as completed
      setCompletedTypingIds(prev => {
        const newSet = new Set(prev);

        if (prevLength === 0 && currentLength > 1) {
          // FIRST BATCH: Check if messages are from database (have skipAnimation: true)
          // Database restored messages: mark all with skipAnimation as completed (show immediately)
          // Fresh backend messages: DON'T mark as completed (animate sequentially)
          chatMessages.slice(0, -1).forEach(msg => {
            if (msg?.id && msg.skipAnimation === true) {
              // Only mark as completed if it's a restored message (skipAnimation: true)
              newSet.add(msg.id);
            }
          });
        } else {
          // SUBSEQUENT BATCHES: Mark all previous messages as completed
          chatMessages.slice(0, prevLength).forEach(msg => {
            if (msg?.id) {
              newSet.add(msg.id);
            }
          });
        }

        return newSet;
      });
    } else if (currentLength < prevLength) {
      // Messages removed - clean up invalid IDs
      const validIds = new Set<string>();
      chatMessages.forEach(msg => {
        if (msg && msg.id && completedTypingIds.has(msg.id)) {
          validIds.add(msg.id);
        }
      });
      setCompletedTypingIds(validIds);
    }

    prevMessagesLengthRef.current = currentLength;
  }, [chatMessages.length, chatMessages, completedTypingIds]);

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

  // Continuous scrolling while messages are typing
  useEffect(() => {
    // Check if there are any messages currently typing
    // A message is typing if it exists in chatMessages but NOT in completedTypingIds
    // and it's not a user message (user messages don't animate)
    const hasActiveTyping = chatMessages.some(msg => 
      msg && 
      msg.id && 
      msg.from !== 'user' && 
      !completedTypingIds.has(msg.id)
    );

    if (!hasActiveTyping) {
      return; // No typing messages, no need to scroll
    }

    // Set up interval to continuously scroll while typing
    const scrollInterval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100); // Scroll every 100ms while typing

    // Cleanup interval when typing completes or component unmounts
    return () => {
      clearInterval(scrollInterval);
    };
  }, [chatMessages, completedTypingIds]);

  // Time-based chat status text using PROGRESS_CONFIG.chat.stagedLabels
  // Don't show status text when generating plan (show circular progress instead)
  useEffect(() => {
    if (!isFetchingNext || isGeneratingPlan) {
      setChatStatusText(null);
      chatRequestStartTimeRef.current = null;
      return;
    }

    const chatConfig = PROGRESS_CONFIG.chat;
    const stagedLabels = chatConfig.stagedLabels || {};
    chatRequestStartTimeRef.current = chatRequestStartTimeRef.current ?? Date.now();

    const updateStatus = () => {
      if (!chatRequestStartTimeRef.current) return;
      const elapsed = Date.now() - chatRequestStartTimeRef.current;

      // Find the label with the highest threshold <= elapsed
      const thresholds = Object.keys(stagedLabels)
        .map(key => parseInt(key, 10))
        .filter(ms => !Number.isNaN(ms))
        .sort((a, b) => a - b);

      let activeLabel: string | null = null;
      for (const threshold of thresholds) {
        if (elapsed >= threshold) {
          activeLabel = stagedLabels[threshold] || activeLabel;
        } else {
          break;
        }
      }

      setChatStatusText(activeLabel);
    };

    updateStatus();
    const intervalId = setInterval(updateStatus, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [isFetchingNext, isGeneratingPlan]);

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

  // Check if we're generating the first question (show fullscreen spinner)
  const isGeneratingFirstQuestion = questions.length === 0 && isFetchingNext;

  // Check if the last message has finished typing animation
  const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : undefined;
  const lastMessageTypingComplete = lastMessage ? completedTypingIds.has(lastMessage.id) : false;

  // When information is complete, check if the closing message has finished typing
  // Hide continue button when generating plan
  const showContinueButton = informationComplete && lastMessageTypingComplete && !isGeneratingPlan;

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
            <View style={styles.headerAvatarContainer}>
              <LinearGradient
                colors={[createColorWithOpacity(colors.secondary, 0.35), createColorWithOpacity(colors.background, 0.9)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerAvatar}
              >
                <Ionicons name="fitness" size={20} color={colors.primary} />
              </LinearGradient>
            </View>
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
        {chatStatusText && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{chatStatusText}</Text>
          </View>
        )}
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
              // Auto-mark user messages as completed (they don't animate)
              if (!completedTypingIds.has(msg.id)) {
                // Use setTimeout to avoid state update during render
                setTimeout(() => {
                  setCompletedTypingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.add(msg.id);
                    return newSet;
                  });
                }, 0);
              }

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

            // Determine if this message should start typing:
            // 1. Always ready if it's a typing indicator
            // 2. Always ready if skipAnimation is true
            // 3. If message is already in completedTypingIds, skip animation (programmatically marked as done)
            // 4. Ready if it's the first message
            // 5. Ready if previous message has completed typing
            const isAlreadyCompleted = completedTypingIds.has(msg.id);
            const shouldSkipAnimation = msg.skipAnimation === true || isTypingIndicator || isAlreadyCompleted;
            const previousMessage = index > 0 ? chatMessages[index - 1] : null;
            const previousCompleted = !previousMessage || completedTypingIds.has(previousMessage.id);
            const isFirstMessage = index === 0;

            const isReadyToStart = shouldSkipAnimation || isFirstMessage || previousCompleted;


            // Don't render if not ready (but DO render if skipAnimation or typing indicator)
            if (!isReadyToStart && !shouldSkipAnimation && !isTypingIndicator) {
              return null;
            }

            return (
              <AIChatMessage
                key={`${msg.id}-${index}`}
                customMessage={isTypingIndicator ? undefined : (sanitizedMessage || '')}
                isLoading={isTypingIndicator}
                skipAnimation={shouldSkipAnimation}
                onTypingComplete={() => handleTypingComplete(msg.id)}
                showHeader={false}
              />
            );
          })}
          {isFetchingNext && questions.length > 0 && !isGeneratingPlan && (
            <AIChatMessage
              key="typing-inline"
              isLoading={true}
              showHeader={false}
            />
          )}
          {isGeneratingPlan && (
            <InlineProgressIndicator progress={planGenerationProgress} />
          )}
          {planGenerationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{planGenerationError}</Text>
            </View>
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

      {showContinueButton && (
        <View style={styles.completionContainer}>
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
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.35),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  statusBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.tertiary,
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
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: createColorWithOpacity('#e74c3c', 0.1),
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
  },
});