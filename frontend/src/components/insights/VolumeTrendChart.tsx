import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Rect, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import { VolumeTrendExplanation } from './VolumeTrendExplanation';

interface VolumeTrendChartProps {
  data: Array<{
    week: string;
    volume: number;
    trainings: number;
    exercises: number;
  }>;
  height?: number;
  hideTitle?: boolean;
  selectedPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
}

type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 200;
const padding = 40;

export const VolumeTrendChart: React.FC<VolumeTrendChartProps> = ({ 
  data, 
  height = chartHeight,
  hideTitle = false,
  selectedPeriod: propSelectedPeriod,
  onPeriodChange: propOnPeriodChange
}) => {
  // Use prop if provided (shared filter), otherwise use internal state
  const [internalPeriod, setInternalPeriod] = useState<TimePeriod>('3M');
  const selectedPeriod = propSelectedPeriod ?? internalPeriod;
  const setSelectedPeriod = propOnPeriodChange ?? setInternalPeriod;

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
    
    return data.filter(item => new Date(item.week) >= cutoffDate);
  }, [data, selectedPeriod]);

  if (!data || data.length === 0) {
    return (
      <View style={hideTitle ? styles.chartOnlyContainer : styles.container}>
        {!hideTitle && (
          <View style={styles.header}>
            <Text style={styles.title}>Volume Trend</Text>
          </View>
        )}
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions with validation
  const volumes = filteredData.map(d => d.volume).filter(v => !isNaN(v) && isFinite(v));
  const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1000;
  const minVolume = Math.max(0, volumes.length > 0 ? Math.min(...volumes) : 0); // Never below zero
  const volumeRange = maxVolume - minVolume || 1000;
  
  const chartInnerWidth = chartWidth - (padding * 2);
  const chartInnerHeight = height - (padding * 2);
  
  // Calculate bar positions and dimensions
  const barWidth = Math.max(8, (chartInnerWidth / filteredData.length) * 0.6);
  const barSpacing = (chartInnerWidth / filteredData.length) * 0.4;
  
  const bars = filteredData.map((point, index) => {
    const volume = isNaN(point.volume) || !isFinite(point.volume) ? 0 : point.volume;
    const barHeight = (volume / maxVolume) * chartInnerHeight;
    const x = padding + (index * (barWidth + barSpacing)) + (barSpacing / 2);
    const y = padding + chartInnerHeight - barHeight;
    return { 
      x: isNaN(x) ? padding : x, 
      y: isNaN(y) ? padding : y, 
      width: barWidth,
      height: Math.max(2, barHeight),
      volume, 
      week: point.week 
    };
  });

  // Format week labels
  const formatWeekLabel = (weekString: string) => {
    const date = new Date(weekString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format volume labels (always as integers for main chart, keep original for exercise detail)
  const formatVolume = (volume: number, roundToInteger: boolean = false) => {
    const roundedVolume = roundToInteger ? Math.round(volume) : volume;
    if (roundedVolume >= 1000) {
      const thousands = roundToInteger 
        ? Math.round(roundedVolume / 1000) 
        : (roundedVolume / 1000).toFixed(1);
      return `${thousands}k`;
    }
    return roundToInteger ? Math.round(roundedVolume).toString() : roundedVolume.toString();
  };

  return (
    <View style={hideTitle ? styles.chartOnlyContainer : styles.container}>
      {!hideTitle && (
        <>
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
                  <Ionicons name="trending-up" size={16} color={colors.primary} />
                  <Text style={styles.title}>VOLUME TREND</Text>
                  <VolumeTrendExplanation />
                </View>
                <View style={styles.periodToggle}>
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as TimePeriod[]).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodButton,
                        selectedPeriod === period && styles.periodButtonActive
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        selectedPeriod === period && styles.periodButtonTextActive
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </LinearGradient>
        </>
      )}

      {/* This Week's Value */}
      {!hideTitle && filteredData.length > 0 && (
        <View style={styles.weeklyValueContainer}>
          <View style={styles.weeklyValueContent}>
            <View style={styles.weeklyValueLeft}>
              <Text style={styles.weeklyValueLabel}>This Week</Text>
              <Text style={styles.weeklyValueSubLabel}>Training Volume</Text>
            </View>
            <View style={styles.weeklyValueRight}>
              <Text style={styles.weeklyValue}>
                {formatVolume(filteredData[filteredData.length - 1].volume, !hideTitle)}
              </Text>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            <SvgLinearGradient id="volumeBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.secondary} stopOpacity="0.95" />
              <Stop offset="50%" stopColor={colors.secondary} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>

          {/* Volume bars */}
          {bars.map((bar, index) => (
              <G key={index}>
                <Rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx={4}
                  ry={4}
                  fill="url(#volumeBarGradient)"
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
                    {formatVolume(bar.volume, !hideTitle)}
                  </SvgText>
                )}
              </G>
            ))}

          {/* Week labels */}
          {bars.map((bar, index) => (
            <G key={index} transform={`translate(${bar.x + bar.width / 2}, ${height - 10}) rotate(-45)`}>
              <SvgText
                x={0}
                y={0}
                fontSize="10"
                fill={colors.muted}
                textAnchor="middle"
              >
                {formatWeekLabel(bar.week)}
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
              {formatVolume(maxVolume, !hideTitle)}
            </Text>
          </View>
          <View style={styles.statDividerVertical} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {formatVolume(filteredData.reduce((sum, d) => sum + d.volume, 0) / filteredData.length, !hideTitle)}
            </Text>
          </View>
          <View style={styles.statDividerVertical} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[
              styles.statValue,
              { color: filteredData.length > 1 && filteredData[filteredData.length - 1].volume > filteredData[filteredData.length - 2].volume ? colors.success : colors.error }
            ]}>
              {filteredData.length > 1 && filteredData[filteredData.length - 1].volume > filteredData[filteredData.length - 2].volume ? '+' : ''}
              {filteredData.length > 1 ? Math.round(((filteredData[filteredData.length - 1].volume - filteredData[filteredData.length - 2].volume) / filteredData[filteredData.length - 2].volume) * 100) : 0}%
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
  chartOnlyContainer: {
    // No extra padding/margin when used within existing container
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
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  periodButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  periodButtonTextActive: {
    color: colors.card,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
