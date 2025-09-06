import { , ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';;
import { IconSymbol } from '@/components/ui/IconSymbol';

export interface SocialLoginButtonProps {
  provider: 'google' | 'apple' | 'facebook';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const getProviderConfig = () => {
    switch (provider) {
      case 'google':
        return {
          text: 'Sign In with Google',
          iconName: 'globe' as const,
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          borderColor: '#E5E5EA',
        };
      case 'apple':
        return {
          text: 'Sign In with Apple',
          iconName: 'apple.logo' as const,
          backgroundColor: '#000000',
          textColor: '#FFFFFF',
          borderColor: '#000000',
        };
      case 'facebook':
        return {
          text: 'Sign In with Facebook',
          iconName: 'person.2' as const,
          backgroundColor: '#1877F2',
          textColor: '#FFFFFF',
          borderColor: '#1877F2',
        };
      default:
        return {
          text: 'Sign In',
          iconName: 'person' as const,
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          borderColor: '#E5E5EA',
        };
    }
  };

  const config = getProviderConfig();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator
          color={config.textColor}
          size="small"
        />
      ) : (
        <>
          <IconSymbol
            name={config.iconName}
            size={20}
            color={config.textColor}
          />
          <Text style={[styles.text, { color: config.textColor }]}>
            {config.text}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    minHeight: 56,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
