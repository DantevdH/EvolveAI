import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import WeeklyOverview from '../../components/training/WeeklyOverview';
import DailyTrainingDetail from '../../components/training/DailyTrainingDetail';
import ChatMessage from '../../components/onboarding/ChatMessage';
import { useAuth } from '@/src/context/AuthContext';
import { TrainingPlan, DailyTraining } from '../../types/training';
import { trainingService } from '../../services/onboardingService';

interface PlanPreviewStepProps {
  onContinue: () => void;
  onBack: () => void;
  planMetadata?: {
    formattedInitialResponses?: string;
    formattedFollowUpResponses?: string;
  };
}

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

const PlanPreviewStep: React.FC<PlanPreviewStepProps> = ({
  onContinue,
  onBack,
  planMetadata
}) => {
  const { state, refreshUserProfile } = useAuth();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize with AI completion message from training plan
  useEffect(() => {
    if (state?.trainingPlan) {
      setCurrentPlan(state.trainingPlan as any);
      
      // Use AI-generated message from the training plan, or fallback to a default message
      const aiMessage = (state.trainingPlan as any)?.aiMessage || 
        (state.trainingPlan as any)?.ai_message ||
        `Hi ${state.userProfile?.username || 'there'}! 👋\n\n🎉 Amazing! I've created your personalized plan! We work in focused 2-week blocks so we can track your progress and adapt as you grow stronger. Take a look at your plan - I'm curious what you think! 💪✨`;
      
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        message: aiMessage,
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages([welcomeMessage]);
    }
  }, [state]);

  // Generate day indicators for WeeklyOverview
  const dayIndicators = React.useMemo(() => {
    if (!currentPlan?.weeklySchedules?.[0]?.dailyTrainings) {
      return [];
    }

    return currentPlan.weeklySchedules[0].dailyTrainings.map((day, index) => ({
      dayOfWeek: day.dayOfWeek,
      isSelected: index === selectedDayIndex,
      isCompleted: false, // Not relevant for preview
      isRestDay: day.isRestDay,
      isToday: false, // Not relevant for preview
      isPastWeek: false, // Not relevant for preview
    }));
  }, [currentPlan, selectedDayIndex]);

  const selectedDayTraining = currentPlan?.weeklySchedules?.[0]?.dailyTrainings?.[selectedDayIndex] || null;

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputMessage.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      message: '',
      isUser: false,
      timestamp: new Date(),
      isTyping: true,
    };
    setChatMessages(prev => [...prev, typingMessage]);

    try {
      const planId = typeof currentPlan?.id === 'string' ? parseInt(currentPlan.id, 10) : currentPlan?.id!;
      
      const data = await trainingService.sendPlanFeedback(
        state.userProfile?.id!,
        planId,
        userMessage.message,
        chatMessages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.message,
        })),
        state.exercises || [],
        planMetadata?.formattedInitialResponses,
        planMetadata?.formattedFollowUpResponses
      );

      // Remove typing indicator
      setChatMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      if (data.success) {
        // If satisfied, navigate to main app
        if (data.navigate_to_main_app) {
          // Show short confirmation, then continue
          const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            message: data.ai_response || "Great! Taking you to your dashboard. 🚀",
            isUser: false,
            timestamp: new Date(),
          };
          setChatMessages(prev => [...prev, aiMessage]);
          await refreshUserProfile();
          onContinue();
          return;
        }

        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          message: data.ai_response,
          isUser: false,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, aiMessage]);

        // If plan was updated, refresh the plan
        if (data.plan_updated && data.updated_plan) {
          setCurrentPlan(data.updated_plan);
          
          // Refresh user profile to get the updated plan
          await refreshUserProfile();
          
          // Use AI message from the updated plan if available, otherwise use the response
          const planAiMessage = data.updated_plan?.ai_message;
          if (planAiMessage && planAiMessage !== data.ai_response) {
            // Replace the last AI message with the one from the plan
            setChatMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0) {
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  message: planAiMessage
                };
              }
              return newMessages;
            });
          }
          
          // Add change explanation if provided
          if (data.changes_explanation) {
            const changeMessage: ChatMessage = {
              id: Date.now().toString() + '_changes',
              message: `📝 **Changes Made:**\n${data.changes_explanation}`,
              isUser: false,
              timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, changeMessage]);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to process feedback');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator
      setChatMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  if (!currentPlan) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No training plan found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Your Plan</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Plan Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Your Training Week</Text>
        
        {/* Weekly Overview */}
        <WeeklyOverview
          dayIndicators={dayIndicators}
          onDaySelect={setSelectedDayIndex}
        />
        
        {/* Daily Training Detail */}
        <View style={styles.dailyDetailContainer}>
          <DailyTrainingDetail
            dailyTraining={selectedDayTraining}
            isPastWeek={false}
            onExerciseToggle={() => {}} // Not interactive in preview
            onSetUpdate={async () => {}} // Not interactive in preview
            onExerciseDetail={() => {}} // Not interactive in preview
            onOneRMCalculator={() => {}} // Not interactive in preview
            onSwapExercise={() => {}} // Not interactive in preview
            onReopenTraining={() => {}} // Not interactive in preview
            onIntensityUpdate={async () => {}} // Not interactive in preview
          />
        </View>
      </View>

      {/* Chat Section */}
      <View style={styles.chatSection}>
        <Text style={styles.sectionTitle}>Questions or Changes?</Text>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.message}
              isUser={message.isUser}
              timestamp={message.timestamp}
              isTyping={message.isTyping}
            />
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Ask questions or suggest changes..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputMessage.trim() && !isLoading ? 'white' : colors.muted} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  previewSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dailyDetailContainer: {
    marginTop: 16,
  },
  chatSection: {
    height: 300,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default PlanPreviewStep;
