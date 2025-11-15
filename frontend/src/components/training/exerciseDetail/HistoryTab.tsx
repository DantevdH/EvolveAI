import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { Exercise } from '../../../types/training';
import { VolumeTrendChart } from '../../insights/VolumeTrendChart';
import { HistoryData } from './types';

interface HistoryTabProps {
  exercise: Exercise;
  historyData: HistoryData | null;
  loading: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ exercise, historyData, loading }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Transform volumeData to VolumeTrendChart format
  const chartData = useMemo(() => {
    if (!historyData?.volumeData || historyData.volumeData.length === 0) {
      return [];
    }

    return historyData.volumeData.map(item => ({
      week: item.date,
      volume: item.volume,
      trainings: 1,
      exercises: 1
    }));
  }, [historyData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Loading History...</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Fetching your training data...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!historyData || historyData.volumeData?.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Progress Over Time</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="trending-up" size={48} color={colors.primary} />
            <Text style={styles.chartTitle}>No Data Yet</Text>
            <Text style={styles.chartSubtitle}>Complete some trainings to see your progress</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Personal Records</Text>
          </View>
          <View style={styles.recordsContainer}>
            <View style={styles.recordItem}>
              <Text style={styles.recordLabel}>Max Weight</Text>
              <Text style={styles.recordValue}>No data</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Volume Progress</Text>
        </View>

        {loading ? (
          <View style={styles.chartContainer}>
            <View style={styles.chartArea}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading volume data...</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <VolumeTrendChart data={chartData} height={200} hideTitle={true} />
          </View>
        )}
      </View>

      {/* Personal Records */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>Personal Records</Text>
        </View>

        <View style={styles.recordsContainer}>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>Max Weight</Text>
            <Text style={styles.recordValue}>
              {historyData.maxWeight > 0 ? `${historyData.maxWeight} kg` : 'No data'}
            </Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={styles.recordLabel}>Max Volume</Text>
            <Text style={styles.recordValue}>
              {historyData.maxVolume > 0 ? `${Math.round(historyData.maxVolume)} kg` : 'No data'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  chartPlaceholder: {
    backgroundColor: colors.background,
    height: 180,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  chartContainer: {
    padding: 16,
  },
  chartArea: {
    height: 120,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  recordsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  recordItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  recordLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  recordValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
});

