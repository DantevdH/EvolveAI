import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/designSystem';

interface StarRatingProps {
  label: string;
  value: number | undefined;
  onValueChange: (value: number) => void;
  hints?: { [key: number]: string };
}

export const StarRating: React.FC<StarRatingProps> = ({
  label,
  value,
  onValueChange,
  hints = {},
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onValueChange(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={value && value >= star ? 'star' : 'star-outline'}
              size={22}
              color={value && value >= star ? colors.primary : colors.inputBorder}
            />
          </TouchableOpacity>
        ))}
      </View>
      {hints[value || 0] && (
        <Text style={styles.hint}>{hints[value || 0]}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
    justifyContent: 'center',
  },
  starButton: {
    padding: 2,
  },
  hint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
    minHeight: 14,
    textAlign: 'center',
  },
});

