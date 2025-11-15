import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../../constants/designSystem';

interface FeedbackInputProps {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
}

export const FeedbackInput: React.FC<FeedbackInputProps> = ({
  value,
  onChangeText,
  maxLength = 500,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Comments (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="How did the workout feel? Any notes or injuries to report?"
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={4}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
      />
      <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 8,
  },
});

