/**
 * Week Detail Modal Component
 * Shows detailed information about a selected week
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { WeekModalData } from './types';

interface WeekDetailModalProps {
  data: WeekModalData | null;
  visible: boolean;
  onClose: () => void;
  onViewWeek: () => void;
}

const WeekDetailModal: React.FC<WeekDetailModalProps> = ({
  data,
  visible,
  onClose,
  onViewWeek,
}) => {
  if (!data) return null;

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
          
          {/* Stars for completed weeks */}
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

          {/* Progress section */}
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

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  data.status === 'completed'
                    ? colors.tertiaryTransparent
                    : data.status === 'current'
                    ? colors.primaryTransparent
                    : colors.inputBackground,
              },
            ]}
          >
            <Ionicons
              name={
                data.status === 'completed'
                  ? 'checkmark-circle'
                  : data.status === 'current'
                  ? 'flash'
                  : 'lock-closed'
              }
              size={20}
              color={
                data.status === 'completed'
                  ? colors.tertiary
                  : data.status === 'current'
                  ? colors.primary
                  : colors.muted
              }
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    data.status === 'completed'
                      ? colors.tertiary
                      : data.status === 'current'
                      ? colors.primary
                      : colors.muted,
                },
              ]}
            >
              {data.status === 'completed'
                ? 'Completed'
                : data.status === 'current'
                ? 'Current Week'
                : 'Locked'}
            </Text>
          </View>

          {/* Action button */}
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
    backgroundColor: colors.inputBackground,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.tertiary,
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
    color: colors.text,
  },
});

export default WeekDetailModal;

