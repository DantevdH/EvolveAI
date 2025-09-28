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
      return (
        <CoolSlider
          title=""
          value={value || question.min_value || 0}
          onValueChange={onChange}
          min={question.min_value || 0}
          max={question.max_value || 100}
          step={question.step || 1}
          unit={question.unit || ''}
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
