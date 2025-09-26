import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';

interface RatingQuestionProps {
  question: AIQuestion;
  value?: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export const RatingQuestion: React.FC<RatingQuestionProps> = ({
  question,
  value = 1,
  onChange,
  error,
  disabled = false,
}) => {
  const minValue = question.min_value || 1;
  const maxValue = question.max_value || 10;

  const handleRatingPress = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const getRatingDescription = (rating: number) => {
    if (question.id.includes('pain')) {
      const descriptions = {
        1: 'No pain',
        2: 'Very mild',
        3: 'Mild',
        4: 'Discomforting',
        5: 'Distressing',
        6: 'Intense',
        7: 'Very intense',
        8: 'Severe',
        9: 'Very severe',
        10: 'Unbearable',
      };
      return descriptions[rating as keyof typeof descriptions] || '';
    } else if (question.id.includes('stress') || question.id.includes('motivation')) {
      const descriptions = {
        1: 'Very Low',
        2: 'Low',
        3: 'Below Average',
        4: 'Below Average',
        5: 'Average',
        6: 'Above Average',
        7: 'Above Average',
        8: 'High',
        9: 'Very High',
        10: 'Extremely High',
      };
      return descriptions[rating as keyof typeof descriptions] || '';
    }
    return '';
  };

  const renderRatingButton = (rating: number) => {
    const isSelected = value === rating;
    const description = getRatingDescription(rating);

    return (
      <TouchableOpacity
        key={rating}
        style={[
          styles.ratingButton,
          isSelected && styles.ratingButtonSelected,
          disabled && styles.ratingButtonDisabled,
        ]}
        onPress={() => handleRatingPress(rating)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.ratingNumber,
          isSelected && styles.ratingNumberSelected,
          disabled && styles.ratingNumberDisabled,
        ]}>
          {rating}
        </Text>
        {description && (
          <Text style={[
            styles.ratingDescription,
            isSelected && styles.ratingDescriptionSelected,
            disabled && styles.ratingDescriptionDisabled,
          ]}>
            {description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      {question.help_text && (
        <Text style={styles.helpText}>{question.help_text}</Text>
      )}
      
      <View style={styles.ratingContainer}>
        {Array.from({ length: maxValue - minValue + 1 }, (_, i) => i + minValue).map(renderRatingButton)}
      </View>
      
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>
          {minValue} - {getRatingDescription(minValue)}
        </Text>
        <Text style={styles.rangeLabel}>
          {maxValue} - {getRatingDescription(maxValue)}
        </Text>
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  helpText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  ratingButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingButtonDisabled: {
    opacity: 0.5,
  },
  ratingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  ratingNumberSelected: {
    color: colors.text,
  },
  ratingNumberDisabled: {
    color: colors.muted,
  },
  ratingDescription: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 12,
  },
  ratingDescriptionSelected: {
    color: colors.text,
  },
  ratingDescriptionDisabled: {
    color: colors.muted,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  rangeLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 8,
  },
});
