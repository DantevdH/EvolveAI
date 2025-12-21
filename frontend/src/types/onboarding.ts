// Onboarding Types for AI-Driven Flow

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  DROPDOWN = "dropdown",
  FREE_TEXT = "free_text",
  SLIDER = "slider",
  CONDITIONAL_BOOLEAN = "conditional_boolean",
  RATING = "rating",
}

export interface QuestionOption {
  id: string;
  text: string;
  value: string;
}

export interface AIQuestion {
  id: string;
  text: string;
  response_type: QuestionType;
  options?: QuestionOption[];
  multiselect?: boolean; // Whether user can select multiple options (for multiple_choice and dropdown)
  min_value?: number;
  max_value?: number;
  step?: number;
  unit?: string;
  min_length?: number;
  max_length?: number;
  placeholder?: string;
  help_text?: string;
  min_description?: string;
  max_description?: string;
  order?: number; // Display order for this question (1-based, lower numbers appear first)
  required?: boolean;
}

export interface AIQuestionResponse {
  questions: AIQuestion[];
  total_questions: number;
  estimated_time_minutes: number;
  initial_questions?: AIQuestion[]; // Initial questions returned by AI
  ai_message?: string; // Personalized AI coach message for this phase
  user_profile_id?: number; // User profile ID (returned from backend after profile creation)
  information_complete?: boolean; // Signals no more questions are needed
  merged_responses?: Record<string, any>; // Merged responses from backend (server-side merge)
}

export interface PersonalInfo {
  user_id?: string;
  username: string;
  age: number;
  weight: number;
  height: number;
  weight_unit: string;
  height_unit: string;
  measurement_system: 'metric' | 'imperial';
  gender: string;
  goal_description: string;
  experience_level?: string;
}

export interface ExperienceLevel {
  value: string;
  title: string;
  description: string;
}

export const experienceLevels: ExperienceLevel[] = [
  {
    value: 'novice',
    title: 'Novice',
    description: 'New to working toward your goals or haven\'t pursued them in over a year'
  },
  {
    value: 'beginner',
    title: 'Beginner',
    description: 'Some experience working toward similar goals, less than 6 months'
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description: 'Regularly working toward your goals for 6 months to 2 years'
  },
  {
    value: 'advanced',
    title: 'Advanced',
    description: 'Consistently pursuing your goals for 2+ years with advanced knowledge'
  }
];

export interface OnboardingState {
  // Step 1: Username
  username: string;
  usernameValid: boolean;
  
  // Step 2: Personal Info
  personalInfo: PersonalInfo | null;
  personalInfoValid: boolean;
  
  // Step 3: Goal Description
  goalDescription: string;
  goalDescriptionValid: boolean;
  
  // Step 4: Experience Level
  experienceLevel: string;
  experienceLevelValid: boolean;
  
  // Step 5: Initial Questions
  initialQuestions: AIQuestion[];
  initialResponses: Map<string, any>;
  initialQuestionsLoading: boolean;
  currentInitialQuestionIndex: number;
  initialAiMessage?: string; // AI message for initial questions
  initialIntroShown: boolean;
  chatMessages: Array<{
    id: string;
    from: 'ai' | 'user';
    text: string;
    isTyping?: boolean;
    questionId?: string;
    skipAnimation?: boolean; // Add this line
  }>;
  questionHistory: string;
  informationComplete: boolean;
 
 
  
  error: string | null;
}

export interface QuestionResponse {
  questionId: string;
  value: any;
  isValid: boolean;
  error?: string;
}

// API Request/Response Types
export interface InitialQuestionsRequest {
  personal_info: PersonalInfo;
  user_profile_id?: string;
  jwt_token?: string;
  question_history?: string;
  initial_responses?: Record<string, any>;
}

export interface PlanGenerationRequest {
  personal_info: PersonalInfo;
  initial_responses: Record<string, any>;  // Raw responses from frontend
  initial_questions?: AIQuestion[];
  user_profile_id?: number;
  jwt_token?: string;
}

export interface OnboardingApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Plan feedback/update response (update-week endpoint)
export interface PlanFeedbackResponse {
  success: boolean;
  ai_response: string;
  plan_updated: boolean;
  updated_plan?: any; // TrainingPlan type
  updated_playbook?: {
    user_id: string;
    lessons: Array<{
      id: string;
      text: string;
      tags: string[];
      helpful_count: number;
      harmful_count: number;
      times_applied: number;
      confidence: number;
      positive: boolean;
      created_at: string;
      last_used_at?: string | null;
      source_plan_id?: string | null;
      requires_context?: boolean; // Whether lesson requires knowledge base context
      context?: string | null; // Validated context from knowledge base
    }>;
    total_lessons: number;
    last_updated: string;
  } | null; // Updated playbook with context after processing feedback
  navigate_to_main_app?: boolean;
  error?: string;
}

export interface DailyTraining {
  day: number;
  training_name: string; // Name of the training (e.g., 'Upper Body Strength', 'Easy Cardio')
  description: string;
  tags: string[];
}

export interface TrainingPeriod {
  period_name: string;
  duration_weeks: number;
  explanation: string;
  daily_trainings: DailyTraining[];
}

export interface TrainingPlanOutline {
  title: string;
  duration_weeks: number;
  explanation: string;
  training_periods: TrainingPeriod[];
  ai_message?: string; // Personalized AI coach message for this phase
}

// Component Props
export interface QuestionComponentProps {
  question: AIQuestion;
  value?: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onBack?: () => void;
  onComplete: () => void;
  isLoading?: boolean;
  error?: string;
}

export interface PersonalInfoStepProps extends OnboardingStepProps {
  personalInfo: PersonalInfo | null;
  onPersonalInfoChange: (personalInfo: PersonalInfo) => void;
  isValid: boolean;
}

export interface GoalDescriptionStepProps extends OnboardingStepProps {
  goalDescription: string;
  onGoalDescriptionChange: (goalDescription: string) => void;
  isValid: boolean;
}

export interface ExperienceLevelStepProps extends OnboardingStepProps {
  experienceLevel: string;
  onExperienceLevelChange: (experienceLevel: string) => void;
  isValid: boolean;
}

export interface QuestionsStepProps extends OnboardingStepProps {
  questions: AIQuestion[];
  responses: Map<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  currentQuestionIndex: number;
  totalQuestions: number;
  stepTitle: string;
  username?: string;
  aiMessage?: string; // AI message from backend
  introAlreadyCompleted?: boolean;
  onIntroComplete?: () => void;
  chatMessages: Array<{
    id: string;
    from: 'ai' | 'user';
    text: string;
    isTyping?: boolean;
    questionId?: string;
    skipAnimation?: boolean;
  }>;
  onSubmitAnswer: (question: AIQuestion, displayAnswer: string, rawValue: any) => void;
  isFetchingNext?: boolean;
  informationComplete?: boolean;
  isGeneratingPlan?: boolean;
  planGenerationError?: string | null;
  planGenerationProgress?: number;
}
