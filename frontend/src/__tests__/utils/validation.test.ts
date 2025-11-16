import { QuestionType, AIQuestion, PersonalInfo } from '../../types/onboarding';
import {
  validateQuestionResponse,
  validateUsername,
  validatePersonalInfo,
  validateGoalDescription,
  validateExperienceLevel,
} from '../../utils/validation';

const baseQuestion: AIQuestion = {
  id: 'q1',
  text: 'Sample question',
  response_type: QuestionType.FREE_TEXT,
  required: true,
};

describe('validateQuestionResponse', () => {
  test('all questions are required regardless of required field', () => {
    // Even if marked as optional, all AI questions in onboarding are required
    const question: AIQuestion = { 
      ...baseQuestion, 
      response_type: QuestionType.FREE_TEXT,
      required: false 
    };
    const result = validateQuestionResponse(question, '');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('This question is required.');
  });

  test('requires selection for MULTIPLE_CHOICE (all questions required)', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.MULTIPLE_CHOICE,
      required: false, // Even if marked optional, still required
      options: [
        { id: '1', text: 'A', value: 'a' },
        { id: '2', text: 'B', value: 'b' },
      ],
    };
    // Empty MULTIPLE_CHOICE should be invalid (all questions required)
    expect(validateQuestionResponse(question, '').isValid).toBe(false);
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);
    // But valid selection should work
    expect(validateQuestionResponse(question, 'a').isValid).toBe(true);
  });

  test('requires non-empty answer for required free text', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.FREE_TEXT,
      required: true,
      min_length: 10,
    };
    expect(validateQuestionResponse(question, '').isValid).toBe(false);
    expect(validateQuestionResponse(question, '  ').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'short').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'long enough').isValid).toBe(true);
  });

  test('enforces max_length on free text when provided', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.FREE_TEXT,
      min_length: 1,
      max_length: 5,
    };
    expect(validateQuestionResponse(question, '12345').isValid).toBe(true);
    expect(validateQuestionResponse(question, '123456').isValid).toBe(false);
  });

  test('validates single-select multiple choice / dropdown', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: '1', text: 'A', value: 'a' },
        { id: '2', text: 'B', value: 'b' },
      ],
    };

    expect(validateQuestionResponse(question, 'a').isValid).toBe(true);
    expect(validateQuestionResponse(question, 'b').isValid).toBe(true);
    expect(validateQuestionResponse(question, 'c').isValid).toBe(false);
    // Empty string should be invalid (no selection)
    expect(validateQuestionResponse(question, '').isValid).toBe(false);
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);
  });

  test('validates multiselect options', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.DROPDOWN,
      multiselect: true,
      options: [
        { id: '1', text: 'A', value: 'a' },
        { id: '2', text: 'B', value: 'b' },
      ],
    };

    expect(validateQuestionResponse(question, ['a']).isValid).toBe(true);
    expect(validateQuestionResponse(question, []).isValid).toBe(false);
    expect(validateQuestionResponse(question, ['a', 'c']).isValid).toBe(false);
  });

  test('validates slider/rating numeric bounds and steps', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.SLIDER,
      min_value: 1,
      max_value: 10,
      step: 1,
    };

    expect(validateQuestionResponse(question, 5).isValid).toBe(true);
    expect(validateQuestionResponse(question, 0).isValid).toBe(false);
    expect(validateQuestionResponse(question, 11).isValid).toBe(false);
  });

  test('validates conditional boolean with explanation', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.CONDITIONAL_BOOLEAN,
      required: true,
      min_length: 10,
    };

    // No boolean chosen
    expect(validateQuestionResponse(question, { boolean: null, text: '' }).isValid).toBe(false);
    expect(validateQuestionResponse(question, { boolean: undefined, text: '' }).isValid).toBe(false);
    expect(validateQuestionResponse(question, {}).isValid).toBe(false);
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);

    // Boolean false is always valid without text
    expect(validateQuestionResponse(question, { boolean: false, text: '' }).isValid).toBe(true);
    expect(validateQuestionResponse(question, { boolean: false }).isValid).toBe(true);

    // Boolean true requires explanation of >= min_length characters
    expect(
      validateQuestionResponse(question, { boolean: true, text: 'Too short' }).isValid
    ).toBe(false);
    expect(
      validateQuestionResponse(question, { boolean: true, text: '   ' }).isValid
    ).toBe(false);
    expect(
      validateQuestionResponse(question, { boolean: true, text: '' }).isValid
    ).toBe(false);

    // Exactly at min_length should be valid
    expect(
      validateQuestionResponse(question, { boolean: true, text: '1234567890' }).isValid
    ).toBe(true);
    expect(
      validateQuestionResponse(question, {
        boolean: true,
        text: 'Long enough',
      }).isValid
    ).toBe(true);
  });

  test('conditional boolean uses default min_length of 10 when not specified', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.CONDITIONAL_BOOLEAN,
      // No min_length specified, should default to 10
    };

    expect(
      validateQuestionResponse(question, { boolean: true, text: '123456789' }).isValid
    ).toBe(false); // 9 chars < 10
    expect(
      validateQuestionResponse(question, { boolean: true, text: '1234567890' }).isValid
    ).toBe(true); // 10 chars = 10
    expect(
      validateQuestionResponse(question, { boolean: true, text: '12345678901' }).isValid
    ).toBe(true); // 11 chars > 10
  });

  test('FREE_TEXT edge cases', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.FREE_TEXT,
      min_length: 10,
      max_length: 20,
    };

    // Empty values
    expect(validateQuestionResponse(question, '').isValid).toBe(false);
    expect(validateQuestionResponse(question, '   ').isValid).toBe(false);
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);

    // Min length boundary
    expect(validateQuestionResponse(question, '123456789').isValid).toBe(false); // 9 chars < 10
    expect(validateQuestionResponse(question, '1234567890').isValid).toBe(true); // 10 chars = 10
    expect(validateQuestionResponse(question, '12345678901').isValid).toBe(true); // 11 chars > 10

    // Max length boundary
    expect(validateQuestionResponse(question, '12345678901234567890').isValid).toBe(true); // 20 chars = 20
    expect(validateQuestionResponse(question, '123456789012345678901').isValid).toBe(false); // 21 chars > 20

    // Whitespace trimming
    expect(validateQuestionResponse(question, '  1234567890  ').isValid).toBe(true); // Trimmed = 10 chars
  });

  test('FREE_TEXT uses default min_length of 10 when not specified', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.FREE_TEXT,
      // No min_length specified, should default to 10
    };

    expect(validateQuestionResponse(question, 'short').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'long enough').isValid).toBe(true);
  });

  test('FREE_TEXT with custom min_length', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.FREE_TEXT,
      min_length: 5,
    };

    expect(validateQuestionResponse(question, '1234').isValid).toBe(false); // 4 chars < 5
    expect(validateQuestionResponse(question, '12345').isValid).toBe(true); // 5 chars = 5
  });

  test('DROPDOWN edge cases', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.DROPDOWN,
      options: [
        { id: '1', text: 'Option A', value: 'a' },
        { id: '2', text: 'Option B', value: 'b' },
        { id: '3', text: 'Option C', value: 'c' },
      ],
    };

    // Empty values
    expect(validateQuestionResponse(question, '').isValid).toBe(false);
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);

    // Valid selections
    expect(validateQuestionResponse(question, 'a').isValid).toBe(true);
    expect(validateQuestionResponse(question, 'b').isValid).toBe(true);
    expect(validateQuestionResponse(question, 'c').isValid).toBe(true);

    // Invalid selections
    expect(validateQuestionResponse(question, 'd').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'invalid').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'A').isValid).toBe(false); // Case sensitive

    // Array passed to single-select (should use first element)
    expect(validateQuestionResponse(question, ['a']).isValid).toBe(true);
    expect(validateQuestionResponse(question, ['b', 'c']).isValid).toBe(true); // Uses first
    expect(validateQuestionResponse(question, ['invalid']).isValid).toBe(false);
  });

  test('MULTIPLE_CHOICE multiselect edge cases', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.MULTIPLE_CHOICE,
      multiselect: true,
      options: [
        { id: '1', text: 'A', value: 'a' },
        { id: '2', text: 'B', value: 'b' },
        { id: '3', text: 'C', value: 'c' },
      ],
    };

    // Empty array
    expect(validateQuestionResponse(question, []).isValid).toBe(false);
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);

    // Valid selections
    expect(validateQuestionResponse(question, ['a']).isValid).toBe(true);
    expect(validateQuestionResponse(question, ['a', 'b']).isValid).toBe(true);
    expect(validateQuestionResponse(question, ['a', 'b', 'c']).isValid).toBe(true);

    // Invalid selections
    expect(validateQuestionResponse(question, ['d']).isValid).toBe(false);
    expect(validateQuestionResponse(question, ['a', 'd']).isValid).toBe(false); // One invalid
    expect(validateQuestionResponse(question, ['invalid']).isValid).toBe(false);

    // Non-array values
    expect(validateQuestionResponse(question, 'a').isValid).toBe(false); // String instead of array
  });

  test('SLIDER edge cases', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.SLIDER,
      min_value: 0,
      max_value: 100,
      step: 5,
    };

    // Empty values
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);
    expect(validateQuestionResponse(question, '').isValid).toBe(false);

    // Boundary values
    expect(validateQuestionResponse(question, 0).isValid).toBe(true); // Exactly min
    expect(validateQuestionResponse(question, 100).isValid).toBe(true); // Exactly max
    expect(validateQuestionResponse(question, -1).isValid).toBe(false); // Below min
    expect(validateQuestionResponse(question, 101).isValid).toBe(false); // Above max

    // Step validation
    expect(validateQuestionResponse(question, 0).isValid).toBe(true); // 0 = 0 + 0*5
    expect(validateQuestionResponse(question, 5).isValid).toBe(true); // 5 = 0 + 1*5
    expect(validateQuestionResponse(question, 10).isValid).toBe(true); // 10 = 0 + 2*5
    expect(validateQuestionResponse(question, 3).isValid).toBe(false); // Not aligned with step
    expect(validateQuestionResponse(question, 7).isValid).toBe(false); // Not aligned with step
    expect(validateQuestionResponse(question, 97).isValid).toBe(false); // Not aligned with step

    // Valid numeric strings
    expect(validateQuestionResponse(question, '50').isValid).toBe(true); // String converts to number
    expect(validateQuestionResponse(question, '0').isValid).toBe(true);

    // Invalid numeric strings
    expect(validateQuestionResponse(question, 'invalid').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'NaN').isValid).toBe(false);
  });

  test('SLIDER without step validation', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.SLIDER,
      min_value: 0,
      max_value: 100,
      // No step specified
    };

    // Any value within range should be valid
    expect(validateQuestionResponse(question, 0).isValid).toBe(true);
    expect(validateQuestionResponse(question, 50).isValid).toBe(true);
    expect(validateQuestionResponse(question, 100).isValid).toBe(true);
    expect(validateQuestionResponse(question, 25.5).isValid).toBe(true); // Decimal allowed
    expect(validateQuestionResponse(question, 33.333).isValid).toBe(true);
  });

  test('SLIDER without min_value allows any value below max', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.SLIDER,
      max_value: 100,
      // No min_value specified - no minimum enforced
    };

    // Without min_value, any value below max is valid
    expect(validateQuestionResponse(question, 0).isValid).toBe(true);
    expect(validateQuestionResponse(question, -1).isValid).toBe(true); // No min enforced
    expect(validateQuestionResponse(question, 50).isValid).toBe(true);
    expect(validateQuestionResponse(question, 100).isValid).toBe(true);
    expect(validateQuestionResponse(question, 101).isValid).toBe(false); // Above max
  });

  test('RATING edge cases', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.RATING,
      min_value: 1,
      max_value: 5,
      step: 1,
    };

    // Empty values
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);
    expect(validateQuestionResponse(question, '').isValid).toBe(false);

    // Boundary values
    expect(validateQuestionResponse(question, 1).isValid).toBe(true); // Exactly min
    expect(validateQuestionResponse(question, 5).isValid).toBe(true); // Exactly max
    expect(validateQuestionResponse(question, 0).isValid).toBe(false); // Below min
    expect(validateQuestionResponse(question, 6).isValid).toBe(false); // Above max

    // Valid ratings
    expect(validateQuestionResponse(question, 2).isValid).toBe(true);
    expect(validateQuestionResponse(question, 3).isValid).toBe(true);
    expect(validateQuestionResponse(question, 4).isValid).toBe(true);

    // Valid numeric strings
    expect(validateQuestionResponse(question, '3').isValid).toBe(true);
    expect(validateQuestionResponse(question, '5').isValid).toBe(true);

    // Invalid values
    expect(validateQuestionResponse(question, 'invalid').isValid).toBe(false);
    expect(validateQuestionResponse(question, NaN).isValid).toBe(false);
  });

  test('RATING without min_value allows any value below max', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.RATING,
      max_value: 10,
      // No min_value specified - no minimum enforced
    };

    // Without min_value, any value below max is valid
    expect(validateQuestionResponse(question, 1).isValid).toBe(true);
    expect(validateQuestionResponse(question, 0).isValid).toBe(true); // No min enforced
    expect(validateQuestionResponse(question, 5).isValid).toBe(true);
    expect(validateQuestionResponse(question, 10).isValid).toBe(true);
    expect(validateQuestionResponse(question, 11).isValid).toBe(false); // Above max
  });

  test('RATING with step validation', () => {
    const question: AIQuestion = {
      ...baseQuestion,
      response_type: QuestionType.RATING,
      min_value: 1,
      max_value: 10,
      step: 2, // Only even numbers
    };

    expect(validateQuestionResponse(question, 1).isValid).toBe(true); // 1 = 1 + 0*2
    expect(validateQuestionResponse(question, 3).isValid).toBe(true); // 3 = 1 + 1*2
    expect(validateQuestionResponse(question, 5).isValid).toBe(true); // 5 = 1 + 2*2
    expect(validateQuestionResponse(question, 2).isValid).toBe(false); // Not aligned with step
    expect(validateQuestionResponse(question, 4).isValid).toBe(false); // Not aligned with step
  });

  test('all question types reject null/undefined/empty', () => {
    const questionTypes = [
      QuestionType.FREE_TEXT,
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.DROPDOWN,
      QuestionType.SLIDER,
      QuestionType.RATING,
      QuestionType.CONDITIONAL_BOOLEAN,
    ];

    questionTypes.forEach((type) => {
      const question: AIQuestion = {
        ...baseQuestion,
        response_type: type,
        options: type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.DROPDOWN
          ? [{ id: '1', text: 'A', value: 'a' }]
          : undefined,
        min_value: type === QuestionType.SLIDER || type === QuestionType.RATING ? 0 : undefined,
        max_value: type === QuestionType.SLIDER || type === QuestionType.RATING ? 100 : undefined,
      };

      expect(validateQuestionResponse(question, null).isValid).toBe(false);
      expect(validateQuestionResponse(question, undefined).isValid).toBe(false);
    });
  });

  test('handles unknown question type gracefully', () => {
    const question: any = {
      ...baseQuestion,
      response_type: 'UNKNOWN_TYPE' as QuestionType,
    };

    // Should fall back to basic non-empty check
    expect(validateQuestionResponse(question, null).isValid).toBe(false);
    expect(validateQuestionResponse(question, undefined).isValid).toBe(false);
    expect(validateQuestionResponse(question, '').isValid).toBe(false);
    expect(validateQuestionResponse(question, 'some value').isValid).toBe(true);
  });

  describe('onboarding step validators', () => {
    test('validateUsername enforces 3-20 chars', () => {
      expect(validateUsername('').isValid).toBe(false);
      expect(validateUsername('ab').isValid).toBe(false);
      expect(validateUsername('abc').isValid).toBe(true);
    });

    test('validatePersonalInfo requires positive age/weight/height and gender', () => {
      const base: PersonalInfo = {
        username: 'user',
        age: 25,
        weight: 70,
        height: 175,
        weight_unit: 'kg',
        height_unit: 'cm',
        measurement_system: 'metric',
        gender: 'male',
        goal_description: 'Goal',
      };

      expect(validatePersonalInfo(base).isValid).toBe(true);
      expect(validatePersonalInfo({ ...base, age: 0 }).isValid).toBe(false);
      expect(validatePersonalInfo({ ...base, weight: 0 }).isValid).toBe(false);
      expect(validatePersonalInfo({ ...base, height: 0 }).isValid).toBe(false);
      expect(validatePersonalInfo({ ...base, gender: '' }).isValid).toBe(false);
    });

    test('validateGoalDescription enforces minimum length', () => {
      expect(validateGoalDescription('').isValid).toBe(false);
      expect(validateGoalDescription('short').isValid).toBe(false);
      expect(validateGoalDescription('long enough').isValid).toBe(true);
    });

    test('validateExperienceLevel requires non-empty value', () => {
      expect(validateExperienceLevel('').isValid).toBe(false);
      expect(validateExperienceLevel('  ').isValid).toBe(false);
      expect(validateExperienceLevel('novice').isValid).toBe(true);
    });
  });
});


