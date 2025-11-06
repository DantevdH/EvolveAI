import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows, componentStyles } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  visible, 
  message = 'Loading...',
  transparent = true 
}) => {
  return (
    <Modal
      transparent={transparent}
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.spinnerContainer}
          >
            <ActivityIndicator 
              size={componentStyles.loading.spinner.size || 'large'} 
              color={colors.text} 
            />
          </LinearGradient>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  spinnerContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: colors.text,
    textAlign: 'center',
    fontWeight: typography.fontWeights.medium,
    letterSpacing: 0.2,
  },
});
