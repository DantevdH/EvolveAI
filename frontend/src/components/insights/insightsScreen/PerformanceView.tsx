/**
 * Performance View Component - Displays performance metrics with sport filter
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { useInsights } from '../../../context/InsightsContext';
import { SportFilterDropdown } from '../SportFilterDropdown';
import { PerformanceMetricsSection } from '../PerformanceMetricsSection';
import { PeriodFilter } from './PeriodFilter';
import { TimePeriod } from './types';
import { SportType, WeeklyMetrics, SPORT_TYPE_LABELS } from '../../../services/performanceMetricsService';

export const PerformanceView: React.FC = () => {
  const { insightsData } = useInsights();
  
  // Get first active sport (alphabetically sorted)
  const defaultSport = useMemo(() => {
    if (insightsData.performedSportTypes.length === 0) {
      return 'strength' as SportType; // Fallback if no sports performed
    }
    // Sort performed sports alphabetically and get the first one
    const sorted = [...insightsData.performedSportTypes].sort((a, b) => {
      const labelA = SPORT_TYPE_LABELS[a] || a;
      const labelB = SPORT_TYPE_LABELS[b] || b;
      return labelA.localeCompare(labelB);
    });
    return sorted[0]; // First active sport alphabetically
  }, [insightsData.performedSportTypes]);

  const [selectedSport, setSelectedSport] = useState<SportType>(defaultSport);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('ALL');

  // Update selected sport if it's no longer available or if default changes
  useEffect(() => {
    if (!insightsData.performedSportTypes.includes(selectedSport)) {
      setSelectedSport(defaultSport);
    }
  }, [insightsData.performedSportTypes, selectedSport, defaultSport]);

  // Filter weekly metrics by period
  const getWeeklyMetricsForSport = (): WeeklyMetrics[] => {
    const allMetrics = insightsData.weeklyMetrics.get(selectedSport) || [];
    
    if (selectedPeriod === 'ALL') {
      return allMetrics;
    }

    const now = new Date();
    let cutoffDate: Date;

    switch (selectedPeriod) {
      case 'MTD': // Month to Date
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'QTD': // Quarter to Date
        const quarter = Math.floor(now.getMonth() / 3);
        cutoffDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'YTD': // Year to Date
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return allMetrics;
    }

    return allMetrics.filter(metric => {
      const weekDate = new Date(metric.week);
      return weekDate >= cutoffDate;
    });
  };

  return (
    <View style={styles.container}>
      {/* Section Header with Gradient */}
      <LinearGradient
        colors={[
          createColorWithOpacity(colors.secondary, 0.08),
          createColorWithOpacity(colors.secondary, 0.03),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Performance Metrics Section */}
      <View style={styles.content}>
        <View style={styles.filterContainer}>
          <SportFilterDropdown
            selectedSport={selectedSport}
            onSelectSport={setSelectedSport}
            availableSports={insightsData.performedSportTypes}
          />
        </View>
        <View style={styles.periodFilterContainer}>
          <PeriodFilter
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </View>
        <View style={styles.separator} />
        <PerformanceMetricsSection
          selectedSport={selectedSport}
          weeklyMetrics={getWeeklyMetricsForSport()}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  headerGradient: {
    // Gradient background
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  headerContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  filterContainer: {
    marginBottom: 12,
  },
  periodFilterContainer: {
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  separator: {
    height: 1,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.1),
    marginVertical: 20,
    marginHorizontal: 0,
  },
});

