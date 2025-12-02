'use client';

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../constants/colors';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type ConfirmationDialogComponent = React.FC<Props>;

const ConfirmationDialog: ConfirmationDialogComponent = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonColor = colors.primary,
  icon,
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
                    colors={[
                      createColorWithOpacity(confirmButtonColor, 0.35),
                      createColorWithOpacity(confirmButtonColor, 0.18)
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name={icon} size={22} color={confirmButtonColor} />
                  </LinearGradient>
                </View>
              )}
              {!!title && (
                <Text style={[styles.title, { color: confirmButtonColor }]}>{title}</Text>
              )}
            </View>
          )}

          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[
                  createColorWithOpacity(confirmButtonColor, 0.85),
                  createColorWithOpacity(confirmButtonColor, 0.65)
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                <Text style={styles.confirmText}>{confirmText}</Text>
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
    backgroundColor: createColorWithOpacity(colors.text, 0.35),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  iconContainer: {
    marginBottom: 12,
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
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  message: {
    fontSize: 15,
    color: createColorWithOpacity(colors.text, 0.85),
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: createColorWithOpacity(colors.secondary, 0.08),
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.3),
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.3),
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  confirmGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.card,
    letterSpacing: 0.4,
  },
});

export default ConfirmationDialog;
