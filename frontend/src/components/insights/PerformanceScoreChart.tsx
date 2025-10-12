import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Line, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { colors } from '@/src/constants/colors';
import { PerformanceExplanation } from './PerformanceExplanation';

interface PerformanceScoreChartProps {
  data: Array<{
    date: string;
    score: number;
    volume: number;
    consistency: number;
    improvement: number;
  }>;
  height?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 200;
const padding = 40;

export const PerformanceScoreChart: React.FC<PerformanceScoreChartProps> = ({ 
  data, 
  height = chartHeight 
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Performance Score Trend</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions with validation
  const scores = data.map(d => d.score).filter(s => !isNaN(s) && isFinite(s));
  const maxScore = scores.length > 0 ? Math.max(...scores) : 100;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const scoreRange = maxScore - minScore || 100;
  
  const chartInnerWidth = chartWidth - (padding * 2);
  const chartInnerHeight = height - (padding * 2);
  
  // Calculate points for the line with validation
  const points = data.map((point, index) => {
    const score = isNaN(point.score) || !isFinite(point.score) ? 50 : point.score;
    const x = padding + (index / Math.max(1, data.length - 1)) * chartInnerWidth;
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

  // Get trend direction
  const getTrendDirection = () => {
    if (data.length < 2) return 'stable';
    const firstScore = data[0].score;
    const lastScore = data[data.length - 1].score;
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
          <Text style={styles.title}>Performance Analysis</Text>
          <PerformanceExplanation />
        </View>
        <View style={styles.trendIndicator}>
          <Text style={[
            styles.trendText,
            { color: trend === 'improving' ? colors.success : 
                     trend === 'declining' ? colors.error : colors.muted }
          ]}>
            {trend === 'improving' ? '↗️ Improving' :
             trend === 'declining' ? '↘️ Declining' : '→ Stable'}
          </Text>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={height}>
          {/* Grid lines */}
          <G>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * chartInnerHeight;
              const score = maxScore - (ratio * scoreRange);
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
            stroke={getScoreColor(data[data.length - 1].score)}
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
              fill={getScoreColor(point.score)}
              stroke={colors.background}
              strokeWidth="2"
            />
          ))}

          {/* Date labels */}
          {points.map((point, index) => (
            <SvgText
              key={index}
              x={point.x}
              y={height - 10}
              fontSize="10"
              fill={colors.muted}
              textAnchor="middle"
            >
              {formatDateLabel(point.date)}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Performance breakdown */}
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownLabel}>Current Score</Text>
            <Text style={[
              styles.breakdownValue,
              { color: getScoreColor(data[data.length - 1].score) }
            ]}>
              {data[data.length - 1].score}
            </Text>
          </View>
          <View style={[
            styles.scoreBar,
            { backgroundColor: colors.background }
          ]}>
            <View style={[
              styles.scoreBarFill,
              { 
                width: `${data[data.length - 1].score}%`,
                backgroundColor: getScoreColor(data[data.length - 1].score)
              }
            ]} />
          </View>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Volume</Text>
            <Text style={styles.metricValue}>
              {Math.round(data[data.length - 1].volume)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Consistency</Text>
            <Text style={styles.metricValue}>
              {Math.round(data[data.length - 1].consistency)}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[
              styles.metricValue,
              { color: data[data.length - 1].improvement > 0 ? colors.success : colors.error }
            ]}>
              {data[data.length - 1].improvement > 0 ? '+' : ''}
              {Math.round(data[data.length - 1].improvement)}%
            </Text>
            <Text style={styles.metricLabel}>Improvement</Text>
          </View>
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
