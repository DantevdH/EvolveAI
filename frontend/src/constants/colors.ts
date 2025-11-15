/**
 * Color constants matching the Swift app design system (Rebrand palette only)
 */

// Rebrand palette (light theme)
const palette = {
  background: '#F8F8F8',
  card: '#FFFFFF',
  primary: '#7A1E1E',
  secondary: '#CBB26A',
  tertiary: '#1E1E1E',
  purple: '#A78BFA',
  text: '#1E1E1E',
  muted: '#6B6B6B',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#236193',
  border: 'rgba(30, 30, 30, 0.1)',
  borderLight: 'rgba(30, 30, 30, 0.05)',
  overlay: 'rgba(30, 30, 30, 0.25)',
  overlayLight: 'rgba(30, 30, 30, 0.12)',
  primaryTransparent: 'rgba(122, 30, 30, 0.2)',
  primaryTransparentLight: 'rgba(122, 30, 30, 0.1)',
  secondaryTransparent: 'rgba(203, 178, 106, 0.2)',
  tertiaryTransparent: 'rgba(30, 30, 30, 0.1)',
  inputBackground: '#FFFFFF',
  inputBorder: '#E5E5E5',
  inputPlaceholder: 'rgba(30, 30, 30, 0.45)',
  inputDisabled: 'rgba(30, 30, 30, 0.08)',
  buttonPrimary: '#7A1E1E',
  buttonSecondary: '#E5E5E5',
  buttonDisabled: 'rgba(30, 30, 30, 0.15)',
  online: '#4CAF50',
  offline: '#9E9E9E',
  loading: '#FF9800',
} as const;

export const colors = palette;

// Helper functions for creating color variants
export const createColorWithOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

// Shared gradient tokens
export const goldenGradient = [
  createColorWithOpacity(colors.secondary, 0.55),
  createColorWithOpacity(colors.secondary, 0.2),
] as const;

export const subtleGoldenGradient = [
  createColorWithOpacity(colors.secondary, 0.45),
  createColorWithOpacity(colors.secondary, 0.15),
] as const;

// Common color combinations for components
export const colorSchemes = {
  card: {
    background: colors.card,
    border: colors.border,
    shadow: colors.overlay,
  },
  button: {
    primary: {
      background: colors.primary,
      text: colors.text,
      border: colors.primary,
    },
    secondary: {
      background: colors.buttonSecondary,
      text: colors.text,
      border: colors.border,
    },
    disabled: {
      background: colors.buttonDisabled,
      text: colors.muted,
      border: colors.borderLight,
    },
  },
  input: {
    background: colors.inputBackground,
    border: colors.inputBorder,
    text: colors.text,
    placeholder: colors.inputPlaceholder,
    error: colors.error,
  },
  status: {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },
} as const;

// Export individual colors for convenience
export const {
  background,
  card,
  primary,
  secondary,
  tertiary,
  purple,
  text,
  muted,
  success,
  warning,
  error,
  info,
  border,
  borderLight,
  overlay,
  overlayLight,
  primaryTransparent,
  primaryTransparentLight,
  secondaryTransparent,
  tertiaryTransparent,
  inputBackground,
  inputBorder,
  inputPlaceholder,
  inputDisabled,
  buttonPrimary,
  buttonSecondary,
  buttonDisabled,
  online,
  offline,
  loading,
} = colors;
