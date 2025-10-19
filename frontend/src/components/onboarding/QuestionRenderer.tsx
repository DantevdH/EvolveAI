import React from 'react';
import { AIQuestion, QuestionType } from '../../types/onboarding';
import { DropdownQuestion } from './DropdownQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { TextInputQuestion } from './TextInputQuestion';
import { CoolSlider } from './CoolSlider';
import { ConditionalBooleanQuestion } from './ConditionalBooleanQuestion';
import { RatingQuestion } from './RatingQuestion';

interface QuestionRendererProps {
  question: AIQuestion;
  value?: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
  noBackground = false,
}) => {
  const commonProps = {
    question,
    value,
    onChange,
    error,
    disabled,
    noBackground,
  };

  switch (question.response_type) {
    case QuestionType.MULTIPLE_CHOICE:
      return <MultipleChoiceQuestion {...commonProps} />;
    
    case QuestionType.DROPDOWN:
      return <DropdownQuestion {...commonProps} />;
    
    case QuestionType.FREE_TEXT:
      return <TextInputQuestion {...commonProps} />;
    
    case QuestionType.SLIDER:
      // Debug logging to catch unit data type issues
      if (question.unit && typeof question.unit !== 'string') {
        console.error('❌ SLIDER unit is not a string:', {
          questionId: question.id,
          unitType: typeof question.unit,
          unitValue: question.unit,
          rawQuestion: JSON.stringify(question)
        });
      }
      
      // Ensure unit is a string (defensive programming)
      const unitValue = Array.isArray(question.unit) 
        ? question.unit[0] 
        : (question.unit ?? '');
      
      return (
        <CoolSlider
          title=""
          value={value ?? question.min_value ?? 0}
          onValueChange={onChange}
          min={question.min_value ?? 0}
          max={question.max_value ?? 100}
          step={question.step ?? 1}
          unit={typeof unitValue === 'string' ? unitValue : String(unitValue)}
          size="large"
          style={{ backgroundColor: 'transparent', borderWidth: 0, padding: 0 }}
        />
      );
    
    case QuestionType.CONDITIONAL_BOOLEAN:
      return <ConditionalBooleanQuestion {...commonProps} />;
    
    case QuestionType.RATING:
      return <RatingQuestion {...commonProps} />;
    
    default:
      console.warn(`Unknown question type: ${question.response_type}`);
      return <TextInputQuestion {...commonProps} />;
  }
};
