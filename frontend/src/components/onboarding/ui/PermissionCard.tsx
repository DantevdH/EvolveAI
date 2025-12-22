/**
 * PermissionCard - Reusable card component for permission requests
 *
 * Displays:
 * - Icon and title
 * - Description of what the permission enables
 * - Action button (Request/Granted/Denied states)
 * - Skip option
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../../constants/designSystem';
import { createColorWithOpacity } from '../../../constants/colors';

export type PermissionStatus = 'not_requested' | 'loading' | 'granted' | 'requires_settings' | 'unavailable';

interface PermissionCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  status: PermissionStatus;
  onRequest: () => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
}

export const PermissionCard: React.FC<PermissionCardProps> = ({
  title,
  description,
  icon,
  iconColor = colors.primary,
  status,
  onRequest,
  onOpenSettings,
  disabled = false,
}) => {
  const renderStatusBadge = () => {
    switch (status) {
      case 'granted':
        return (
          <View style={[styles.badge, styles.badgeGranted]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.badgeText, styles.badgeTextGranted]}>Enabled</Text>
          </View>
        );
      case 'requires_settings':
        return (
          <View style={[styles.badge, styles.badgeRequiresSettings]}>
            <Ionicons name="settings-outline" size={14} color={colors.warning} />
            <Text style={[styles.badgeText, styles.badgeTextRequiresSettings]}>Requires Settings</Text>
          </View>
        );
      case 'unavailable':
        return (
          <View style={[styles.badge, styles.badgeUnavailable]}>
            <Ionicons name="remove-circle" size={14} color={colors.muted} />
            <Text style={[styles.badgeText, styles.badgeTextUnavailable]}>Not Available</Text>
          </View>
        );
      case 'not_requested':
        return (
          <View style={[styles.badge, styles.badgeDisabled]}>
            <Ionicons name="ellipse-outline" size={14} color={colors.muted} />
            <Text style={[styles.badgeText, styles.badgeTextDisabled]}>Disabled</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const handleCardPress = () => {
    if (disabled || status === 'loading' || status === 'unavailable') {
      return;
    }

    switch (status) {
      case 'granted':
        // When granted, open Settings so user can manage permissions
        // Apps cannot programmatically revoke permissions - user must do it in Settings
        onOpenSettings?.();
        break;
      case 'requires_settings':
        // When requires settings, open Settings so user can enable permissions
        onOpenSettings?.();
        break;
      default:
        // When not requested, request the permission
        onRequest();
        break;
    }
  };

  const isClickable = !disabled && status !== 'loading' && status !== 'unavailable';
  const CardWrapper = isClickable ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={[styles.container, status === 'granted' && styles.containerGranted]}
      onPress={handleCardPress}
      activeOpacity={0.7}
      disabled={!isClickable}
    >
      <View style={styles.contentRow}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: createColorWithOpacity(iconColor, 0.12) }]}>
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons name={icon} size={24} color={iconColor} />
          )}
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {renderStatusBadge()}
          </View>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    marginBottom: spacing.md,
  },
  containerGranted: {
    borderColor: createColorWithOpacity(colors.success, 0.4),
    backgroundColor: createColorWithOpacity(colors.success, 0.05),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  badgeGranted: {
    backgroundColor: createColorWithOpacity(colors.success, 0.15),
  },
  badgeRequiresSettings: {
    backgroundColor: createColorWithOpacity(colors.warning, 0.15),
  },
  badgeUnavailable: {
    backgroundColor: createColorWithOpacity(colors.muted, 0.15),
  },
  badgeDisabled: {
    backgroundColor: createColorWithOpacity(colors.muted, 0.15),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextGranted: {
    color: colors.success,
  },
  badgeTextRequiresSettings: {
    color: colors.warning,
  },
  badgeTextUnavailable: {
    color: colors.muted,
  },
  badgeTextDisabled: {
    color: colors.muted,
  },
});
