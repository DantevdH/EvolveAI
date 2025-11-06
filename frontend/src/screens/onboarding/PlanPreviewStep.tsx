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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';
import TrainingHeader from '../../components/training/header/TrainingHeader';
import DailyTrainingDetail from '../../components/training/dailyDetail/DailyTrainingDetail';
import { ChatMessage } from '../../components/shared/chat';
import { AIChatMessage } from '../../components/shared/chat/AIChatMessage';
import { useAuth } from '@/src/context/AuthContext';
import { TrainingPlan, DailyTraining } from '../../types/training';
import { trainingService } from '../../services/onboardingService';
import { reverseTransformTrainingPlan, transformTrainingPlan, transformUserProfileToPersonalInfo } from '../../utils/trainingPlanTransformer';
import { supabase } from '@/src/config/supabase';

interface PlanPreviewStepProps {
  onContinue: () => void;
  onBack: () => void;
  planMetadata?: {
    formattedInitialResponses?: string;
    formattedFollowUpResponses?: string;
  };
  initialQuestions?: any[];
  initialResponses?: Record<string, any>;
  followUpQuestions?: any[];
  followUpResponses?: Record<string, any>;
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
  planMetadata,
  initialQuestions = [],
  initialResponses = {},
  followUpQuestions = [],
  followUpResponses = {},
}) => {
  const { state, dispatch, refreshUserProfile, setTrainingPlan } = useAuth();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null);
  const [planUpdated, setPlanUpdated] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Get the AI message from training plan
  const aiWelcomeMessage = React.useMemo(() => {
    if (!currentPlan) return '';
    return (currentPlan as any)?.aiMessage || 
      (currentPlan as any)?.ai_message ||
      `Hi ${state.userProfile?.username || 'there'}! 👋\n\n🎉 Amazing! I've created your personalized plan! We work in focused 2-week blocks so we can track your progress and adapt as you grow stronger. Take a look at your plan - I'm curious what you think! 💪✨`;
  }, [currentPlan, state?.userProfile?.username]);

  // Initialize training plan from AuthContext (plan is loaded during generation spinner)
  useEffect(() => {
    if (state?.trainingPlan && !currentPlan) {
      setCurrentPlan(state.trainingPlan as any);
    }
  }, [state?.trainingPlan, currentPlan]);
  
  // Add welcome message after plan is set
  useEffect(() => {
    if (currentPlan && chatMessages.length === 0 && aiWelcomeMessage) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        message: aiWelcomeMessage,
        isUser: false,
        timestamp: new Date(),
        isTyping: false, // AIChatMessage will handle typing animation
      };
      setChatMessages([welcomeMessage]);
    }
  }, [currentPlan, aiWelcomeMessage, chatMessages.length]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  // Generate day indicators for WeekNavigationAndOverview
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

  const selectedDayTraining = React.useMemo(() => {
    const training = currentPlan?.weeklySchedules?.[0]?.dailyTrainings?.[selectedDayIndex] || null;
    if (!training) return null;
    
    // Type assertion to access transformer-created properties
    const trainingAny = training as any;
    
    // Ensure exercises array exists - combine strengthExercises and enduranceSessions if needed
    if (!training.exercises && (trainingAny.strengthExercises || trainingAny.enduranceSessions)) {
      const combinedExercises = [
        ...(trainingAny.strengthExercises || []),
        ...(trainingAny.enduranceSessions || [])
      ].sort((a, b) => (a.executionOrder || a.order || 0) - (b.executionOrder || b.order || 0));
      
      return {
        ...training,
        exercises: combinedExercises
      } as any;
    }
    
    return training;
  }, [currentPlan, selectedDayIndex]);

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

    // Add typing indicator using AIChatMessage (will show loading dots)
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
      
      // Get JWT token from session in AuthContext state (ensure available in both scenarios)
      let jwtToken = state.session?.access_token;
      
      // Fallback: Get session directly from Supabase if not in state (for resume scenario)
      if (!jwtToken) {
        const { data: { session } } = await supabase.auth.getSession();
        jwtToken = session?.access_token;
      }
      
      if (!jwtToken) {
        throw new Error('JWT token not available. Please sign in again.');
      }
      
      // VALIDATION: Ensure userProfile exists before calling backend
      if (!state.userProfile || !state.userProfile.id) {
        Alert.alert(
          'Error',
          'User profile not found. Please reload the app.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // VALIDATION: Ensure playbook exists (backend requires it)
      if (!state.userProfile.playbook) {
        console.warn('⚠️ Playbook not loaded - backend will return error');
        // Backend requires playbook, so we can't proceed without it
        Alert.alert(
          'Error',
          'Training profile not fully loaded. Please reload the app.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Convert plan from camelCase (frontend) to snake_case (backend) before sending
      const backendFormatPlan = reverseTransformTrainingPlan(currentPlan);
      
      // Convert Map to Record for responses (same as generate-plan)
      const initialResponsesRecord: Record<string, any> = {};
      if (initialResponses instanceof Map) {
        initialResponses.forEach((value, key) => {
          initialResponsesRecord[key] = value;
        });
      } else {
        Object.assign(initialResponsesRecord, initialResponses);
      }

      const followUpResponsesRecord: Record<string, any> = {};
      if (followUpResponses instanceof Map) {
        followUpResponses.forEach((value, key) => {
          followUpResponsesRecord[key] = value;
        });
      } else {
        Object.assign(followUpResponsesRecord, followUpResponses);
      }
      
      // Transform userProfile to PersonalInfo for backend
      const personalInfo = transformUserProfileToPersonalInfo(state.userProfile);
      
      // VALIDATION: Ensure personalInfo transformation succeeded
      if (!personalInfo) {
        Alert.alert(
          'Error',
          'Failed to prepare user profile data. Please reload the app.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Build conversation history: include existing messages + current user message
      // Note: chatMessages state might not be updated yet, so we include userMessage directly
      const conversationHistory = [
        ...chatMessages
          .filter(msg => msg.id !== 'typing') // Exclude typing indicator
          .map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.message,
          })),
        {
          role: 'user' as const,
          content: userMessage.message,
        }
      ];

      const data = await trainingService.sendPlanFeedback(
        state.userProfile.id,
        planId,
        userMessage.message,
        backendFormatPlan,  // Send training plan in backend format (snake_case)
        state.userProfile.playbook,  // Send playbook from userProfile (validated above)
        personalInfo,  // Send personal info from userProfile (validated above)
        conversationHistory,  // Include all previous messages + current user message
        jwtToken
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

        // Always sync plan with backend response (updated or not)
        if (data.updated_plan) {
          // Debug: scan backend plan for any null IDs before transform
          const scanNullIds = (plan: any) => {
            try {
              if (plan?.id == null) console.error('[Feedback] Null plan id in updated_plan');
              plan?.weekly_schedules?.forEach((w: any, wi: number) => {
                if (w?.id == null) console.error(`[Feedback] Null weekly_schedule id at [${wi}]`);
                w?.daily_trainings?.forEach((d: any, di: number) => {
                  if (d?.id == null) console.error(`[Feedback] Null daily_training id at [${wi}][${di}]`);
                  d?.strength_exercises?.forEach((se: any, ei: number) => {
                    if (se == null) console.error(`[Feedback] strength_exercises[${wi}][${di}][${ei}] is null`);
                    else {
                      if (se?.id == null) console.error(`[Feedback] Null strength_exercise id at [${wi}][${di}][${ei}]`);
                      if (se?.exercise_id == null) console.error(`[Feedback] Null exercise_id at [${wi}][${di}][${ei}]`);
                    }
                  });
                  d?.endurance_sessions?.forEach((es: any, si: number) => {
                    if (es?.id == null) console.error(`[Feedback] Null endurance_session id at [${wi}][${di}][${si}]`);
                  });
                });
              });
            } catch (e) {
              console.warn('[Feedback] scanNullIds exception', e);
            }
          };
          scanNullIds(data.updated_plan);
          
          // Set updating state to show visual feedback (only if actually updated)
          if (data.plan_updated) {
            setIsUpdatingPlan(true);
            setPlanUpdated(true);
          }
          
          // Backend returns plan in snake_case format - transform to camelCase for frontend
          const updatedPlan = transformTrainingPlan(data.updated_plan);
          
          // Update userProfile with updated playbook from backend
          if (data.updated_playbook && state.userProfile) {
            dispatch({
              type: 'SET_USER_PROFILE',
              payload: {
                ...state.userProfile,
                playbook: data.updated_playbook
              }
            });
          }
          
          // Update local plan state with transformed data
          setCurrentPlan(updatedPlan);
          
          // Update AuthContext state to keep it in sync
          setTrainingPlan(updatedPlan);
          
          // Clear updating state after a brief delay to show the update
          setTimeout(() => {
            setIsUpdatingPlan(false);
            // Clear the plan updated flag after showing it
            setTimeout(() => {
              setPlanUpdated(false);
            }, 3000);
          }, 1000);
        }

        // Add AI response message (use plan's aiMessage if available, otherwise use response)
        const messageToShow = data.updated_plan 
          ? (transformTrainingPlan(data.updated_plan)?.aiMessage || data.ai_response)
          : data.ai_response;
        
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          message: messageToShow,
          isUser: false,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to process feedback');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator
      setChatMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      // Add error message with more specific error handling
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('plan update')) {
          errorMessage = 'Failed to update your plan. Please try again or contact support if the issue persists.';
        }
      }
      
      const errorChatMessage: ChatMessage = {
        id: Date.now().toString(),
        message: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Show error state if no plan (should not happen as plan is loaded during generation)
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
      {/* Main Content Container */}
      <View style={styles.contentContainer}>
        {/* Plan Preview - Fixed header, scrollable exercises */}
        {currentPlan && (
          <View style={styles.previewSection}>
            {/* Plan Update Indicator */}
            {isUpdatingPlan && (
              <View style={styles.updateIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.updateText}>Updating your plan...</Text>
              </View>
            )}
            
            {/* Plan Updated Success Indicator */}
            {planUpdated && !isUpdatingPlan && (
              <View style={styles.updatedIndicator}>
                <Ionicons name="checkmark-circle" size={20} color={colors.tertiary} />
                <Text style={styles.updatedText}>Plan updated successfully!</Text>
              </View>
            )}
            
            {/* Training Header - Fixed at top */}
            <TrainingHeader
              dayIndicators={dayIndicators}
              onDaySelect={setSelectedDayIndex}
              currentWeek={1}
              onBackToMap={undefined} // Hide back button in preview
              progressRing={undefined} // Hide progress ring in preview (optional)
              hideWeekTitle={true} // Hide "Week 1" title in preview
            />
            
            {/* Daily Training Detail - Scrollable exercises container */}
            <ScrollView 
              style={styles.exercisesScrollView}
              contentContainerStyle={styles.exercisesScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <DailyTrainingDetail
                dailyTraining={selectedDayTraining}
                isPastWeek={false}
                onExerciseToggle={() => {}} // No-op for preview
                onSetUpdate={async () => {}} // No-op for preview
                onExerciseDetail={() => {}} // No-op for preview
                onOneRMCalculator={() => {}} // No-op for preview
                onSwapExercise={undefined} // Hide swap exercise
                onReopenTraining={undefined} // Hide reopen training
                onAddExercise={undefined} // Hide add exercise
                onAddEnduranceSession={undefined} // Hide add endurance
                onRemoveExercise={undefined} // Hide remove exercise
                onToggleChange={undefined} // Hide toggle change
                isStrengthMode={undefined} // Hide strength mode toggle
                hideDayName={true} // Hide weekday name (e.g., "Monday") in preview
                hideExerciseCompletionButton={true} // Hide completion button in preview
                hideExerciseExpandButton={true} // Hide expand button in preview
                hideExerciseInfoButton={true} // Hide info button in preview
                exerciseCompactMode={true} // Reduce exercise card height in preview
              />
            </ScrollView>
          </View>
        )}

        {/* Gradient overlay above chat for smooth transition */}
        <LinearGradient
          colors={[
            'transparent',
            createColorWithOpacity(colors.background, 0.3),
            createColorWithOpacity(colors.background, 0.7),
            colors.background
          ]}
          locations={[0, 0.4, 0.7, 1]}
          style={styles.chatGradientOverlay}
          pointerEvents="none"
        />

        {/* Chat Section - Fixed overlay at bottom */}
        <LinearGradient
          colors={[
            colors.background,
            createColorWithOpacity(colors.background, 0.98),
            colors.background
          ]}
          style={styles.chatSection}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.length === 0 ? (
              // Show empty state if no messages
              <View style={styles.emptyChatContainer}>
                <Text style={styles.emptyChatText}>Start a conversation with your AI Coach...</Text>
              </View>
            ) : (
              chatMessages.map((message) => {
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
                } else {
                  // Use AIChatMessage for AI messages
                  // - Welcome message (id: 'welcome'): show typing animation
                  // - Typing indicator (id: 'typing'): show loading dots (three dots)
                  // - Other AI messages: show typing animation (cool effect)
                  const isWelcomeMessage = message.id === 'welcome';
                  const isTypingIndicator = message.id === 'typing';
                  
                  return (
                    <AIChatMessage
                      key={message.id}
                      customMessage={isTypingIndicator ? undefined : (message.message || undefined)}
                      username={state.userProfile?.username}
                      isLoading={isTypingIndicator}
                      skipAnimation={isTypingIndicator ? true : false} // Show typing animation for all AI messages except typing indicator
                      showHeader={true}
                    />
                  );
                }
              })
            )}
          </ScrollView>

          {/* Gamified Chat Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
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
        </LinearGradient>
      </View>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0, // Important for flex children to shrink
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
    paddingTop: 70, // Space for status bar
    // TrainingHeader has its own horizontal margins
  },
  exercisesScrollView: {
    flex: 1,
  },
  exercisesScrollContent: {
    paddingBottom: 400, // Space for chat overlay at bottom
  },
  chatGradientOverlay: {
    position: 'absolute',
    bottom: 400, // Position above chat section
    left: 0,
    right: 0,
    height: 100, // Height of gradient transition
    zIndex: 1, // Above exercises but below chat
  },
  updateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  updateText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  updatedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  updatedText: {
    color: colors.tertiary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  chatSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 400, // Fixed height for chat overlay
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  chatContainer: {
    flex: 1,
    maxHeight: 280, // Limit chat messages area (increased to match larger chat section)
  },
  chatContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
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
