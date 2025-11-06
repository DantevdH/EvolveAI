import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

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

  // For primary button, use gradient with same opacity as feature cards (both enabled and disabled)
  if (variant === 'primary') {
    const gradientColors = disabled
      ? [createColorWithOpacity(colors.primary, 0.15), createColorWithOpacity(colors.primary, 0.1)] // Lower opacity when disabled
      : [createColorWithOpacity(colors.primary, 0.3), createColorWithOpacity(colors.primary, 0.2)]; // Normal opacity when enabled
    
    return (
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          <View style={styles.buttonContent}>
            <Text style={getTextStyle()} numberOfLines={1}>{title}</Text>
            {icon && (
              <IconSymbol 
                name={icon} 
                size={16} 
                color={getIconColor()} 
              />
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

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
        <Text style={getTextStyle()} numberOfLines={1}>{title}</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 48,
  },
  gradientButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
  },
  // Base Text Style
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Primary Button
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.text,
  },
  // Secondary Button
  secondaryButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  secondaryButtonText: {
    color: colors.text,
  },
  // Back Button
  backButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  backButtonText: {
    color: colors.text,
  },
  // Disabled State - handled by gradient opacity, no separate style needed
  buttonDisabled: {
    // No opacity change - gradient handles disabled state
  },
  buttonTextDisabled: {
    color: colors.muted,
  },
});
