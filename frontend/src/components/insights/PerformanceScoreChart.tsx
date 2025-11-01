import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Svg, Line, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { colors } from '@/src/constants/colors';
import { PerformanceExplanation } from './PerformanceExplanation';

type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PerformanceScoreChartProps {
  data: Array<{
    date: string;
    score: number;
    volume: number;
    consistency: number;
    improvement: number;
  }>;
  height?: number;
  selectedPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 200;
const padding = 40;

export const PerformanceScoreChart: React.FC<PerformanceScoreChartProps> = ({ 
  data, 
  height = chartHeight,
  selectedPeriod: propSelectedPeriod,
  onPeriodChange: propOnPeriodChange
}) => {
  // Use prop if provided (shared filter), otherwise use internal state
  const [internalPeriod, setInternalPeriod] = useState<TimePeriod>('3M');
  const selectedPeriod = propSelectedPeriod ?? internalPeriod;
  const setSelectedPeriod = propOnPeriodChange ?? setInternalPeriod;

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (selectedPeriod) {
      case '1M':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  }, [data, selectedPeriod]);

  if (!data || data.length === 0 || filteredData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Effective Training Index (ETI)</Text>
            <PerformanceExplanation />
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions with validation using filtered data
  const scores = filteredData.map(d => d.score).filter(s => !isNaN(s) && isFinite(s));
  const maxScore = scores.length > 0 ? Math.max(...scores) : 100;
  const minScore = Math.max(0, scores.length > 0 ? Math.min(...scores) : 0); // Never below zero
  const scoreRange = maxScore - minScore || 100;
  
  const chartInnerWidth = chartWidth - (padding * 2);
  const chartInnerHeight = height - (padding * 2);
  
  // Calculate points for the line with validation using filtered data
  const points = filteredData.map((point, index) => {
    const score = isNaN(point.score) || !isFinite(point.score) ? 50 : point.score;
    const x = padding + (index / Math.max(1, filteredData.length - 1)) * chartInnerWidth;
    const y = padding + ((maxScore - score) / scoreRange) * chartInnerHeight;
    return { x: isNaN(x) ? padding : x, y: isNaN(y) ? padding : y, score, date: point.date };
  });

  // Format date labels
  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  // Get trend direction using filtered data
  const getTrendDirection = () => {
    if (filteredData.length < 2) return 'stable';
    const firstScore = filteredData[0].score;
    const lastScore = filteredData[filteredData.length - 1].score;
    const change = lastScore - firstScore;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  };

  const trend = getTrendDirection();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Effective Training Index (ETI)</Text>
          <PerformanceExplanation />
        </View>
      </View>

      {/* This Week's Value */}
      {filteredData.length > 0 && (
        <View style={styles.weeklyValueContainer}>
          <Text style={styles.weeklyValueLabel}>This Week's ETI</Text>
          <Text style={styles.weeklyValue}>
            {Math.round(filteredData[filteredData.length - 1].score)}
          </Text>
        </View>
      )}
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={height}>
          {/* Grid lines */}
          <G>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * chartInnerHeight;
              const score = Math.max(0, maxScore - (ratio * scoreRange)); // Never below zero
              return (
                <G key={index}>
                  <Line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke={colors.card}
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <SvgText
                    x={padding - 10}
                    y={y + 5}
                    fontSize="12"
                    fill={colors.muted}
                    textAnchor="end"
                  >
                    {Math.round(score)}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* Score line */}
          <Polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={colors.primary}
              stroke={colors.background}
              strokeWidth="2"
            />
          ))}

          {/* Date labels */}
          {points.map((point, index) => (
            <G key={index} transform={`translate(${point.x}, ${height - 10}) rotate(-45)`}>
              <SvgText
                x={0}
                y={0}
                fontSize="10"
                fill={colors.muted}
                textAnchor="middle"
              >
                {formatDateLabel(point.date)}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round(maxScore)}
          </Text>
          <Text style={styles.statLabel}>Peak ETI</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round(filteredData.reduce((sum, d) => sum + d.score, 0) / filteredData.length)}
          </Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[
            styles.statValue,
            { color: filteredData.length > 1 && filteredData[filteredData.length - 1].score > filteredData[filteredData.length - 2].score ? colors.success : colors.error }
          ]}>
            {filteredData.length > 1 && filteredData[filteredData.length - 1].score > filteredData[filteredData.length - 2].score ? '+' : ''}
            {filteredData.length > 1 ? Math.round(((filteredData[filteredData.length - 1].score - filteredData[filteredData.length - 2].score) / filteredData[filteredData.length - 2].score) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Change</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  periodButtonTextActive: {
    color: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  trendIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    height: chartHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
  },
  breakdownContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: 16,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  weeklyValueContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  weeklyValueLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  weeklyValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
});
