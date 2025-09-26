import React from 'react';
import { AIQuestion, QuestionType } from '../../types/onboarding';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { TextInputQuestion } from './TextInputQuestion';
import { SliderQuestion } from './SliderQuestion';
import { BooleanQuestion } from './BooleanQuestion';
import { RatingQuestion } from './RatingQuestion';

interface QuestionRendererProps {
  question: AIQuestion;
  value?: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const commonProps = {
    question,
    value,
    onChange,
    error,
    disabled,
  };

  switch (question.response_type) {
    case QuestionType.SINGLE_CHOICE:
      return <SingleChoiceQuestion {...commonProps} />;
    
    case QuestionType.MULTIPLE_CHOICE:
      return <MultipleChoiceQuestion {...commonProps} />;
    
    case QuestionType.FREE_TEXT:
      return <TextInputQuestion {...commonProps} />;
    
    case QuestionType.SLIDER:
      return <SliderQuestion {...commonProps} />;
    
    case QuestionType.BOOLEAN:
      return <BooleanQuestion {...commonProps} />;
    
    case QuestionType.RATING:
      return <RatingQuestion {...commonProps} />;
    
    default:
      console.warn(`Unknown question type: ${question.response_type}`);
      return <TextInputQuestion {...commonProps} />;
  }
};
