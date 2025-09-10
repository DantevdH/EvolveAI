// OneRM Calculator View - Modal like Swift
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface OneRMCalculatorViewProps {
  exerciseName: string;
  isVisible: boolean;
  onClose: () => void;
  onCalculate: (estimated1RM: number) => void;
}

const OneRMCalculatorView: React.FC<OneRMCalculatorViewProps> = ({
  exerciseName,
  isVisible,
  onClose,
  onCalculate
}) => {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [estimated1RM, setEstimated1RM] = useState<number | null>(null);

  const calculate1RM = () => {
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    if (weightNum <= 0 || repsNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid weight and reps values.');
      return;
    }

    // Brzycki Formula: 1RM = weight lifted / (1.0278 - 0.0278 × reps)
    const denominator = 1.0278 - (0.0278 * repsNum);
    if (denominator > 0) {
      const calculated1RM = weightNum / denominator;
      setEstimated1RM(calculated1RM);
    } else {
      Alert.alert('Calculation Error', 'Unable to calculate 1RM with the provided values.');
    }
  };

  const handleApply = () => {
    if (estimated1RM) {
      onCalculate(estimated1RM);
      onClose();
    }
  };

  const resetCalculator = () => {
    setWeight('');
    setReps('');
    setEstimated1RM(null);
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="calculator" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>1RM Calculator</Text>
              <Text style={styles.exerciseName} numberOfLines={2}>
                {exerciseName}
              </Text>
            </View>
          </View>

          {/* Input Form */}
          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              {/* Weight Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>

              {/* Reps Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reps</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <Text style={styles.unitText}>reps</Text>
                </View>
              </View>
            </View>

            {/* Calculate Button */}
            <TouchableOpacity
              style={[
                styles.calculateButton,
                (!weight || !reps || parseFloat(weight) <= 0 || parseInt(reps) <= 0) && styles.calculateButtonDisabled
              ]}
              onPress={calculate1RM}
              disabled={!weight || !reps || parseFloat(weight) <= 0 || parseInt(reps) <= 0}
            >
              <Ionicons name="calculator" size={16} color={colors.text} />
              <Text style={styles.calculateButtonText}>Calculate 1RM</Text>
            </TouchableOpacity>
          </View>

          {/* Result Display */}
          {estimated1RM && (
            <View style={styles.resultSection}>
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Estimated 1RM</Text>
                <Text style={styles.resultValue}>{Math.round(estimated1RM)} kg</Text>
                <Text style={styles.formulaText}>Brzycki Formula</Text>
              </View>

              {/* Apply Button */}
              <View style={styles.applySection}>
                <Text style={styles.applyHint}>Tap to apply</Text>
                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={resetCalculator}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 320,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseName: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  inputSection: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 20,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  unitText: {
    fontSize: 12,
    color: colors.muted,
    minWidth: 30,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  calculateButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resultSection: {
    marginTop: 20,
    gap: 16,
  },
  resultContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
  },
  formulaText: {
    fontSize: 10,
    color: colors.muted,
    fontStyle: 'italic',
  },
  applySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyHint: {
    fontSize: 12,
    color: colors.muted,
  },
  applyButton: {
    // No additional styling needed
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});

export default OneRMCalculatorView;







