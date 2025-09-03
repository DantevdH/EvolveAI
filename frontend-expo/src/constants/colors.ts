/**
 * Color constants matching the Swift app design system
 */

// Primary brand colors
export const colors = {
  // Background colors
  background: '#0D0D1A', // evolveBackground: Color(red: 0.05, green: 0.05, blue: 0.1)
  card: '#1A1A26', // evolveCard: Color(red: 0.1, green: 0.1, blue: 0.15)
  
  // Brand colors
  primary: '#932322', // evolvePrimary: Color(hex:"#932322")
  secondary: '#236193', // evolveSecondary: Color(hex: "#236193")
  tertiary: '#16B89F', // evolveTertiary: Color(hex: "#16B89F")
  
  // Text colors
  text: '#FFFFFF', // evolveText: Color.white
  muted: '#B3B3B3', // evolveMuted: Color(white: 0.7)
  
  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // UI element colors
  border: 'rgba(255, 255, 255, 0.2)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Transparent variants
  primaryTransparent: 'rgba(147, 35, 34, 0.2)',
  primaryTransparentLight: 'rgba(147, 35, 34, 0.1)',
  secondaryTransparent: 'rgba(35, 97, 147, 0.2)',
  tertiaryTransparent: 'rgba(22, 184, 159, 0.2)',
  
  // Input colors
  inputBackground: 'rgba(255, 255, 255, 0.1)',
  inputBorder: 'rgba(255, 255, 255, 0.2)',
  inputPlaceholder: 'rgba(255, 255, 255, 0.5)',
  
  // Button colors
  buttonPrimary: '#932322',
  buttonSecondary: 'rgba(255, 255, 255, 0.1)',
  buttonDisabled: 'rgba(255, 255, 255, 0.1)',
  
  // Status colors
  online: '#4CAF50',
  offline: '#9E9E9E',
  loading: '#FF9800',
} as const;

// Helper functions for creating color variants
export const createColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

// Common color combinations for components
export const colorSchemes = {
  // Card styles
  card: {
    background: colors.card,
    border: colors.border,
    shadow: colors.overlay,
  },
  
  // Button styles
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
  
  // Input styles
  input: {
    background: colors.inputBackground,
    border: colors.inputBorder,
    text: colors.text,
    placeholder: colors.inputPlaceholder,
    error: colors.error,
  },
  
  // Status styles
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
  buttonPrimary,
  buttonSecondary,
  buttonDisabled,
  online,
  offline,
  loading,
} = colors;
