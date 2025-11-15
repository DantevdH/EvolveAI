import React, { type ComponentProps } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';

type IconSymbolName = ComponentProps<typeof IconSymbol>['name'];
type IoniconName = keyof typeof Ionicons.glyphMap;

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'back';
  icon?: IconSymbolName | IoniconName;
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
        return colors.primary;
    }
  };

  if (variant === 'primary') {
    const gradientColors: [string, string] = disabled
      ? [createColorWithOpacity(colors.secondary, 0.2), createColorWithOpacity(colors.secondary, 0.1)]
      : [createColorWithOpacity(colors.secondary, 0.35), createColorWithOpacity(colors.secondary, 0.15)];

    return (
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
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
              <Ionicons
                name={icon as IoniconName}
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
          <Ionicons name="arrow-back" size={16} color={getIconColor()} />
        )}
        <Text style={getTextStyle()} numberOfLines={1}>{title}</Text>
        {icon && variant !== 'back' && (
          <IconSymbol 
            name={icon as IconSymbolName} 
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
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 48,
  },
  gradientButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
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
    backgroundColor: 'transparent',
  },
  primaryButtonText: {
    color: colors.primary,
    letterSpacing: 0.4,
  },
  // Secondary Button
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  // Back Button
  backButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
  },
  backButtonText: {
    color: colors.primary,
  },
  // Disabled State - handled by gradient opacity, no separate style needed
  buttonDisabled: {
    // No opacity change - gradient handles disabled state
  },
  buttonTextDisabled: {
    color: colors.muted,
  },
});
