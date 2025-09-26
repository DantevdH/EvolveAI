import { apiClient } from './apiClient';
import {
  PersonalInfo,
  AIQuestionResponse,
  InitialQuestionsRequest,
  FollowUpQuestionsRequest,
  PlanGenerationRequest,
  OnboardingApiResponse,
} from '../types/onboarding';

export class OnboardingService {
  private static readonly BASE_URL = '/api/onboarding';

  /**
   * Test if backend is accessible
   */
  static async testBackendConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing backend connection...');
      const response = await fetch('http://127.0.0.1:8000/docs', {
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
  static async getInitialQuestions(personalInfo: PersonalInfo): Promise<AIQuestionResponse> {
    try {
      console.log('🚀 Starting initial questions request...');
      console.log('📋 Personal info:', JSON.stringify(personalInfo, null, 2));
      
      const request: InitialQuestionsRequest = {
        personal_info: personalInfo,
      };

      console.log('📤 Request payload:', JSON.stringify(request, null, 2));
      console.log('🌐 Making API call to:', `${this.BASE_URL}/initial-questions`);

      const response = await apiClient.post<OnboardingApiResponse<AIQuestionResponse>>(
        `${this.BASE_URL}/initial-questions`,
        request
      );

      console.log('📥 API response received:', JSON.stringify(response, null, 2));

      if (!response.success || !response.data) {
        console.error('❌ API response indicates failure:', {
          success: response.success,
          data: response.data,
          error: response.error
        });
        throw new Error(response.error || 'Failed to get initial questions');
      }

      console.log('✅ Initial questions retrieved successfully:', {
        questionCount: response.data.questions?.length || 0,
        estimatedTime: response.data.estimated_time_minutes
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error getting initial questions:', {
        error: error,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(error instanceof Error ? error.message : 'Failed to get initial questions');
    }
  }

  /**
   * Get follow-up questions based on initial responses
   */
  static async getFollowUpQuestions(
    personalInfo: PersonalInfo,
    initialResponses: Record<string, any>
  ): Promise<AIQuestionResponse> {
    try {
      console.log('🚀 Starting follow-up questions request...');
      console.log('📋 Personal info:', JSON.stringify(personalInfo, null, 2));
      console.log('📋 Initial responses:', JSON.stringify(initialResponses, null, 2));
      
      const request: FollowUpQuestionsRequest = {
        personal_info: personalInfo,
        initial_responses: initialResponses,
      };

      console.log('📤 Request payload:', JSON.stringify(request, null, 2));
      console.log('🌐 Making API call to:', `${this.BASE_URL}/follow-up-questions`);

      const response = await apiClient.post<OnboardingApiResponse<AIQuestionResponse>>(
        `${this.BASE_URL}/follow-up-questions`,
        request
      );

      console.log('📥 API response received:', JSON.stringify(response, null, 2));

      if (!response.success || !response.data) {
        console.error('❌ API response indicates failure:', {
          success: response.success,
          data: response.data,
          error: response.error
        });
        throw new Error(response.error || 'Failed to get follow-up questions');
      }

      console.log('✅ Follow-up questions retrieved successfully:', {
        questionCount: response.data.questions?.length || 0,
        estimatedTime: response.data.estimated_time_minutes,
        questions: response.data.questions,
        totalQuestions: response.data.total_questions
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error getting follow-up questions:', {
        error: error,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(error instanceof Error ? error.message : 'Failed to get follow-up questions');
    }
  }

  /**
   * Generate workout plan using all collected data
   */
  static async generateWorkoutPlan(
    personalInfo: PersonalInfo,
    initialResponses: Record<string, any>,
    followUpResponses: Record<string, any>
  ): Promise<any> {
    try {
      const request: PlanGenerationRequest = {
        personal_info: personalInfo,
        initial_responses: initialResponses,
        follow_up_responses: followUpResponses,
      };

      const response = await apiClient.post<OnboardingApiResponse<any>>(
        `${this.BASE_URL}/generate-plan`,
        request
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate workout plan');
      }

      return response.data;
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate workout plan');
    }
  }
}