import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

interface ConfirmationDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonColor = colors.primary,
  icon
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {(!!title || !!icon) && (
            <View style={styles.header}>
              {!!icon && (
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[createColorWithOpacity(confirmButtonColor, 0.4), createColorWithOpacity(confirmButtonColor, 0.35)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name={icon} size={24} color={colors.text} />
                  </LinearGradient>
                </View>
              )}
              {!!title && (
                <Text style={styles.title}>{title}</Text>
              )}
            </View>
          )}
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.confirmButtonContainer}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[createColorWithOpacity(confirmButtonColor, 0.8), createColorWithOpacity(confirmButtonColor, 0.6)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  },
  header: {
    alignItems: 'center',
    marginBottom: 16
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5
  },
  message: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.text, 0.1),
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3
  },
  confirmButtonContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3
  }
});

export default ConfirmationDialog;
