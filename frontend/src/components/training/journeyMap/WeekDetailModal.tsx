/**
 * Week Detail Modal Component
 * Shows detailed information about a selected week
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { WeekModalData } from './types';

interface WeekDetailModalProps {
  data: WeekModalData | null;
  visible: boolean;
  onClose: () => void;
  onViewWeek: () => void;
}

const STATUS_CONFIG = {
  completed: {
    icon: 'checkmark-circle' as const,
    background: createColorWithOpacity(colors.secondary, 0.18),
    color: colors.secondary,
    label: 'Completed',
  },
  current: {
    icon: 'flash' as const,
    background: createColorWithOpacity(colors.primary, 0.12),
    color: colors.primary,
    label: "Current Week",
  },
  locked: {
    icon: 'lock-closed' as const,
    background: createColorWithOpacity(colors.text, 0.06),
    color: colors.muted,
    label: 'Locked',
  },
};

const WeekDetailModal: React.FC<WeekDetailModalProps> = ({
  data,
  visible,
  onClose,
  onViewWeek,
}) => {
  if (!data) return null;

  const statusConfig = STATUS_CONFIG[data.status];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Week {data.weekNumber}</Text>

          {data.status === 'completed' && (
            <View style={styles.stars}>
              {[...Array(3)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < data.stars ? 'star' : 'star-outline'}
                  size={32}
                  color={colors.warning}
                />
              ))}
            </View>
          )}

          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              {data.completedWorkouts} / {data.totalWorkouts} workouts completed
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${data.completionPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {data.completionPercentage}%
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusConfig.background,
              },
            ]}
          >
            <Ionicons
              name={statusConfig.icon}
              size={20}
              color={statusConfig.color}
            />
            <Text
              style={[styles.statusText, { color: statusConfig.color }]}
            >
              {statusConfig.label}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              data.status === 'locked' && styles.actionButtonDisabled,
            ]}
            onPress={onViewWeek}
            disabled={data.status === 'locked'}
          >
            <Text style={styles.actionButtonText}>
              {data.status === 'completed'
                ? 'Review Week Progress'
                : data.status === 'current'
                ? "Start Today's Workout"
                : 'Week Locked'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: createColorWithOpacity(colors.text, 0.08),
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
});

export default WeekDetailModal;

