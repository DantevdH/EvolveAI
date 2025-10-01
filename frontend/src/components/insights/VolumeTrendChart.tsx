import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Svg, Line, Polyline, Circle, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/constants/colors';

interface VolumeTrendChartProps {
  data: Array<{
    week: string;
    volume: number;
    trainings: number;
    exercises: number;
  }>;
  height?: number;
}

type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 200;
const padding = 40;

export const VolumeTrendChart: React.FC<VolumeTrendChartProps> = ({ 
  data, 
  height = chartHeight 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3M');

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Volume Trend</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions with validation
  const volumes = filteredData.map(d => d.volume).filter(v => !isNaN(v) && isFinite(v));
  const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1000;
  const minVolume = volumes.length > 0 ? Math.min(...volumes) : 0;
  const volumeRange = maxVolume - minVolume || 1000;
  
  const chartInnerWidth = chartWidth - (padding * 2);
  const chartInnerHeight = height - (padding * 2);
  
  // Calculate points for the line with validation
  const points = filteredData.map((point, index) => {
    const volume = isNaN(point.volume) || !isFinite(point.volume) ? 0 : point.volume;
    const x = padding + (index / Math.max(1, filteredData.length - 1)) * chartInnerWidth;
    const y = padding + ((maxVolume - volume) / volumeRange) * chartInnerHeight;
    return { x: isNaN(x) ? padding : x, y: isNaN(y) ? padding : y, volume, week: point.week };
  });

  // Create polyline path
  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Format week labels
  const formatWeekLabel = (weekString: string) => {
    const date = new Date(weekString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format volume labels
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Volume Trend</Text>
        <View style={styles.periodToggle}>
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
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
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          <G>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * chartInnerHeight;
              const volume = maxVolume - (ratio * volumeRange);
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
                    {formatVolume(Math.round(volume))}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* Volume line */}
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

          {/* Week labels */}
          {points.map((point, index) => (
            <SvgText
              key={index}
              x={point.x}
              y={height - 10}
              fontSize="10"
              fill={colors.muted}
              textAnchor="middle"
            >
              {formatWeekLabel(point.week)}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatVolume(Math.round(maxVolume))}
          </Text>
          <Text style={styles.statLabel}>Peak Volume</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatVolume(Math.round(filteredData.reduce((sum, d) => sum + d.volume, 0) / filteredData.length))}
          </Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[
            styles.statValue,
            { color: filteredData.length > 1 && filteredData[filteredData.length - 1].volume > filteredData[0].volume ? colors.success : colors.error }
          ]}>
            {filteredData.length > 1 && filteredData[filteredData.length - 1].volume > filteredData[0].volume ? '+' : ''}
            {filteredData.length > 1 ? Math.round(((filteredData[filteredData.length - 1].volume - filteredData[0].volume) / filteredData[0].volume) * 100) : 0}%
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
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: 16,
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
});
