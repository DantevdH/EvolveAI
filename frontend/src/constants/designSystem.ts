/**
 * Central Design System - Single source of truth for all styling
 * Matches your Swift app design system
 */

// ===== COLORS =====
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
  inputDisabled: 'rgba(255, 255, 255, 0.05)',
  
  // Button colors
  buttonPrimary: '#932322',
  buttonSecondary: 'rgba(255, 255, 255, 0.1)',
  buttonDisabled: 'rgba(255, 255, 255, 0.1)',
  
  // Status colors
  online: '#4CAF50',
  offline: '#9E9E9E',
  loading: '#FF9800',
  
  // Error states
  errorBackground: 'rgba(244, 67, 54, 0.1)',
} as const;

// ===== SPACING =====
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ===== TYPOGRAPHY =====
export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// ===== BORDER RADIUS =====
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

// ===== SHADOWS =====
export const shadows = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ===== ANIMATION =====
export const animation = {
  durations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easings: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// ===== COMPONENT STYLES =====
export const componentStyles = {
  // Button styles
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: colors.primary,
      ...shadows.md,
    },
    primaryDisabled: {
      backgroundColor: colors.buttonDisabled,
      borderColor: colors.borderLight,
      shadowOpacity: 0,
      elevation: 0,
    },
    secondary: {
      backgroundColor: colors.inputBackground,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
  },
  
  // Input styles
  input: {
    container: {
      marginBottom: spacing.xxl,
    },
    label: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    field: {
      backgroundColor: colors.inputBackground,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      fontSize: typography.fontSizes.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    fieldError: {
      borderColor: colors.error,
      backgroundColor: colors.primaryTransparentLight,
    },
    textArea: {
      backgroundColor: colors.inputBackground,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      fontSize: typography.fontSizes.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      minHeight: 120,
      textAlignVertical: 'top' as const,
    },
  },
  
  // Loading styles
  loading: {
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
    spinner: {
      size: 'large' as const,
      color: colors.primary,
    },
    text: {
      marginTop: spacing.lg,
      fontSize: typography.fontSizes.md,
      color: colors.text,
      textAlign: 'center' as const,
    },
  },
} as const;

// ===== EXPORTS =====
export const designSystem = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animation,
  componentStyles,
} as const;

// Export individual items for convenience
export {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animation,
  componentStyles,
};
