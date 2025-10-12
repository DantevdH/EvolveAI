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
  min_value?: number;
  max_value?: number;
  step?: number;
  unit?: string;
  max_length?: number;
  placeholder?: string;
  help_text?: string;
  min_description?: string;
  max_description?: string;
}

export interface AIQuestionResponse {
  questions: AIQuestion[];
  total_questions: number;
  estimated_time_minutes: number;
  initial_questions?: AIQuestion[]; // For follow-up questions response
  ai_message?: string; // Personalized AI coach message for this phase
}

export interface PersonalInfo {
  username: string;
  age: number;
  weight: number;
  height: number;
  weight_unit: string;
  height_unit: string;
  measurement_system: 'metric' | 'imperial';
  gender: string;
  goal_description: string;
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
  
  // Step 6: Follow-up Questions
  followUpQuestions: AIQuestion[];
  followUpResponses: Map<string, any>;
  followUpQuestionsLoading: boolean;
  currentFollowUpQuestionIndex: number;
  followUpAiMessage?: string; // AI message for follow-up questions
  
  // Step 7: Training Plan Outline
  trainingPlanOutline: TrainingPlanOutline | null;
  outlineFeedback: string;
  outlineLoading: boolean;
  outlineAiMessage?: string; // AI message for plan outline
  
  // Step 8: Plan Generation
  planGenerationLoading: boolean;
  trainingPlan: any | null; // TrainingPlan type
  error: string | null;
  aiHasQuestions: boolean;
  aiAnalysisPhase: 'initial' | 'followup' | 'outline' | 'generation' | null;
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
}

export interface FollowUpQuestionsRequest {
  personal_info: PersonalInfo;
  initial_responses: Record<string, any>;  // Raw responses from frontend
  initial_questions?: AIQuestion[];
  user_profile_id?: string;
  jwt_token?: string;
}

export interface TrainingPlanOutlineRequest {
  personal_info: PersonalInfo;
  initial_responses: Record<string, any>;  // Raw responses from frontend
  follow_up_responses: Record<string, any>;  // Raw responses from frontend
  initial_questions?: AIQuestion[];
  follow_up_questions?: AIQuestion[];
  jwt_token: string;
}

export interface PlanGenerationRequest {
  personal_info: PersonalInfo;
  initial_responses: Record<string, any>;  // Raw responses from frontend
  follow_up_responses: Record<string, any>;  // Raw responses from frontend
  plan_outline?: any;
  plan_outline_feedback?: string;  // User feedback on plan outline
  initial_questions?: AIQuestion[];
  follow_up_questions?: AIQuestion[];
  user_profile_id?: number;
  jwt_token?: string;
}

export interface OnboardingApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
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
  isLoading: boolean;
  stepTitle: string;
  username?: string;
  aiMessage?: string; // AI message from backend
}

export interface PlanGenerationStepProps {
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
  onStartGeneration?: () => void;
  username?: string;
}
