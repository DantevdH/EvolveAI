export interface DailyFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: DailyFeedbackData) => Promise<void>;
  onSkip: () => void;
  dayOfWeek: string;
  trainingType: string;
  modificationsDetected: number;
}

export interface DailyFeedbackData {
  feedback_provided: boolean;
  user_rating?: number;
  user_feedback?: string;
  energy_level?: number;
  difficulty?: number;
  enjoyment?: number;
  soreness_level?: number;
  injury_reported: boolean;
  injury_description?: string;
  pain_location?: string;
}

