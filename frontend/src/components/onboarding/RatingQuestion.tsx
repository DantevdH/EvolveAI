import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AIQuestion } from '../../types/onboarding';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity, goldenGradient } from '../../constants/colors';

interface RatingQuestionProps {
  question: AIQuestion;
  value?: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
  noBackground?: boolean;
}

const gradientConfig = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const RatingQuestion: React.FC<RatingQuestionProps> = ({
  question,
  value = 1,
  onChange,
  error,
  disabled = false,
  noBackground = false,
}) => {
  const minValue = question.min_value || 1;
  const maxValue = question.max_value || 10;

  const handleRatingPress = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const getRatingDescription = (rating: number) => {
    // If we have min/max descriptions, interpolate between them
    if (question.min_description && question.max_description) {
      if (rating === minValue) {
        return question.min_description;
      }
      if (rating === maxValue) {
        return question.max_description;
      }
      
      // For middle values, create a simple interpolation
      const totalRange = maxValue - minValue;
      const position = (rating - minValue) / totalRange;
      
      // Simple interpolation between min and max descriptions
      if (position <= 0.25) {
        return question.min_description;
      } else if (position <= 0.5) {
        return `${question.min_description} to Moderate`;
      } else if (position <= 0.75) {
        return `Moderate to ${question.max_description}`;
      } else {
        return question.max_description;
      }
    }
    
    // Fallback to hardcoded descriptions for backward compatibility
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

    const content = (
      <>
        <Text
          style={[
            styles.ratingNumber,
            isSelected && styles.ratingNumberSelected,
            disabled && styles.ratingNumberDisabled,
          ]}
        >
          {rating}
        </Text>
        {description && (
          <Text
            style={[
              styles.ratingDescription,
              isSelected && styles.ratingDescriptionSelected,
              disabled && styles.ratingDescriptionDisabled,
            ]}
          >
            {description}
          </Text>
        )}
      </>
    );

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
        activeOpacity={0.82}
      >
        {isSelected ? (
          <LinearGradient
            colors={goldenGradient}
            {...gradientConfig}
            style={[styles.ratingButtonInner, styles.ratingButtonInnerSelected]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={styles.ratingButtonInner}>
            {content}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
    // No flex to prevent expansion
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
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingButton: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
    backgroundColor: colors.inputBackground,
  },
  ratingButtonSelected: {
    borderColor: createColorWithOpacity(colors.secondary, 0.6),
    shadowColor: colors.secondary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ratingButtonDisabled: {
    opacity: 0.55,
  },
  ratingButtonInner: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  ratingButtonInnerSelected: {
    backgroundColor: 'transparent',
  },
  ratingNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  ratingNumberSelected: {
    color: colors.primary,
    fontSize: 22,
  },
  ratingNumberDisabled: {
    color: colors.muted,
  },
  ratingDescription: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 13,
  },
  ratingDescriptionSelected: {
    color: colors.primary,
    fontWeight: '600',
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
