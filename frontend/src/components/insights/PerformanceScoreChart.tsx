import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Rect, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
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
  
  // Calculate bar positions and dimensions
  const barWidth = Math.max(8, (chartInnerWidth / filteredData.length) * 0.6);
  const barSpacing = (chartInnerWidth / filteredData.length) * 0.4;
  
  const bars = filteredData.map((point, index) => {
    const score = isNaN(point.score) || !isFinite(point.score) ? 50 : point.score;
    const barHeight = (score / maxScore) * chartInnerHeight;
    const x = padding + (index * (barWidth + barSpacing)) + (barSpacing / 2);
    const y = padding + chartInnerHeight - barHeight;
    return { 
      x: isNaN(x) ? padding : x, 
      y: isNaN(y) ? padding : y, 
      width: barWidth,
      height: Math.max(2, barHeight),
      score, 
      date: point.date 
    };
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
      <LinearGradient
        colors={[
          createColorWithOpacity(colors.secondary, 0.08),
          createColorWithOpacity(colors.secondary, 0.03),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Ionicons name="pulse" size={16} color={colors.primary} />
              <Text style={styles.title}>EFFECTIVE TRAINING INDEX (ETI)</Text>
              <PerformanceExplanation />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* This Week's Value */}
      {filteredData.length > 0 && (
        <View style={styles.weeklyValueContainer}>
          <View style={styles.weeklyValueContent}>
            <View style={styles.weeklyValueLeft}>
              <Text style={styles.weeklyValueLabel}>This Week</Text>
              <Text style={styles.weeklyValueSubLabel}>Training Index</Text>
            </View>
            <View style={styles.weeklyValueRight}>
              <Text style={styles.weeklyValue}>
                {Math.round(filteredData[filteredData.length - 1].score)}
              </Text>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            <SvgLinearGradient id="scoreBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.secondary} stopOpacity="0.95" />
              <Stop offset="50%" stopColor={colors.secondary} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>

          {/* Score bars */}
          {bars.map((bar, index) => (
              <G key={index}>
                <Rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx={4}
                  ry={4}
                  fill="url(#scoreBarGradient)"
                />
                {/* Bar value label on top */}
                {bar.height > 20 && (
                  <SvgText
                    x={bar.x + bar.width / 2}
                    y={bar.y - 4}
                    fontSize="10"
                    fill={colors.text}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {Math.round(bar.score)}
                  </SvgText>
                )}
              </G>
            ))}

          {/* Date labels */}
          {bars.map((bar, index) => (
            <G key={index} transform={`translate(${bar.x + bar.width / 2}, ${height - 10}) rotate(-45)`}>
              <SvgText
                x={0}
                y={0}
                fontSize="10"
                fill={colors.muted}
                textAnchor="middle"
              >
                {formatDateLabel(bar.date)}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statDivider} />
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Peak</Text>
            <Text style={styles.statValue}>
              {Math.round(maxScore)}
            </Text>
          </View>
          <View style={styles.statDividerVertical} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {Math.round(filteredData.reduce((sum, d) => sum + d.score, 0) / filteredData.length)}
            </Text>
          </View>
          <View style={styles.statDividerVertical} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[
              styles.statValue,
              { color: filteredData.length > 1 && filteredData[filteredData.length - 1].score > filteredData[filteredData.length - 2].score ? colors.success : colors.error }
            ]}>
              {filteredData.length > 1 && filteredData[filteredData.length - 1].score > filteredData[filteredData.length - 2].score ? '+' : ''}
              {filteredData.length > 1 ? Math.round(((filteredData[filteredData.length - 1].score - filteredData[filteredData.length - 2].score) / filteredData[filteredData.length - 2].score) * 100) : 0}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  headerGradient: {
    // Gradient background for header
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statDivider: {
    height: 1,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.15),
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDividerVertical: {
    width: 1,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.15),
    marginHorizontal: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyValueContainer: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.15),
  },
  weeklyValueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyValueLeft: {
    flex: 1,
  },
  weeklyValueRight: {
    alignItems: 'flex-end',
  },
  weeklyValueLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  weeklyValueSubLabel: {
    fontSize: 11,
    color: createColorWithOpacity(colors.muted, 0.7),
    fontWeight: '500',
  },
  weeklyValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
});
