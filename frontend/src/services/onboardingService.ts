import { apiClient } from './apiClient';
import {
  PersonalInfo,
  AIQuestionResponse,
  InitialQuestionsRequest,
  PlanGenerationRequest,
  OnboardingApiResponse,
  PlanFeedbackResponse,
  AIQuestion,
} from '../types/onboarding';

export class trainingService {
  private static readonly BASE_URL = '/api/training';
  private static readonly BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

  /**
   * Test if backend is accessible
   */
  static async testBackendConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing backend connection...');
      const response = await fetch(`${this.BACKEND_URL}/docs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('📡 Backend test response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Get initial questions based on personal info
   */
  static async getInitialQuestions(
    personalInfo: PersonalInfo, 
    userProfileId?: number, 
    jwtToken?: string,
    questionHistory?: string
  ): Promise<AIQuestionResponse> {
    try {
      console.log('📍 Onboarding Service: Generating initial questions');
      console.log('📤 Request payload:', {
        personalInfo,
        userProfileId,
        hasJwtToken: !!jwtToken,
      });
      
      const request: InitialQuestionsRequest = {
        personal_info: personalInfo,
        user_profile_id: userProfileId?.toString(),
        jwt_token: jwtToken,
        question_history: questionHistory,
      };

      console.log('🌐 Making request to:', `${this.BACKEND_URL}${this.BASE_URL}/initial-questions`);

      const response = await apiClient.post<OnboardingApiResponse<AIQuestionResponse>>(
        `${this.BASE_URL}/initial-questions`,
        request
      );

      // Validate response format
      if (typeof response !== 'object' || response === null) {
        throw new Error('Invalid response format: response is not an object');
      }

      if (typeof response.success !== 'boolean') {
        throw new Error('Invalid response format: success field is missing or not boolean');
      }

      if (!response.success) {
        console.error('❌ API response indicates failure:', {
          success: response.success,
          data: response.data,
          message: response.message
        });
        throw new Error(response.message || 'Failed to get initial questions');
      }

      if (!response.data) {
        throw new Error('Invalid response format: data field is missing');
      }

      const responseData = (response.data as any) as AIQuestionResponse;
      
      console.log(`📍 Onboarding Service: Initial questions generated (${responseData.questions?.length || 0} questions)`);

      return responseData;
    } catch (error) {
      console.error(`❌ Onboarding Service: Initial questions failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(error instanceof Error ? error.message : 'Failed to get initial questions');
    }
  }

 

  /**
   * Generate training plan using all collected data
   */
  static async generateTrainingPlan(
    personalInfo: PersonalInfo,
    initialResponses: Record<string, any>,  // Raw responses from frontend
    initialQuestions: AIQuestion[],  // Initial questions from frontend
    userProfileId?: number,
    jwtToken?: string
  ): Promise<any> {
    try {
      const request: PlanGenerationRequest = {
        personal_info: personalInfo,
        initial_responses: initialResponses,  // Send raw responses
        initial_questions: initialQuestions,  // Send initial questions
        user_profile_id: userProfileId,
        jwt_token: jwtToken,
      };

      console.log('📍 Onboarding Service: Generating training plan');

      const response = await apiClient.post<OnboardingApiResponse<any>>(
        `${this.BASE_URL}/generate-plan`,
        request
      );

      // API response received

      // Validate response format
      if (typeof response !== 'object' || response === null) {
        throw new Error('Invalid response format: response is not an object');
      }

      if (typeof response.success !== 'boolean') {
        throw new Error('Invalid response format: success field is missing or not boolean');
      }

      if (!response.success) {
        throw new Error(response.message || 'Failed to generate training plan');
      }

      if (!response.data) {
        throw new Error('Invalid response format: data field is missing');
      }

      // Return the response data (now contains training_plan_id and metadata, not the full training plan)
      console.log(`📍 Onboarding Service: Training plan generated successfully`);
      
      return response;
    } catch (error) {
      console.error(`❌ Onboarding Service: Training plan generation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate training plan');
    }
  }

  /**
   * Send feedback about the training plan
   * 
   * Uses user_playbook instead of initial/follow-up questions/responses.
   * 
   * @param weekNumber - The current week number to update (required)
   */
  static async sendPlanFeedback(
    userProfileId: number,
    planId: number,
    feedbackMessage: string,
    trainingPlan: any,  // Full training plan data from frontend
    playbook: any,  // Playbook from userProfile (includes context field)
    personalInfo: any,  // Personal info from userProfile
    conversationHistory: Array<{ role: string; content: string }> = [],
    weekNumber?: number,  // Current week number to update (optional, will use trainingPlan.currentWeek if not provided)
    jwtToken?: string
  ): Promise<PlanFeedbackResponse> {
    try {
      // Use provided weekNumber or fall back to trainingPlan.currentWeek
      const currentWeek = weekNumber ?? trainingPlan?.currentWeek;
      
      if (!currentWeek) {
        throw new Error('weekNumber is required. Either provide it as a parameter or ensure trainingPlan.currentWeek is set.');
      }

      const request = {
        user_profile_id: userProfileId,
        plan_id: planId,
        feedback_message: feedbackMessage,
        training_plan: trainingPlan,  // Send training plan to backend
        week_number: currentWeek,  // Send current week number
        playbook: playbook,  // Send playbook from userProfile
        personal_info: personalInfo,  // Send personal info from userProfile
        conversation_history: conversationHistory,
        jwt_token: jwtToken,
      };

      const response = await apiClient.post<PlanFeedbackResponse>(
        `${this.BASE_URL}/chat`,
        request
      );

      return response;
    } catch (error) {
      console.error(`Failed to send plan feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(error instanceof Error ? error.message : 'Failed to send plan feedback');
    }
  }

  /**
   * Generate a new week in the training plan
   * Calls the create-week endpoint to generate the next week
   */
  static async generateWeek(
    planId: number,
    trainingPlan: any,  // Full training plan data from frontend
    userProfileId: number,
    personalInfo: any,  // Personal info from userProfile
    jwtToken?: string
  ): Promise<any> {
    try {
      const request = {
        plan_id: planId,
        training_plan: trainingPlan,  // Send training plan to backend
        user_profile_id: userProfileId,
        personal_info: personalInfo,  // Send personal info from userProfile
        jwt_token: jwtToken,
      };

      const response = await apiClient.post<any>(
        `${this.BASE_URL}/create-week`,
        request
      );

      return response;
    } catch (error) {
      console.error(`Failed to generate week: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate week');
    }
  }
}