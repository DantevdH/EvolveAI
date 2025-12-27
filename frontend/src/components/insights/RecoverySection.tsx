/**
 * Recovery Section (4b)
 *
 * Displays muscle group recovery status based on ACWR calculations.
 * Shows status cards with color-coded indicators and recommendations.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import {
  MuscleRecoveryStatus,
  RecoveryStatus,
  getRecoveryStatusColor,
} from '@/src/services/recoveryCalculationService';

interface RecoverySectionProps {
  muscleRecoveryStatus: MuscleRecoveryStatus[];
  onMusclePress?: (muscle: MuscleRecoveryStatus) => void;
}

const STATUS_LABELS: Record<RecoveryStatus, string> = {
  recovered: 'Ready',
  recovering: 'Recovering',
  needs_rest: 'Needs Rest',
  not_trained_yet: 'No Data',
};

const STATUS_ICONS: Record<RecoveryStatus, keyof typeof Ionicons.glyphMap> = {
  recovered: 'checkmark-circle',
  recovering: 'time-outline',
  needs_rest: 'warning',
  not_trained_yet: 'help-circle-outline',
};

export const RecoverySection: React.FC<RecoverySectionProps> = ({
  muscleRecoveryStatus,
  onMusclePress,
}) => {
  if (muscleRecoveryStatus.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No Recovery Data</Text>
          <Text style={styles.emptyText}>
            Complete some workouts to see your muscle recovery status
          </Text>
        </View>
      </View>
    );
  }

  // Group by status for summary
  const statusCounts = muscleRecoveryStatus.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    },
    {} as Record<RecoveryStatus, number>
  );

  return (
    <View style={styles.container}>

      {/* Status Summary */}
      <View style={styles.summaryCard}>
        <LinearGradient
          colors={[
            createColorWithOpacity(colors.secondary, 0.06),
            createColorWithOpacity(colors.secondary, 0.02),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryRow}>
            {(['recovered', 'recovering', 'needs_rest'] as RecoveryStatus[]).map(status => (
              <View key={status} style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryDot,
                    { backgroundColor: getRecoveryStatusColor(status) },
                  ]}
                />
                <Text style={styles.summaryCount}>{statusCounts[status] || 0}</Text>
                <Text style={styles.summaryLabel}>{STATUS_LABELS[status]}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Muscle Cards */}
      <View style={styles.muscleGrid}>
        {muscleRecoveryStatus.map(muscle => (
          <MuscleRecoveryCard
            key={muscle.targetArea}
            muscle={muscle}
            onPress={() => onMusclePress?.(muscle)}
          />
        ))}
      </View>
    </View>
  );
};

interface MuscleRecoveryCardProps {
  muscle: MuscleRecoveryStatus;
  onPress?: () => void;
}

const MuscleRecoveryCard: React.FC<MuscleRecoveryCardProps> = ({ muscle, onPress }) => {
  const statusColor = getRecoveryStatusColor(muscle.status);

  return (
    <View style={styles.muscleCard}>
      <View style={styles.muscleCardHeader}>
        <View style={styles.muscleCardLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <Text style={styles.muscleName}>{muscle.targetArea}</Text>
        </View>
        <View style={styles.muscleCardRight}>
          <Ionicons
            name={STATUS_ICONS[muscle.status]}
            size={20}
            color={statusColor}
          />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {STATUS_LABELS[muscle.status]}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.3,
  },
  muscleGrid: {
    gap: 14,
  },
  muscleCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowColor: createColorWithOpacity(colors.text, 0.06),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  muscleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  muscleName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  muscleCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 0,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
