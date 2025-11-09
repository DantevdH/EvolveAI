import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/designSystem';

interface ActionButtonsProps {
  onSkip: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSkip,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onSkip}
        disabled={isSubmitting}
      >
        <Ionicons name="close-circle-outline" size={20} color={colors.muted} />
        <Text style={styles.skipButtonText}>Skip Feedback</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

