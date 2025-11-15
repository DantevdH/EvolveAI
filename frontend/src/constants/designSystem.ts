import { colors as baseColors, createColorWithOpacity } from './colors';

/**
 * Central Design System - Single source of truth for all styling
 * Matches your Swift app design system
 */

// ===== COLORS =====
const designColors = {
  background: baseColors.background,
  card: baseColors.card,
  primary: baseColors.primary,
  secondary: baseColors.secondary,
  tertiary: baseColors.tertiary,
  purple: baseColors.purple,
  text: baseColors.text,
  muted: baseColors.muted,
  success: baseColors.success,
  warning: baseColors.warning,
  error: baseColors.error,
  info: baseColors.info,
  border: baseColors.border,
  borderLight: baseColors.borderLight,
  overlay: baseColors.overlay,
  overlayLight: baseColors.overlayLight,
  primaryTransparent: baseColors.primaryTransparent,
  primaryTransparentLight: baseColors.primaryTransparentLight,
  secondaryTransparent: baseColors.secondaryTransparent,
  tertiaryTransparent: baseColors.tertiaryTransparent,
  inputBackground: baseColors.inputBackground,
  inputBorder: baseColors.inputBorder,
  inputPlaceholder: baseColors.inputPlaceholder,
  inputDisabled: baseColors.inputDisabled,
  buttonPrimary: baseColors.buttonPrimary,
  buttonSecondary: baseColors.buttonSecondary,
  buttonDisabled: baseColors.buttonDisabled,
  online: baseColors.online,
  offline: baseColors.offline,
  loading: baseColors.loading,
  errorBackground: createColorWithOpacity(baseColors.error, 0.1),
} as const;

export const colors = designColors;

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
    helper: {
      fontSize: typography.fontSizes.sm,
      color: colors.muted,
      marginTop: spacing.xs,
    },
  },
  card: {
    base: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
  },
} as const;
