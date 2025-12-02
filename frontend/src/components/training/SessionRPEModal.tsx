import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../constants/colors';
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

  const getRPEButtonGradient = (rpe: number): [string, string] => {
    // Use golden-based gradients with varying intensity, blending to primary red for higher levels
    // Maintains app's golden accent theme while providing visual distinction
    if (rpe === 1) {
      // Very Easy - Very light golden
      return [
        createColorWithOpacity(colors.secondary, 0.4),
        createColorWithOpacity(colors.secondary, 0.25)
      ];
    }
    if (rpe === 2) {
      // Easy - Light golden
      return [
        createColorWithOpacity(colors.secondary, 0.55),
        createColorWithOpacity(colors.secondary, 0.35)
      ];
    }
    if (rpe === 3) {
      // Moderate - Medium golden
      return [
        createColorWithOpacity(colors.secondary, 0.7),
        createColorWithOpacity(colors.secondary, 0.5)
      ];
    }
    if (rpe === 4) {
      // Hard - Strong golden with subtle red blend
      return [
        createColorWithOpacity(colors.secondary, 0.8),
        createColorWithOpacity(colors.primary, 0.4)
      ];
    }
    // Very Hard - Rich golden-red blend (primary + secondary)
    return [
      createColorWithOpacity(colors.secondary, 0.9),
      createColorWithOpacity(colors.primary, 0.6)
    ];
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
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[
                  createColorWithOpacity(colors.secondary, 0.35),
                  createColorWithOpacity(colors.secondary, 0.18)
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="fitness" size={24} color={colors.secondary} />
              </LinearGradient>
            </View>
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
                    borderColor: createColorWithOpacity(colors.secondary, 0.2),
                    borderWidth: 1
                  }
                ]}
                onPress={() => handleSelect(item.value)}
                activeOpacity={0.7}
              >
                <View style={styles.rpeCircle}>
                  <LinearGradient
                    colors={getRPEButtonGradient(item.value)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rpeCircleGradient}
                  >
                    <Text style={styles.rpeValue}>{item.value}</Text>
                  </LinearGradient>
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
    backgroundColor: createColorWithOpacity(colors.text, 0.35),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    shadowColor: createColorWithOpacity(colors.text, 0.12),
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  iconContainer: {
    marginBottom: 12
  },
  iconGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: createColorWithOpacity(colors.secondary, 0.25),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.4
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
    padding: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12
  },
  rpeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.2),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  rpeCircleGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rpeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card
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

