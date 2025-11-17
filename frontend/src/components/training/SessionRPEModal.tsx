import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { validateRPE } from '../../utils/validation';
import { logger } from '../../utils/logger';

interface SessionRPEModalProps {
  visible: boolean;
  onSelect: (rpe: number) => void;
}

const SessionRPEModal: React.FC<SessionRPEModalProps> = ({
  visible,
  onSelect
}) => {
  const rpeScale = [
    { value: 1, label: 'Very Easy', description: 'Minimal effort' },
    { value: 2, label: 'Easy', description: 'Light effort' },
    { value: 3, label: 'Moderate', description: 'Comfortable' },
    { value: 4, label: 'Hard', description: 'Challenging' },
    { value: 5, label: 'Very Hard', description: 'Maximum effort' }
  ];

  const getRPEButtonColor = (rpe: number) => {
    if (rpe === 1) return colors.success;
    if (rpe === 2) return colors.secondary;
    if (rpe === 3) return colors.warning;
    if (rpe === 4) return '#FF6B6B';
    return colors.error;
  };

  const handleSelect = (rpe: number) => {
    // Validate RPE before selection (strict mode - block invalid user input)
    const validationResult = validateRPE(rpe, { allowReplacement: false });
    
    // If validation fails, show error and block the operation
    if (!validationResult.isValid) {
      Alert.alert('Invalid RPE', validationResult.errorMessage || 'RPE must be between 1 and 5');
      logger.error('Invalid RPE value from user input', {
        invalidValue: rpe,
        error: validationResult.errorMessage
      });
      return;
    }
    
    // Use validated value
    const finalRPE = validationResult.rpe || rpe;
    
    // Immediately save on selection - no confirm button needed
    onSelect(finalRPE);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Ionicons name="fitness" size={32} color={colors.primary} />
            <Text style={styles.title}>Rate Your Session</Text>
            <Text style={styles.subtitle}>How hard was this workout?</Text>
          </View>

          <View style={styles.scaleContainer}>
            {rpeScale.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.rpeButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1
                  }
                ]}
                onPress={() => handleSelect(item.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.rpeCircle,
                  { backgroundColor: getRPEButtonColor(item.value) }
                ]}>
                  <Text style={styles.rpeValue}>{item.value}</Text>
                </View>
                <View style={styles.rpeInfo}>
                  <Text style={styles.rpeLabel}>{item.label}</Text>
                  <Text style={styles.rpeDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  dialog: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8
  },
  header: {
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center'
  },
  scaleContainer: {
    gap: 6,
    marginBottom: 0
  },
  rpeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10
  },
  rpeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rpeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background
  },
  rpeInfo: {
    flex: 1,
    gap: 2
  },
  rpeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  rpeDescription: {
    fontSize: 11,
    color: colors.muted
  }
});

export default SessionRPEModal;

