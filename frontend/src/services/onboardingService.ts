import { apiClient } from './apiClient';
import {
  PersonalInfo,
  AIQuestionResponse,
  InitialQuestionsRequest,
  FollowUpQuestionsRequest,
  TrainingPlanOutlineRequest,
  PlanGenerationRequest,
  OnboardingApiResponse,
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
    jwtToken?: string
  ): Promise<AIQuestionResponse> {
    try {
      console.log('📍 Onboarding Service: Generating initial questions');
      
      const request: InitialQuestionsRequest = {
        personal_info: personalInfo,
        user_profile_id: userProfileId?.toString(),
        jwt_token: jwtToken,
      };

      // Making API call to backend

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
   * Get follow-up questions based on initial responses
   */
  static async getFollowUpQuestions(
    personalInfo: PersonalInfo,
    initialResponses: Record<string, any>,  // Raw responses from frontend
    initialQuestions: AIQuestion[],  // Initial questions from frontend
    userProfileId?: number,
    jwtToken?: string
  ): Promise<AIQuestionResponse> {
    try {
      console.log('📍 Onboarding Service: Generating follow-up questions');
      
      const request: FollowUpQuestionsRequest = {
        personal_info: personalInfo,
        initial_responses: initialResponses,  // Send raw responses
        initial_questions: initialQuestions,  // Send initial questions
        user_profile_id: userProfileId?.toString(),
        jwt_token: jwtToken,
      };

      // Making API call to backend

      const response = await apiClient.post<OnboardingApiResponse<AIQuestionResponse>>(
        `${this.BASE_URL}/follow-up-questions`,
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
        console.error('❌ API response indicates failure:', {
          success: response.success,
          data: response.data,
          message: response.message
        });
        throw new Error(response.message || 'Failed to get follow-up questions');
      }

      if (!response.data) {
        throw new Error('Invalid response format: data field is missing');
      }

      const responseData = (response.data as any) as AIQuestionResponse;
      
      console.log(`📍 Onboarding Service: Follow-up questions generated (${responseData.questions?.length || 0} questions)`);

      return responseData;
    } catch (error) {
      console.error(`❌ Onboarding Service: Follow-up questions failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(error instanceof Error ? error.message : 'Failed to get follow-up questions');
    }
  }

  /**
   * Generate training plan outline
   */
  static async generateTrainingPlanOutline(
    personalInfo: PersonalInfo,
    initialResponses: Record<string, any>,  // Raw responses from frontend
    followUpResponses: Record<string, any>,  // Raw responses from frontend
    initialQuestions: AIQuestion[],  // Initial questions from frontend
    followUpQuestions: AIQuestion[],  // Follow-up questions from frontend
    jwtToken?: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log('📍 Onboarding Service: Generating training plan outline');

      const request: TrainingPlanOutlineRequest = {
        personal_info: personalInfo,
        initial_responses: initialResponses,  // Send raw responses
        follow_up_responses: followUpResponses,  // Send raw responses
        initial_questions: initialQuestions,  // Send initial questions
        follow_up_questions: followUpQuestions,  // Send follow-up questions
        jwt_token: jwtToken || '',
      };

      // Making API call to backend

      const response = await apiClient.post<OnboardingApiResponse<any>>(
        `${this.BASE_URL}/training-plan-outline`,
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
        console.error('❌ API response indicates failure:', {
          success: response.success,
          data: response.data,
          message: response.message
        });
        throw new Error(response.message || 'Failed to generate training plan outline');
      }

      if (!response.data) {
        throw new Error('Invalid response format: data field is missing');
      }

      const responseData = (response.data as any);
      
      console.log(`📍 Onboarding Service: Training plan outline generated successfully`);

      return {
        success: true,
        data: responseData,
        message: response.message
      };
    } catch (error) {
      console.error(`❌ Onboarding Service: Plan outline failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Generate training plan using all collected data
   */
  static async generateTrainingPlan(
    personalInfo: PersonalInfo,
    initialResponses: Record<string, any>,  // Raw responses from frontend
    followUpResponses: Record<string, any>,  // Raw responses from frontend
    planOutline?: any,
    planOutlineFeedback?: string,  // User feedback on plan outline
    initialQuestions: AIQuestion[],  // Initial questions from frontend
    followUpQuestions: AIQuestion[],  // Follow-up questions from frontend
    userProfileId?: number,
    jwtToken?: string
  ): Promise<any> {
    try {
      const request: PlanGenerationRequest = {
        personal_info: personalInfo,
        initial_responses: initialResponses,  // Send raw responses
        follow_up_responses: followUpResponses,  // Send raw responses
        plan_outline: planOutline,
        plan_outline_feedback: planOutlineFeedback,  // Send user feedback separately
        initial_questions: initialQuestions,  // Send initial questions
        follow_up_questions: followUpQuestions,  // Send follow-up questions
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
}