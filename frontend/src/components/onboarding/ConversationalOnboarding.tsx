import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingBackground, ProgressOverlay } from './ui';
import { WelcomeStep } from '../../screens/onboarding/WelcomeStep';
import { PersonalInfoStep } from '../../screens/onboarding/PersonalInfoStep';
import { GoalDescriptionStep } from '../../screens/onboarding/GoalDescriptionStep';
import { ExperienceLevelStep } from '../../screens/onboarding/ExperienceLevelStep';
import { QuestionsStep } from '../../screens/onboarding/QuestionsStep';
import { ErrorDisplay } from '../ui/ErrorDisplay';
import { trainingService } from '../../services/onboardingService';
import {
  OnboardingState,
  PersonalInfo,
  AIQuestion,
  QuestionType,
} from '../../types/onboarding';
import { useAuth } from '../../context/AuthContext';
import { useProgressOverlay } from '../../hooks/useProgressOverlay';
import { supabase } from '../../config/supabase';
import {
  cleanUserProfileForResume,
  isValidFormattedResponse,
  validateUsername,
  validatePersonalInfo,
  validateGoalDescription,
  validateExperienceLevel,
} from '../../utils/validation';
import { logStep, logData, logError, logNavigation } from '../../utils/logger';
import { useApiCallWithBanner } from '../../hooks/useApiCallWithBanner';

type ChatEntry = {
  id: string;
  from: 'ai' | 'user';
  text: string;
  isTyping?: boolean;
  questionId?: string;
  skipAnimation?: boolean; // Flag to skip animation for restored/history messages
};

const buildHistoryEntry = (question: string, answer: string, prev: string) => {
  const entry = `Q: ${question}\nA: ${answer}`;
  return prev ? `${prev}\n\n${entry}` : entry;
};

/**
 * Get rating description text for a given rating value.
 * Only uses min_description/max_description if available, otherwise returns empty string.
 */
const getRatingDescription = (rating: number, question: AIQuestion): string => {
  const minValue = question.min_value || 1;
  const maxValue = question.max_value || 5;
  
  // Only use descriptions if both min and max descriptions are available
  if (!question.min_description || !question.max_description) {
    return '';
  }
  
  // Use exact descriptions for min/max values
  if (rating === minValue) {
    return question.min_description;
  }
  if (rating === maxValue) {
    return question.max_description;
  }
  
  // For middle values, create simple interpolation
  const totalRange = maxValue - minValue;
  const position = (rating - minValue) / totalRange;
  
  // Simple interpolation between min and max descriptions
  if (position <= 0.25) {
    return question.min_description;
  } else if (position <= 0.5) {
    return `${question.min_description} to Moderate`;
  } else if (position <= 0.75) {
    return `Moderate to ${question.max_description}`;
  } else {
    return question.max_description;
  }
};

/**
 * Convert response value to human-readable format for storage.
 * - Dropdown/Multiple Choice: converts option values to text
 * - Conditional Boolean: converts object to "No" (if false) or text explanation (if true)
 * - Slider: appends unit to numeric value (e.g., "30 minutes", "5 kg")
 * - Rating: includes scale and description (e.g., "4/5 (Average)")
 * - Other types: returns as-is
 */
const convertResponseForStorage = (question: AIQuestion, rawValue: any): any => {
  // Handle dropdown and multiple_choice: save option text instead of value/ID
  if (
    (question.response_type === QuestionType.MULTIPLE_CHOICE || 
     question.response_type === QuestionType.DROPDOWN) &&
    question.options
  ) {
    if (Array.isArray(rawValue)) {
      // Multiselect: map each value to its corresponding text
      return rawValue.map((val: string) => {
        const option = question.options!.find(opt => opt.value === val);
        return option ? option.text : val; // Fallback to original value if not found
      });
    } else {
      // Single select: map value to text
      const option = question.options.find(opt => opt.value === rawValue);
      return option ? option.text : rawValue; // Fallback to original value if not found
    }
  }
  
  // Handle conditional_boolean: save "No" if false, or the text explanation if true
  if (question.response_type === QuestionType.CONDITIONAL_BOOLEAN) {
    if (rawValue && typeof rawValue === 'object' && 'boolean' in rawValue) {
      // Handle both boolean false and string "false"
      const boolValue = rawValue.boolean;
      const isFalse = boolValue === false || boolValue === 'false' || boolValue === 'False';
      const isTrue = boolValue === true || boolValue === 'true' || boolValue === 'True';
      
      if (isFalse) {
        return 'No';
      } else if (isTrue) {
        // Save the text explanation (the meaningful part when true)
        return rawValue.text || 'Yes';
      } else {
        // Boolean is null/undefined - keep original structure
        return rawValue;
      }
    }
    // If it's already a string (converted), return as-is
    if (typeof rawValue === 'string') {
      return rawValue;
    }
  }
  
  // Handle slider: append unit to the numeric value for readability
  if (question.response_type === QuestionType.SLIDER) {
    if (typeof rawValue === 'number') {
      // Handle unit (defensive: check for string or array)
      let unit = '';
      if (question.unit) {
        if (typeof question.unit === 'string') {
          unit = question.unit;
        } else if (Array.isArray(question.unit) && (question.unit as any[]).length > 0) {
          unit = (question.unit as any[])[0]; // Use first unit if array (defensive)
        }
      }
      // Return value with unit: "30 minutes" or "5 kg"
      return unit ? `${rawValue} ${unit}` : String(rawValue);
    }
    // If it's already a string (converted), return as-is
    if (typeof rawValue === 'string') {
      return rawValue;
    }
  }
  
  // Handle rating: include scale and description for readability
  if (question.response_type === QuestionType.RATING) {
    if (typeof rawValue === 'number') {
      const minValue = question.min_value || 1;
      const maxValue = question.max_value || 5;
      
      // Get description text if available
      const description = getRatingDescription(rawValue, question);
      
      // Format as "4/5 (Average)" or "4/5" if no description
      return description ? `${rawValue}/${maxValue} (${description})` : `${rawValue}/${maxValue}`;
    }
    // If it's already a string (converted), return as-is
    if (typeof rawValue === 'string') {
      return rawValue;
    }
  }
  
  // For all other types, return as-is
  return rawValue;
};

interface ConversationalOnboardingProps {
  onError: (error: string) => void;
  startFromStep?: 'welcome' | 'initial';
}

export const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  onError,
  startFromStep = 'welcome',
}) => {
  const { state: authState, dispatch, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({
    username: '',
    usernameValid: false,
    personalInfo: null,
    personalInfoValid: false,
    goalDescription: '',
    goalDescriptionValid: false,
    experienceLevel: 'novice',
    experienceLevelValid: true,
    initialQuestions: [],
    initialResponses: new Map(),
    initialQuestionsLoading: false,
    currentInitialQuestionIndex: 0,
    initialAiMessage: undefined,
    initialIntroShown: false, // Will be managed by introTrackerRef
    chatMessages: [],
    questionHistory: '',
    informationComplete: false,
    // follow-up removed
    error: null,
  });

  const { progressState, runWithProgress } = useProgressOverlay();
  const [overlayTitle, setOverlayTitle] = useState<string>('Loading…');
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);

  // Add retry state for error recovery
  const [retryCount, setRetryCount] = useState(0);
  const [retryStep, setRetryStep] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  // Determine starting step - either from prop or default to welcome
  const initialStep = startFromStep || 'welcome';
  const [currentStep, setCurrentStep] = useState<'welcome' | 'personal' | 'goal' | 'experience' | 'initial'>(initialStep);

  // Track if we've initialized from profile (run only once per component mount)
  const hasInitializedFromProfileRef = useRef(false);

  // Track if intro messages have been shown (moved inside component to avoid shared state)
  const introTrackerRef = useRef({ initial: false });

  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup: cancel any in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Initialize state based on existing user profile when starting from specific steps
  // IMPORTANT: Only runs ONCE on mount to prevent re-initialization when profile updates
  useEffect(() => {
    // Only run once per component mount
    if (hasInitializedFromProfileRef.current) {
      return;
    }

      if (authState.userProfile && startFromStep !== 'welcome') {
      hasInitializedFromProfileRef.current = true;
      
      // Clean and validate user profile data
      const cleanedProfile = cleanUserProfileForResume(authState.userProfile);
      
      if (!cleanedProfile) {
        onError('Invalid user profile data. Please restart onboarding.');
        return;
      }
      
      // Set the correct current step based on startFromStep
      if (startFromStep === 'initial' || startFromStep === 'followup') {
        // 'followup' maps to 'initial' since follow-up feature is removed
        setCurrentStep('initial');
      }
      
      // Initialize with cleaned and validated profile data
      setState(prev => {
        const orderedQuestions = cleanedProfile.initial_questions || [];
        const rawResponsesObject = (cleanedProfile.initial_responses && typeof cleanedProfile.initial_responses === 'object')
          ? cleanedProfile.initial_responses
          : {};

        // Convert responses to human-readable format when loading from profile
        // This handles old data that might be in the wrong format (e.g., dict for conditional boolean)
        const responsesObject: Record<string, any> = {};
        const questionsMap = new Map(orderedQuestions.map((q: any) => [q.id, q as AIQuestion]));
        
        Object.entries(rawResponsesObject).forEach(([questionId, answer]) => {
          const question = questionsMap.get(questionId);
          // Type guard: ensure question has required properties
          if (question && 
              typeof question === 'object' && 
              'id' in question && 
              'text' in question && 
              'response_type' in question) {
            // Convert response format for storage consistency
            responsesObject[questionId] = convertResponseForStorage(question as AIQuestion, answer);
          } else {
            // Question not found or invalid, save as-is (shouldn't happen, but defensive)
            responsesObject[questionId] = answer;
          }
        });

        // Rebuild chatMessages from profile data (AI message + chronological Q/A)
        const rebuiltChatMessages: ChatEntry[] = [];

        if (cleanedProfile.initial_ai_message) {
          rebuiltChatMessages.push({
            id: `ai-message-restored`,
            from: 'ai',
            text: cleanedProfile.initial_ai_message,
            skipAnimation: true,
          });
        }

        const lastIndex = Math.max(orderedQuestions.length - 1, 0);

        orderedQuestions.forEach((q: any, idx: number) => {
          const questionId = q.id || `question-${Date.now()}-${Math.random()}`;
          const questionText = q.text || q.question_text || '';

          // Question
          rebuiltChatMessages.push({
            id: questionId,
            from: 'ai',
            text: questionText,
            questionId: q.id,
            // Only the last restored question animates; older history just appears
            skipAnimation: idx === lastIndex ? false : true,
          });

          // Answer (omit for the last question so it can animate/be answered again)
          if (idx !== lastIndex && Object.prototype.hasOwnProperty.call(responsesObject, q.id)) {
            const answer = responsesObject[q.id];
            // Display converted answer (should be string now for conditional boolean)
            let displayAnswer = '';
            if (Array.isArray(answer)) {
              displayAnswer = answer.join(', ');
            } else if (typeof answer === 'object' && answer !== null) {
              // This shouldn't happen after conversion, but handle defensively
              displayAnswer = JSON.stringify(answer);
            } else {
              displayAnswer = String(answer);
            }
            rebuiltChatMessages.push({
              id: `user-${q.id}-restored`,
              from: 'user',
              text: displayAnswer,
              skipAnimation: true,
            });
          }
        });

        // Rebuild question history from stored Q&A (includes all answers for backend merging)
        let rebuiltQuestionHistory = '';
        if (responsesObject && Object.keys(responsesObject).length > 0) {
          const historyEntries: string[] = [];
          Object.entries(responsesObject).forEach(([questionId, answer]) => {
            const question = questionsMap.get(questionId) as any;
            if (question) {
              // Display converted answer (should be string now for conditional boolean)
              let displayAnswer = '';
              if (Array.isArray(answer)) {
                displayAnswer = answer.join(', ');
              } else if (typeof answer === 'object' && answer !== null) {
                // This shouldn't happen after conversion, but handle defensively
                displayAnswer = JSON.stringify(answer);
              } else {
                displayAnswer = String(answer);
              }
              historyEntries.push(`Q: ${question.text || question.question_text || ''}\nA: ${displayAnswer}`);
            }
          });
          rebuiltQuestionHistory = historyEntries.join('\n\n');
        }

        return {
          ...prev,
          username: cleanedProfile.username,
          usernameValid: true,
          personalInfo: {
            username: cleanedProfile.username,
            age: cleanedProfile.age,
            weight: cleanedProfile.weight,
            height: cleanedProfile.height,
            weight_unit: cleanedProfile.weight_unit,
            height_unit: cleanedProfile.height_unit,
            measurement_system: cleanedProfile.measurement_system as 'imperial' | 'metric',
            gender: cleanedProfile.gender,
            goal_description: cleanedProfile.goal_description,
          },
          personalInfoValid: true,
          goalDescription: cleanedProfile.goal_description,
          goalDescriptionValid: true,
          experienceLevel: cleanedProfile.experience_level,
          experienceLevelValid: true,
          // Load questions and converted responses from profile
          initialQuestions: orderedQuestions,
          initialResponses: new Map(Object.entries(responsesObject)),
          
          // Load AI messages from database and rebuild chatMessages
          initialAiMessage: cleanedProfile.initial_ai_message,
          chatMessages: rebuiltChatMessages,
          questionHistory: rebuiltQuestionHistory || prev.questionHistory,
          initialIntroShown: introTrackerRef.current.initial,
        };
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Empty deps - only run on mount, ref prevents duplicate runs

  // Track authState.userProfile changes to detect when refreshUserProfile updates it
  useEffect(() => {
    // Profile change tracking for debugging if needed
  }, [authState.userProfile]);

  // Track if we've already triggered loading for each step
  const hasTriggeredInitialQuestionsRef = useRef(false);
  const previousStepRef = useRef<string | null>(null);

  // Reset trigger flags ONLY when step changes (not on every render)
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      if (currentStep === 'initial') {
        hasTriggeredInitialQuestionsRef.current = false;
      }
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Track current step transitions
  useEffect(() => {
    // Step transition tracking for debugging if needed
  }, [currentStep]);

  // Step 1: Username and Gender
  const handleUsernameChange = useCallback((username: string) => {
    const validation = validateUsername(username);
    
    setState(prev => {
      // Initialize personalInfo with default gender if it doesn't exist
      const defaultPersonalInfo: PersonalInfo = {
        username: username.trim(),
        age: 25,
        weight: 70,
        height: 175,
        weight_unit: 'kg',
        height_unit: 'cm',
        measurement_system: 'metric',
        gender: prev.personalInfo?.gender || 'male', // Use existing gender or default to 'male'
        goal_description: prev.personalInfo?.goal_description || '',
      };
      
      return {
        ...prev,
        username,
        usernameValid: validation.isValid,
        // Ensure personalInfo exists with default gender
        personalInfo: prev.personalInfo || defaultPersonalInfo,
      };
    });
  }, []);

  const handleGenderChange = useCallback((gender: 'male' | 'female' | 'other') => {
    setState(prev => {
      // If personalInfo doesn't exist, create it with default values
      const defaultPersonalInfo: PersonalInfo = {
        username: prev.username || '',
        age: 25,
        weight: 70,
        height: 175,
        weight_unit: 'kg',
        height_unit: 'cm',
        measurement_system: 'metric',
        gender: 'male',
        goal_description: '',
      };
      
      return {
        ...prev,
        personalInfo: prev.personalInfo ? {
          ...prev.personalInfo,
          gender,
        } : {
          ...defaultPersonalInfo,
          gender,
        },
      };
    });
  }, []);

  const handleWelcomeNext = useCallback(() => {
    if (!state.usernameValid) {
      Alert.alert('Error', 'Please enter a valid username (3-20 characters)');
      return;
    }
    
    // Ensure personalInfo exists with default gender 'male' if not set
    setState(prev => {
      if (!prev.personalInfo || !prev.personalInfo.gender) {
        const defaultPersonalInfo: PersonalInfo = {
          username: prev.username || '',
          age: 25,
          weight: 70,
          height: 175,
          weight_unit: 'kg',
          height_unit: 'cm',
          measurement_system: 'metric',
          gender: 'male', // Default to 'male'
          goal_description: '',
        };
        
        return {
          ...prev,
          personalInfo: prev.personalInfo || defaultPersonalInfo,
        };
      }
      return prev;
    });
    
    setCurrentStep('personal');
  }, [state.usernameValid]);

  // Step 2: Personal Info
  const handlePersonalInfoChange = useCallback((personalInfo: PersonalInfo) => {
    const validation = validatePersonalInfo(personalInfo);
    
    setState(prev => ({
      ...prev,
      personalInfo,
      personalInfoValid: validation.isValid,
    }));
  }, []);

  const handlePersonalInfoNext = useCallback(() => {
    if (!state.personalInfo || !state.personalInfoValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setCurrentStep('goal');
  }, [state.personalInfo, state.personalInfoValid]);

  // Step 3: Goal Description
  const handleGoalDescriptionChange = useCallback((goalDescription: string) => {
    const validation = validateGoalDescription(goalDescription);
    
    setState(prev => ({
      ...prev,
      goalDescription,
      goalDescriptionValid: validation.isValid,
    }));
  }, []);

  const appendChatMessages = useCallback((entries: ChatEntry | ChatEntry[]) => {
    const list = Array.isArray(entries) ? entries : [entries];
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages.filter(m => !m.isTyping), ...list],
    }));
  }, []);

  const clearTypingIndicator = useCallback(() => {
    setState(prev => ({
      ...prev,
      chatMessages: prev.chatMessages.filter(m => !m.isTyping),
    }));
  }, []);

  const handleGoalDescriptionNext = useCallback(() => {
    if (!state.goalDescriptionValid) {
      Alert.alert('Error', 'Please describe your training goal (at least 10 characters)');
      return;
    }
    setCurrentStep('experience');
  }, [state.goalDescriptionValid]);

  // Step 4: Experience Level
  const handleExperienceLevelChange = useCallback((experienceLevel: string) => {
    const validation = validateExperienceLevel(experienceLevel);
    
    setState(prev => ({
      ...prev,
      experienceLevel,
      experienceLevelValid: validation.isValid,
    }));
  }, []);

  const handleExperienceLevelNext = useCallback(() => {
    // Simply move to initial questions step
    setCurrentStep('initial');
  }, []);

  // API call with error handling for initial questions
  const { execute: executeGetInitialQuestions, loading: initialQuestionsApiLoading, ErrorBannerComponent: InitialQuestionsErrorBanner } = useApiCallWithBanner(
    async (fullPersonalInfo: PersonalInfo, userProfileId: number | undefined, jwtToken: string | undefined, questionHistory?: string, initialResponses?: Record<string, any>, signal?: AbortSignal) => {
      return await trainingService.getInitialQuestions(fullPersonalInfo, userProfileId, jwtToken, questionHistory, initialResponses, signal);
    },
    {
      retryCount: 3,
      onSuccess: async (response) => {
        // Debug: Log response structure to verify data flow
        console.log('📦 onSuccess response:', {
          questions: response.questions,
          questionsLength: response.questions?.length,
          information_complete: response.information_complete,
          ai_message: response.ai_message ? 'present' : 'missing',
          merged_responses: Object.keys(response.merged_responses || {}).length,
        });

        // Handle user profile ID updates BEFORE state update to prevent re-render issues
        if (response.user_profile_id && response.user_profile_id !== authState.userProfile?.id) {
          if (authState.userProfile) {
            dispatch({
              type: 'SET_USER_PROFILE',
              payload: { ...authState.userProfile, id: response.user_profile_id },
            });
          } else {
            // Refresh profile before state update to ensure we have the latest profile
            // This prevents the profile refresh from clearing state after it's been set
            await refreshUserProfile();
          }
        }

        const sortedQuestions = [...(response.questions || [])].sort((a, b) => {
          const orderA = a.order ?? 999;
          const orderB = b.order ?? 999;
          return orderA - orderB;
        });

        // Only mark complete when backend EXPLICITLY signals it
        // Do not infer completion from empty questions - backend should be explicit
        const informationComplete = response.information_complete === true;

        // Merge backend-returned responses into local state
        const mergedResponses = response.merged_responses || {};
        
        // Rebuild question-history string from merged Q&A
        let rebuiltQuestionHistory = '';
        if (mergedResponses && Object.keys(mergedResponses).length > 0) {
          const questionMap = new Map<string, AIQuestion>();
          // Build map of all questions (existing + new)
          [...(response.questions || []), ...(response.initial_questions || [])].forEach(q => {
            questionMap.set(q.id, q);
          });
          
          // Rebuild history from merged responses
          const historyEntries: string[] = [];
          Object.entries(mergedResponses).forEach(([questionId, answer]) => {
            const question = questionMap.get(questionId);
            if (question) {
              // Format answer for display
              let displayAnswer = '';
              if (Array.isArray(answer)) {
                displayAnswer = answer.join(', ');
              } else if (typeof answer === 'object' && answer !== null) {
                displayAnswer = JSON.stringify(answer);
              } else {
                displayAnswer = String(answer);
              }
              historyEntries.push(`Q: ${question.text}\nA: ${displayAnswer}`);
            }
          });
          rebuiltQuestionHistory = historyEntries.join('\n\n');
        }

        // Update state atomically with all question and message data
        setState(prev => {
          // Build complete chat messages array before state update to ensure atomicity
          const existingMessages = prev.chatMessages.filter(m => !m.isTyping);
          const isFirstQuestion = existingMessages.length === 0;
          
          // Track existing question IDs to prevent duplicates
          const existingQuestionIds = new Set(prev.initialQuestions.map(q => q.id));

          // Build new chat messages: AI message (if first question) + new questions
          const newChatMessages: ChatEntry[] = [...existingMessages];
          
          if (informationComplete) {
            // If complete, only add AI message if present
            if (response.ai_message) {
              newChatMessages.push({
                id: `ai-message-${Date.now()}`,
                from: 'ai',
                text: response.ai_message,
              });
            }
          } else {
            // If not complete, add AI message (if first question) then questions
            if (response.ai_message && isFirstQuestion) {
              newChatMessages.push({
                id: `ai-message-${Date.now()}`,
                from: 'ai',
                text: response.ai_message,
              });
            }
            
            // Add only new questions as chat entries (dedup by ID)
            sortedQuestions.forEach(q => {
              if (existingQuestionIds.has(q.id)) {
                return;
              }
              existingQuestionIds.add(q.id);
              newChatMessages.push({
                id: q.id,
                from: 'ai',
                text: q.text,
                questionId: q.id,
              });
            });
          }

          // Merge responses: backend merged_responses take precedence
          // Convert responses to human-readable format when merging
          const updatedResponses = new Map(prev.initialResponses);
          const allQuestionsMap = new Map<string, AIQuestion>();
          [...prev.initialQuestions, ...sortedQuestions].forEach(q => {
            allQuestionsMap.set(q.id, q);
          });
          
          Object.entries(mergedResponses).forEach(([questionId, value]) => {
            const question = allQuestionsMap.get(questionId);
            if (question) {
              // Convert response format for storage
              const convertedValue = convertResponseForStorage(question, value);
              updatedResponses.set(questionId, convertedValue);
            } else {
              // Question not found, save as-is (shouldn't happen, but defensive)
              updatedResponses.set(questionId, value);
            }
          });

          // Merge questions without duplicates (preserve order)
          const updatedQuestions = [...prev.initialQuestions];
          sortedQuestions.forEach(q => {
            if (!updatedQuestions.find(existing => existing.id === q.id)) {
              updatedQuestions.push(q);
            }
          });
          
          return {
            ...prev,
            initialQuestions: updatedQuestions,
            initialResponses: updatedResponses,
            initialQuestionsLoading: false,
            currentInitialQuestionIndex: Math.max(updatedQuestions.length - 1, 0),
            initialAiMessage: response.ai_message ?? prev.initialAiMessage,
            informationComplete,
            questionHistory: rebuiltQuestionHistory || prev.questionHistory,
            chatMessages: newChatMessages,
          };
        });

        // Update profile context only if information is complete
        // For ongoing questions, profile will be updated when user submits answers
        if (informationComplete && authState.userProfile) {
          dispatch({
            type: 'SET_USER_PROFILE',
            payload: {
              ...authState.userProfile,
              initial_questions: [...(authState.userProfile.initial_questions || []), ...sortedQuestions],
              initial_ai_message: response.ai_message,
            },
          });
        }

        setRetryStep(null);
        setOverlayTitle('Loading…');
        clearTypingIndicator();
        setIsFetchingQuestion(false);
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load questions';
        setState(prev => ({
          ...prev,
          initialQuestionsLoading: false,
          error: errorMessage,
        }));
        setRetryStep('initial');
        onError(errorMessage);
        setOverlayTitle('Loading…');
        clearTypingIndicator();
        setIsFetchingQuestion(false);
      },
    }
  );

  const fetchNextQuestion = useCallback(async (overrideHistory?: string) => {
    if (!state.personalInfo || state.informationComplete) {
      return;
    }

    // Cancel any in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const historyToSend = overrideHistory ?? state.questionHistory;
    setIsFetchingQuestion(true);

    const fullPersonalInfo = {
      ...state.personalInfo,
      username: state.username,
      goal_description: state.goalDescription,
      experience_level: state.experienceLevel,
    };

    const jwtToken = authState.session?.access_token;

    // Convert Map to plain object for sending to backend
    const initialResponsesObject = Object.fromEntries(state.initialResponses);

    // Determine if this is the first question (show spinner) or subsequent (show only dots)
    const isFirstQuestion = state.initialQuestions.length === 0;

    try {
      if (isFirstQuestion) {
        // First question: show loading spinner via progress overlay
        await runWithProgress('initial', async () => {
          await executeGetInitialQuestions(
            fullPersonalInfo,
            authState.userProfile?.id,
            jwtToken,
            historyToSend,
            initialResponsesObject,
            signal
          );
        });
      } else {
        // Subsequent questions: no spinner, just three-dot animation (handled in ChatQuestionsPage)
        await executeGetInitialQuestions(
          fullPersonalInfo,
          authState.userProfile?.id,
          jwtToken,
          historyToSend,
          initialResponsesObject,
          signal
        );
      }
    } catch (error: any) {
      // Ignore abort errors - they're expected when cancelling in-flight requests
      if (error?.code === 'ABORTED' || error?.name === 'AbortError') {
        return;
      }
      throw error;
    }
  }, [state.personalInfo, state.username, state.goalDescription, state.experienceLevel, state.questionHistory, state.initialResponses, state.informationComplete, state.initialQuestions.length, authState.session?.access_token, authState.userProfile, executeGetInitialQuestions, runWithProgress]);

  // follow-up flow removed: feature deprecated and handled outside this flow

  // Load first question when step changes to 'initial'
  useEffect(() => {
    if (currentStep === 'initial' &&
        state.initialQuestions.length === 0 &&
        !state.initialQuestionsLoading &&
        !hasTriggeredInitialQuestionsRef.current) {
      hasTriggeredInitialQuestionsRef.current = true;
      fetchNextQuestion();
    }
  }, [currentStep, state.initialQuestions.length, state.initialQuestionsLoading, fetchNextQuestion]);

  // Follow-up flow removed; no effect required.

  // Simple step progression functions
  const handleInitialQuestionsComplete = useCallback(() => {
    // Save initial responses to user profile context and navigate to plan generation.
    const initialResponsesObject = Object.fromEntries(state.initialResponses);
    if (authState.userProfile) {
      dispatch({
        type: 'SET_USER_PROFILE',
        payload: {
          ...authState.userProfile,
          initial_responses: initialResponsesObject,
        },
        });
    }
    // Navigation handled by centralized routing hook (no direct push to avoid duplicate navigation)
  }, [state.initialResponses, authState.userProfile, dispatch, router]);  // follow-up removed

  // Step 2: Initial Questions
  const handleInitialResponseChange = useCallback((questionId: string, value: any) => {
    setState(prev => {
      const newResponses = new Map(prev.initialResponses);
      newResponses.set(questionId, value);
      return {
        ...prev,
        initialResponses: newResponses,
      };
    });
  }, []);

  const handleSubmitAnswer = useCallback((question: AIQuestion, displayAnswer: string, rawValue: any) => {
    let nextHistory = '';

    // Convert response to human-readable format for storage
    const valueToSave = convertResponseForStorage(question, rawValue);

    setState(prev => {
      const newResponses = new Map(prev.initialResponses);
      newResponses.set(question.id, valueToSave); // Save converted value
      nextHistory = buildHistoryEntry(question.text, displayAnswer, prev.questionHistory);
      const newMessages = [
        ...prev.chatMessages.filter(m => !m.isTyping),
        { id: `user-${question.id}-${Date.now()}`, from: 'user', text: displayAnswer } as ChatEntry,
      ];

      return {
        ...prev,
        initialResponses: newResponses,
        questionHistory: nextHistory,
        chatMessages: newMessages,
      };
    });

    // Profile updates are deferred until informationComplete is true
    fetchNextQuestion(nextHistory);
  }, [fetchNextQuestion]);

  // follow-up removed


  // Navigation handlers
  const handlePrevious = useCallback(() => {
    switch (currentStep) {
      case 'welcome':
        // Can't go back from welcome
        break;
      case 'personal':
        setCurrentStep('welcome');
        break;
      case 'goal':
        setCurrentStep('personal');
        break;
      case 'experience':
        setCurrentStep('goal');
        break;
      case 'initial':
        setCurrentStep('experience');
        break;
      default:
        break;
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      const stepName = retryStep || currentStep;
      const stepDescriptions: Record<string, string> = {
        initial: 'initial questions',
      };

      setState(prev => ({
        ...prev,
        error: `We've tried ${MAX_RETRIES} times to load your ${stepDescriptions[stepName] || 'onboarding step'} but encountered an error. Please try again later or contact support.`
      }));
      return;
    }

    setRetryCount(prev => prev + 1);
    setState(prev => ({ ...prev, error: null }));

    const stepToRetry = retryStep || currentStep;

    switch (stepToRetry) {
      case 'welcome':
        break;
      case 'personal':
        handleWelcomeNext();
        break;
      case 'goal':
        handlePersonalInfoNext();
        break;
      case 'experience':
        handleGoalDescriptionNext();
        break;
      case 'initial':
        fetchNextQuestion();
        break;
      default:
        break;
    }
  }, [currentStep, retryCount, retryStep, handleWelcomeNext, handlePersonalInfoNext, handleGoalDescriptionNext, router]);

  // Handle start over action
  const handleStartOver = useCallback(() => {
    setRetryCount(0);
    setRetryStep(null);
    setState(prev => ({ ...prev, error: null }));
    setCurrentStep('welcome');
  }, []);

  const renderCurrentStep = () => {
    // Show custom error display for max retries or other global errors
    if (state.error && retryCount >= MAX_RETRIES) {
      return (
        <View style={styles.errorContainer}>
          <ErrorDisplay
            error={state.error}
            onRetry={handleStartOver}
            variant="server"
            showRetry={true}
          />
        </View>
      );
    }
    
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            username={state.username}
            onUsernameChange={handleUsernameChange}
            gender={(state.personalInfo?.gender || 'male') as 'male' | 'female' | 'other'}
            onGenderChange={handleGenderChange}
            onNext={handleWelcomeNext}
            isValid={state.usernameValid}
            error={state.error || undefined}
          />
        );
      
      case 'personal':
        return (
          <PersonalInfoStep
            personalInfo={state.personalInfo}
            onPersonalInfoChange={handlePersonalInfoChange}
            isValid={state.personalInfoValid}
            onNext={handlePersonalInfoNext}
            onPrevious={handlePrevious}
            onBack={handlePrevious}
            onComplete={() => {}}
            isLoading={false}
            error={state.error || undefined}
          />
        );
      
      case 'goal':
        return (
          <GoalDescriptionStep
            goalDescription={state.goalDescription}
            onGoalDescriptionChange={handleGoalDescriptionChange}
            isValid={state.goalDescriptionValid}
            onNext={handleGoalDescriptionNext}
            onPrevious={handlePrevious}
            onBack={handlePrevious}
            onComplete={() => {}}
            isLoading={false}
            error={state.error || undefined}
          />
        );
      
      case 'experience':
        return (
          <ExperienceLevelStep
            experienceLevel={state.experienceLevel}
            onExperienceLevelChange={handleExperienceLevelChange}
            isValid={state.experienceLevelValid}
            onNext={handleExperienceLevelNext}
            onPrevious={handlePrevious}
            onBack={handlePrevious}
            onComplete={() => {}}
            isLoading={false}
            error={state.error || undefined}
          />
        );
      
      case 'initial':
        return (
          <QuestionsStep
            questions={state.initialQuestions}
            responses={state.initialResponses}
            onResponseChange={handleInitialResponseChange}
            currentQuestionIndex={state.currentInitialQuestionIndex}
            totalQuestions={state.initialQuestions.length}
            onNext={handleInitialQuestionsComplete}
            onPrevious={handlePrevious}
            onComplete={() => {}}
            error={state.error || undefined}
            stepTitle="Initial Questions"
            chatMessages={state.chatMessages}
            onSubmitAnswer={handleSubmitAnswer}
            isFetchingNext={isFetchingQuestion || initialQuestionsApiLoading}
            informationComplete={state.informationComplete}
          />
        );
      
      /* follow-up removed */
      
      default:
        return null;
    }
  };

  const lastResetStepRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentStep === 'welcome' && lastResetStepRef.current !== 'welcome') {
      introTrackerRef.current.initial = false;
      lastResetStepRef.current = 'welcome';
      setState(prev => {
        if (!prev.initialIntroShown) {
          return prev;
        }
        return {
          ...prev,
          initialIntroShown: false,
        };
      });
    } else if (currentStep !== 'welcome') {
      lastResetStepRef.current = currentStep;
    }
  }, [currentStep]);

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <ProgressOverlay
        visible={progressState.visible}
        progress={progressState.progress}
        title={overlayTitle}
      />
      <InitialQuestionsErrorBanner />
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
