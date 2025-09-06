import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';;
import { colors, spacing, typography, borderRadius, shadows, componentStyles } from '../../constants/designSystem';

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
          <ActivityIndicator 
            size={componentStyles.loading.spinner.size} 
            color={colors.primary} 
          />
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
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    minWidth: 200,
    ...shadows.lg,
  },
  message: {
    marginTop: spacing.lg,
    fontSize: typography.fontSizes.md,
    color: colors.text,
    textAlign: 'center',
  },
});
