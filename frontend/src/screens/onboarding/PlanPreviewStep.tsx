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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import WeekNavigationAndOverview from '../../components/training/WeekNavigationAndOverview';
import { SimplePlanPreview } from '../../components/onboarding/SimplePlanPreview';
import { ChatMessage } from '../../components/shared/chat';
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
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [displayedWelcomeText, setDisplayedWelcomeText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingStartedRef = useRef(false);
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
    if (state?.trainingPlan) {
      setCurrentPlan(state.trainingPlan as any);
      setShowPlanPreview(true);
    }
  }, [state?.trainingPlan]);

  // Typing animation effect
  useEffect(() => {
    if (!aiWelcomeMessage || typingStartedRef.current) return;
    
    typingStartedRef.current = true;
    setIsTyping(true);
    setDisplayedWelcomeText('');
    
    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const typeText = () => {
      if (currentIndex < aiWelcomeMessage.length) {
        setDisplayedWelcomeText(aiWelcomeMessage.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(typeText, 30); // 30ms per character
      } else {
        setIsTyping(false);
      }
    };
    
    // Start typing after a short delay
    const startTimeout = setTimeout(() => {
      typeText();
    }, 500);
    
    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeoutId);
    };
  }, [aiWelcomeMessage]);

  // Update chat messages when displayed text changes
  useEffect(() => {
    if (displayedWelcomeText) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        message: displayedWelcomeText,
        isUser: false,
        timestamp: new Date(),
        isTyping: isTyping,
      };
      setChatMessages([welcomeMessage]);
    }
  }, [displayedWelcomeText, isTyping]);

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

  // Generate week navigation data for WeekNavigationAndOverview
  const weekNavigation = React.useMemo(() => {
    return {
      currentWeek: 1, // Always show week 1 for preview
      totalWeeks: 1, // Only 1 week for preview
      canGoBack: false, // No navigation in preview
      canGoForward: false, // No navigation in preview
    };
  }, []);

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
    console.log('🎯 PlanPreviewStep: Adding typing message:', typingMessage);
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
      
      const data = await trainingService.sendPlanFeedback(
        state.userProfile.id,
        planId,
        userMessage.message,
        backendFormatPlan,  // Send training plan in backend format (snake_case)
        state.userProfile.playbook,  // Send playbook from userProfile (validated above)
        personalInfo,  // Send personal info from userProfile (validated above)
        chatMessages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.message,
        })),
        jwtToken
      );

      // Remove typing indicator
      console.log('🎯 PlanPreviewStep: Removing typing message');
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
          console.log(`🎯 PlanPreviewStep: ${data.plan_updated ? 'Plan updated' : 'Plan synced'}, updating local state with backend response`);
          
          // Set updating state to show visual feedback (only if actually updated)
          if (data.plan_updated) {
            setIsUpdatingPlan(true);
          }
          
          // Backend returns plan in snake_case format - transform to camelCase for frontend
          console.log('🔄 PlanPreviewStep: Transforming plan from backend format (snake_case) to frontend format (camelCase)');
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
          
          // Use AI message from the updated plan if available, otherwise use the response
          const planAiMessage = updatedPlan?.aiMessage;
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
          
          // Clear updating state after a brief delay to show the update
          setTimeout(() => {
            setIsUpdatingPlan(false);
          }, 1000);
        }
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

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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
        {/* Plan Preview - Always show when plan exists */}
        {currentPlan && (
          <View style={styles.previewSection}>
            
            {/* Plan Update Indicator */}
            {isUpdatingPlan && (
              <View style={styles.updateIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.updateText}>Updating your plan...</Text>
              </View>
            )}
            
            {/* Week Navigation and Overview */}
            <WeekNavigationAndOverview
              weekNavigation={weekNavigation}
              dayIndicators={dayIndicators}
              onWeekChange={() => {}} // No-op for preview
              onDaySelect={setSelectedDayIndex}
              hideNavigation={true}
            />
            
            {/* Simple Plan Preview */}
            <View style={styles.dailyDetailContainer}>
              <SimplePlanPreview
                trainingPlan={currentPlan}
                selectedDayIndex={selectedDayIndex}
              />
            </View>
          </View>
        )}

        {/* Horizontal Divider */}
        <View style={styles.divider} />

        {/* Chat Section - Below exercises */}
        <View style={styles.chatSection}>
          
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
    flex: 0.5, // Takes 50% of available space
    paddingHorizontal: 16,
    paddingTop: 70, // Increased top margin
    paddingBottom: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dailyDetailContainer: {
    marginTop: 16,
    marginHorizontal: 16, // Match WeekNavigationAndOverview margin
    maxHeight: 240, // Show max 5-6 exercises (increased from 200)
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  chatSection: {
    flex: 0.4, // Takes 40% of available space
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20, // Add margin from bottom
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
