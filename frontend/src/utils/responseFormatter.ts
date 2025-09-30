/**
 * Response Formatter for AI Question Responses
 *
 * This module provides clean, structured formatting of user responses to AI-generated questions
 * for use in AI prompts and training plan generation.
 */

import { AIQuestion, QuestionType } from '../types/onboarding';

export class ResponseFormatter {
  /**
   * Format user responses for AI prompts in a clear, structured way.
   * 
   * @param responses - Dict of question_id -> response_value from frontend
   * @param questions - Optional list of AIQuestion objects for context
   * @returns Formatted string with Q: question_text\nA: formatted_response
   */
  static formatResponses(responses: Record<string, any>, questions?: AIQuestion[]): string {
    const formatted: string[] = [];
    
    // Create a lookup map for questions by ID for efficient access
    const questionMap: Record<string, AIQuestion> = {};
    if (questions) {
      questions.forEach(q => {
        questionMap[q.id] = q;
      });
    }
    
    for (const [questionId, response] of Object.entries(responses)) {
      try {
        const question = questionMap[questionId];
        const questionText = question?.text || questionId;
        
        // Format response based on question type and response structure
        const responseStr = ResponseFormatter.formatSingleResponse(response, question);
        
        formatted.push(`Q: ${questionText}\nA: ${responseStr}`);
        
      } catch (error) {
        // Fallback for any errors
        const question = questionMap[questionId];
        const questionText = question?.text || questionId;
        formatted.push(`Q: ${questionText}\nA: [Error formatting response: ${error}]`);
      }
    }
    
    return formatted.join('\n\n');
  }
  
  /**
   * Format a single response value based on its type and question context.
   * 
   * @param response - The response value from the frontend
   * @param question - Optional AIQuestion object for context
   * @returns Formatted response string
   */
  private static formatSingleResponse(response: any, question?: AIQuestion): string {
    // Handle None/empty responses
    if (response === null || response === undefined || response === '') {
      return 'No response';
    }
    
    // Handle different response types
    if (Array.isArray(response)) {
      // Only treat as multiple choice if we have a question with options
      if (question && question.options) {
        return ResponseFormatter.formatMultipleChoiceResponse(response, question);
      } else {
        // Format as regular list
        return '[' + response.map(item => String(item)).join(', ') + ']';
      }
    } else if (typeof response === 'object' && response !== null && 'boolean' in response) {
      return ResponseFormatter.formatConditionalBooleanResponse(response);
    } else if (typeof response === 'number') {
      return ResponseFormatter.formatNumericResponse(response, question);
    } else if (typeof response === 'string') {
      return ResponseFormatter.formatTextResponse(response);
    } else {
      return String(response);
    }
  }
  
  /**
   * Format multiple choice responses.
   */
  private static formatMultipleChoiceResponse(response: string[], question?: AIQuestion): string {
    if (response.length === 0) {
      return 'No selection';
    } else if (response.length === 1) {
      // Try to find the option text if question context is available
      if (question && question.options) {
        const option = question.options.find(opt => opt.value === String(response[0]));
        return option?.text || String(response[0]);
      }
      return String(response[0]);
    } else {
      // Multiple selections - try to map values to text
      if (question && question.options) {
        const optionTexts: string[] = [];
        for (const value of response) {
          const option = question.options.find(opt => opt.value === String(value));
          optionTexts.push(option?.text || String(value));
        }
        return optionTexts.join(', ');
      }
      return response.map(v => String(v)).join(', ');
    }
  }
  
  /**
   * Format conditional boolean responses.
   */
  private static formatConditionalBooleanResponse(response: { boolean: boolean; text?: string }): string {
    const boolVal = response.boolean;
    const textVal = response.text?.trim() || '';
    
    if (boolVal === true) {
      if (textVal) {
        return `Yes - ${textVal}`;
      } else {
        return 'Yes';
      }
    } else if (boolVal === false) {
      return 'No';
    } else {
      return 'Not answered';
    }
  }
  
  /**
   * Format numeric responses (sliders, ratings) with proper context.
   */
  private static formatNumericResponse(response: number, question?: AIQuestion): string {
    if (question) {
      if (question.response_type === QuestionType.SLIDER) {
        // Slider responses: show value with unit
        if (question.unit) {
          return `${response} ${question.unit}`;
        } else {
          return String(response);
        }
      } else if (question.response_type === QuestionType.RATING) {
        // Rating responses: show value with scale context
        const minVal = question.min_value || 1;
        const maxVal = question.max_value || 5;
        
        // Try to provide meaningful context for the rating
        let scaleContext = '';
        if (question.help_text) {
          scaleContext = ` (${question.help_text})`;
        } else if (maxVal === 10) {
          scaleContext = ' (1=lowest, 10=highest)';
        } else if (maxVal === 5) {
          scaleContext = ' (1=lowest, 5=highest)';
        }
        
        return `${Math.round(response)}/${Math.round(maxVal)} rating${scaleContext}`;
      } else {
        return String(response);
      }
    } else {
      // No question context - return raw numeric value
      return String(response);
    }
  }
  
  /**
   * Format text responses.
   */
  private static formatTextResponse(response: string): string {
    if (response === null || response === undefined) {
      return 'No response';
    }
    const trimmed = response.trim();
    return trimmed || 'No response';
  }
}
