/**
 * Chat Modal Component
 * Reusable chat interface that uses existing chat components
 */

import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import { ChatMessage } from '@/src/components/shared/chat/ChatMessage';
import { AIChatMessage } from '@/src/components/shared/chat/AIChatMessage';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/config/supabase';

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
}

const ChatModal: React.FC<ChatModalProps> = ({ visible, onClose }) => {
  const { state } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcomeMessage: ChatMessageType = {
        id: 'welcome',
        message: `Hi ${state.userProfile?.username || 'there'}! 👋\n\nI'm your AI Coach. How can I help you today? 💪`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [visible, state.userProfile?.username]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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

    try {
      // Get JWT token
      let jwtToken = state.session?.access_token;
      if (!jwtToken) {
        const { data: { session } } = await supabase.auth.getSession();
        jwtToken = session?.access_token;
      }

      if (!jwtToken) {
        throw new Error('JWT token not available. Please sign in again.');
      }

      // TODO: Replace with your actual chat API endpoint
      // For now, using a placeholder response
      // You can integrate with your backend chat API here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      // Add AI response
      const aiMessage: ChatMessageType = {
        id: Date.now().toString(),
        message: `Thanks for your message! I'm here to help with your training questions. This is a placeholder response - you can integrate your chat API here.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      const errorMessage: ChatMessageType = {
        id: Date.now().toString(),
        message: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.modalContent, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
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
                  <ChatMessage
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

          {/* Input field */}
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 12 }]}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingBottom: 16,
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
    paddingTop: 12,
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

