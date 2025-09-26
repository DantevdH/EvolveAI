// Onboarding Types for AI-Driven Flow

export enum QuestionType {
  SINGLE_CHOICE = "single_choice",
  MULTIPLE_CHOICE = "multiple_choice",
  FREE_TEXT = "free_text",
  SLIDER = "slider",
  BOOLEAN = "boolean",
  RATING = "rating",
}

export enum QuestionCategory {
  TRAINING_EXPERIENCE = "training_experience",
  GOALS_PREFERENCES = "goals_preferences",
  EQUIPMENT_AVAILABILITY = "equipment_availability",
  TIME_COMMITMENT = "time_commitment",
  MEDICAL_HEALTH = "medical_health",
  LIFESTYLE_RECOVERY = "lifestyle_recovery",
  NUTRITION = "nutrition",
  MOTIVATION_COMMITMENT = "motivation_commitment",
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
  required: boolean;
  category: QuestionCategory;
  min_value?: number;
  max_value?: number;
  step?: number;
  max_length?: number;
  placeholder?: string;
  help_text?: string;
}

export interface AIQuestionResponse {
  questions: AIQuestion[];
  total_questions: number;
  estimated_time_minutes: number;
  categories: QuestionCategory[];
}

export interface PersonalInfo {
  username: string;
  age: number;
  weight: number;
  height: number;
  weight_unit: string;
  height_unit: string;
  gender: string;
  goal_description: string;
}

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
  
  // Step 4: Initial Questions
  initialQuestions: AIQuestion[];
  initialResponses: Map<string, any>;
  initialQuestionsLoading: boolean;
  currentInitialQuestionIndex: number;
  
  // Step 5: Follow-up Questions
  followUpQuestions: AIQuestion[];
  followUpResponses: Map<string, any>;
  followUpQuestionsLoading: boolean;
  currentFollowUpQuestionIndex: number;
  
  // Step 6: Plan Generation
  planGenerationLoading: boolean;
  workoutPlan: any | null; // WorkoutPlan type
  error: string | null;
  aiHasQuestions: boolean;
  aiAnalysisPhase: 'initial' | 'followup' | 'generation' | null;
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
}

export interface FollowUpQuestionsRequest {
  personal_info: PersonalInfo;
  initial_responses: Record<string, any>;
}

export interface PlanGenerationRequest {
  personal_info: PersonalInfo;
  initial_responses: Record<string, any>;
  follow_up_responses: Record<string, any>;
}

export interface OnboardingApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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

export interface QuestionsStepProps extends OnboardingStepProps {
  questions: AIQuestion[];
  responses: Map<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  currentQuestionIndex: number;
  totalQuestions: number;
  isLoading: boolean;
  stepTitle: string;
}

export interface PlanGenerationStepProps {
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
  aiHasQuestions?: boolean;
  onContinueToQuestions?: () => void;
  analysisPhase?: 'initial' | 'followup' | 'generation' | null;
  username?: string;
}
