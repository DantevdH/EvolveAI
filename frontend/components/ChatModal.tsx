/**
 * Chat Modal Component
 * Reusable chat interface that uses existing chat components
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import { ChatMessage as ChatBubble } from '@/src/components/shared/chat/ChatMessage';
import { AIChatMessage } from '@/src/components/shared/chat/AIChatMessage';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/config/supabase';
import { trainingService } from '@/src/services/onboardingService';
import { getChatWelcomeMessage } from '@/src/utils/chatWelcomeMessages';
import {
  transformTrainingPlan,
  reverseTransformTrainingPlan,
  transformUserProfileToPersonalInfo,
} from '@/src/utils/trainingPlanTransformer';
import { TrainingPlan } from '@/src/types/training';
import { useApiCallWithBanner } from '@/src/hooks/useApiCallWithBanner';

interface ChatMessageType {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialMessage?: string;
  mode?: 'plan-review' | 'general';
  onPlanAccepted?: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  initialMessage,
  mode = 'general',
  onPlanAccepted,
}) => {
  const { state, dispatch, setTrainingPlan, refreshUserProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const isPlanReview = useMemo(
    () => mode === 'plan-review' && !!state.trainingPlan && !state.userProfile?.planAccepted,
    [mode, state.trainingPlan, state.userProfile?.planAccepted]
  );

  const welcomeMessage = useMemo(() => {
    if (initialMessage) {
      return initialMessage;
    }

    if (isPlanReview) {
      const planMessage =
        (state.trainingPlan as any)?.aiMessage ||
        (state.trainingPlan as any)?.ai_message ||
        `Hi ${state.userProfile?.username || 'there'}! 👋\n\n🎉 Amazing! Here's your personalized plan. Let me know if anything needs tweaking!`;
      return planMessage;
    }

    return getChatWelcomeMessage(state.userProfile?.username);
  }, [initialMessage, isPlanReview, state.trainingPlan, state.userProfile?.username]);

  // Reset / initialize when modal visibility changes
  useEffect(() => {
    if (visible) {
      setCurrentPlan((state.trainingPlan as TrainingPlan) || null);
      if (messages.length === 0 && welcomeMessage) {
        const welcome: ChatMessageType = {
        id: 'welcome',
          message: welcomeMessage,
        isUser: false,
        timestamp: new Date(),
      };
        setMessages([welcome]);
      }
    } else {
      setMessages([]);
      setInputMessage('');
      setIsLoading(false);
    }
  }, [visible, welcomeMessage, state.trainingPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const convertToRecord = (data: any): Record<string, any> => {
    if (!data) return {};
    if (data instanceof Map) {
      const record: Record<string, any> = {};
      data.forEach((value, key) => {
        record[key] = value;
      });
      return record;
    }
    return { ...data };
  };

  const addAiMessage = useCallback((content: string) => {
    const aiMessage: ChatMessageType = {
      id: Date.now().toString(),
      message: content,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev.filter(msg => msg.id !== 'typing'), aiMessage]);
  }, []);

  const buildConversationHistory = useCallback(
    (userMessage: ChatMessageType) => {
      return [
        ...messages
          .filter(msg => msg.id !== 'typing')
          .map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.message,
          })),
        {
          role: 'user' as const,
          content: userMessage.message,
        },
      ];
    },
    [messages]
  );

  // API call with error handling for chat/plan feedback
  const { execute: executePlanFeedback, ErrorBannerComponent: ChatErrorBanner } = useApiCallWithBanner(
    async (userMessage: ChatMessageType) => {
      if (!currentPlan) {
        throw new Error('Your training plan is still loading. Please try again in a moment.');
      }

      const planId =
        typeof currentPlan.id === 'string' ? parseInt(currentPlan.id, 10) : currentPlan.id;

      let jwtToken = state.session?.access_token;
      if (!jwtToken) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        jwtToken = session?.access_token;
      }

      if (!jwtToken) {
        throw new Error('JWT token not available. Please sign in again.');
      }

      if (!state.userProfile || !state.userProfile.id) {
        throw new Error('User profile not found. Please reload the app.');
      }

      if (!state.userProfile.playbook) {
        throw new Error('Training profile not fully loaded. Please reload the app.');
      }

      const backendFormatPlan = reverseTransformTrainingPlan(currentPlan);
      const initialResponsesRecord = convertToRecord(state.userProfile.initial_responses);
      const personalInfo = transformUserProfileToPersonalInfo(state.userProfile);

      if (!personalInfo) {
        throw new Error('Failed to prepare user profile data. Please reload the app.');
      }

      const conversationHistory = buildConversationHistory(userMessage);

      const data = await trainingService.sendPlanFeedback(
        state.userProfile.id,
        planId,
        userMessage.message,
        backendFormatPlan,
        state.userProfile.playbook,
        personalInfo,
        conversationHistory,
        jwtToken
      );

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      if (!data.success) {
        throw new Error(data.error || 'Failed to process feedback');
      }

      if (data.navigate_to_main_app) {
        const aiResponse =
          data.ai_response ||
          "Great! You're all set. I'll take you to your dashboard and stay available if you need tweaks. 🚀";
        addAiMessage(aiResponse);
        await refreshUserProfile();
        onPlanAccepted?.();
        onClose();
        return;
      }

      if (data.updated_plan) {
        const updatedPlan = transformTrainingPlan(data.updated_plan);
        setCurrentPlan(updatedPlan);
        setTrainingPlan(updatedPlan);

        if (data.updated_playbook && state.userProfile) {
          dispatch({
            type: 'SET_USER_PROFILE',
            payload: {
              ...state.userProfile,
              playbook: data.updated_playbook,
            },
          });
        }
      }

      const messageToShow =
        (data.updated_plan && transformTrainingPlan(data.updated_plan)?.aiMessage) ||
        data.ai_response ||
        "Here's an updated version of your plan. Let me know what you think!";

      addAiMessage(messageToShow);
    },
    {
      retryAttempts: 3,
    }
  );

  const handlePlanFeedback = useCallback(
    async (userMessage: ChatMessageType) => {
      try {
        await executePlanFeedback(userMessage);
      } catch (error) {
        // Error is already handled by useApiCallWithBanner
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      }
    },
    [executePlanFeedback]
  );

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      message: inputMessage.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessageType = {
      id: 'typing',
      message: '',
      isUser: false,
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    // Both plan-review and general modes use the same chat endpoint
    // The backend intelligently classifies intent and responds accordingly
    await handlePlanFeedback(userMessage);
    setIsLoading(false);
  };

  const exampleQuestions = [
    "How do I increase my strength?",
    "What's the best cardio routine?",
    "How often should I train?",
    "Can you adjust my plan?",
    "What about rest days?",
    "Nutrition tips?",
  ];

  const handleExampleQuestionPress = (question: string) => {
    setInputMessage(question);
  };

  const lastMessage = messages[messages.length - 1];
  const shouldShowExamples =
    messages.length > 0 &&
    lastMessage &&
    !lastMessage.isUser &&
    lastMessage.id !== 'typing';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.overlay}>
          <ChatErrorBanner />
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={[styles.header, { paddingTop:  18}]}>
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
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.contentWrapper}>
              {/* Messages and Example Questions - Scrollable together */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((message) => {
                  if (message.isUser) {
                    return (
                      <ChatBubble
                        key={message.id}
                        message={message.message}
                        isUser={true}
                        timestamp={message.timestamp}
                        isTyping={message.isTyping}
                      />
                    );
                  }

                  const isTypingIndicator = message.id === 'typing';
                  const isWelcomeMessage = message.id === 'welcome';

                  return (
                    <AIChatMessage
                      key={message.id}
                      customMessage={isTypingIndicator ? undefined : message.message}
                      username={state.userProfile?.username}
                      isLoading={isTypingIndicator}
                      skipAnimation={isTypingIndicator ? true : !isWelcomeMessage}
                      showHeader={false}
                    />
                  );
                })}
              </ScrollView>

              {shouldShowExamples && (
                <View style={styles.exampleQuestionsWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.exampleQuestionsScroll}
                    contentContainerStyle={styles.exampleQuestionsContent}
                  >
                    {exampleQuestions.map((question, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.exampleQuestionChip}
                        onPress={() => handleExampleQuestionPress(question)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.exampleQuestionText}>{question}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Input field */}
            <View style={[styles.inputContainer, { paddingBottom:  18 }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  placeholder="Ask your AI Coach..."
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                activeOpacity={0.7}
              >
                {!inputMessage.trim() || isLoading ? (
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={colors.muted} 
                  />
                ) : (
                  <LinearGradient
                    colors={[createColorWithOpacity(colors.primary, 0.8), createColorWithOpacity(colors.primary, 0.6)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color={colors.text} 
                    />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)', // dimmed background but still visible
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalBox: {
    width: '100%',
    maxWidth: 980,
    height: '70%', // 70% of screen height
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.text, 0.1),
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
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  exampleQuestionsWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginTop: -4,
  },
  exampleQuestionsScroll: {
    maxHeight: 56,
  },
  exampleQuestionsContent: {
    gap: 10,
    alignItems: 'center',
  },
  exampleQuestionChip: {
    borderRadius: 18,
    backgroundColor: createColorWithOpacity(colors.primary, 0.06),
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.primary, 0.2),
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: createColorWithOpacity(colors.primary, 0.15),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  exampleQuestionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.inputBackground || colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.text, 0.1),
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 80,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatModal;

