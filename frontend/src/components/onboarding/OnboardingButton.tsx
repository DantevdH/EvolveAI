import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { colors } from '../../constants/designSystem';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'back';
  icon?: string;
  style?: any;
}

export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  icon,
  style,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'back':
        return [styles.button, styles.backButton, disabled && styles.buttonDisabled, style];
      case 'secondary':
        return [styles.button, styles.secondaryButton, disabled && styles.buttonDisabled, style];
      default:
        return [styles.button, styles.primaryButton, disabled && styles.buttonDisabled, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'back':
        return [styles.buttonText, styles.backButtonText, disabled && styles.buttonTextDisabled];
      case 'secondary':
        return [styles.buttonText, styles.secondaryButtonText, disabled && styles.buttonTextDisabled];
      default:
        return [styles.buttonText, styles.primaryButtonText, disabled && styles.buttonTextDisabled];
    }
  };

  const getIconColor = () => {
    if (disabled) return colors.muted;
    switch (variant) {
      case 'back':
        return colors.text;
      case 'secondary':
        return colors.text;
      default:
        return colors.text;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        {variant === 'back' && (
          <IconSymbol 
            name="arrow.left.circle.fill" 
            size={16} 
            color={getIconColor()} 
          />
        )}
        <Text style={getTextStyle()}>{title}</Text>
        {icon && variant !== 'back' && (
          <IconSymbol 
            name={icon} 
            size={16} 
            color={getIconColor()} 
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Primary Button
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // Secondary Button
  secondaryButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // Back Button
  backButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // Disabled State
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: colors.muted,
  },
});
