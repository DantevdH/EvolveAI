/**
 * Performance Metrics Section (4a)
 *
 * Displays sport-specific analytics with volume/distance/time charts.
 * Uses separate charts for different metrics as specified.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, G, Text as SvgText, Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import {
  SportType,
  WeeklyMetrics,
  SPORT_METRICS_CONFIG,
  formatVolume,
  formatDistance,
  formatDuration,
} from '@/src/services/performanceMetricsService';

const CHART_HEIGHT = 180;
const CHART_PADDING = { top: 20, right: 16, bottom: 40, left: 50 };

/**
 * Format value without unit for y-axis labels
 * Removes units like "kg", "km", "min" but keeps time format like "h" and "m"
 */
function formatValueWithoutUnit(value: number, formatValue: (val: number) => string): string {
  const formatted = formatValue(value);
  // Remove units: kg, km, min (but keep h and m which are part of time format)
  return formatted
    .replace(/\s*(kg|km|min)\s*$/i, '')
    .trim();
}

/**
 * Calculate nice round numbers for y-axis scaling
 * Returns nice max value and step values for clean visualization
 */
function calculateNiceScale(maxValue: number, numSteps: number = 5): {
  max: number;
  steps: number[];
  stepSize: number;
} {
  if (maxValue === 0) {
    return { max: 10, steps: [0, 2, 4, 6, 8, 10], stepSize: 2 };
  }

  // Calculate order of magnitude
  const magnitude = Math.floor(Math.log10(maxValue));
  const normalized = maxValue / Math.pow(10, magnitude);
  
  // Round up to next "nice" number (1, 2, 5, 10, 20, 50, etc.)
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  
  const niceMax = niceNormalized * Math.pow(10, magnitude);
  const stepSize = niceMax / numSteps;
  
  // Round step size to a nice number
  const stepMagnitude = Math.floor(Math.log10(stepSize));
  const normalizedStep = stepSize / Math.pow(10, stepMagnitude);
  let niceStepNormalized: number;
  if (normalizedStep <= 1) niceStepNormalized = 1;
  else if (normalizedStep <= 2) niceStepNormalized = 2;
  else if (normalizedStep <= 5) niceStepNormalized = 5;
  else niceStepNormalized = 10;
  
  const niceStepSize = niceStepNormalized * Math.pow(10, stepMagnitude);
  
  // Generate steps
  const steps: number[] = [];
  for (let i = 0; i <= numSteps; i++) {
    steps.push(Math.round((niceStepSize * i) * 100) / 100);
  }
  
  return { max: niceMax, steps, stepSize: niceStepSize };
}

interface PerformanceMetricsSectionProps {
  selectedSport: SportType;
  weeklyMetrics: WeeklyMetrics[];
}

export const PerformanceMetricsSection: React.FC<PerformanceMetricsSectionProps> = ({
  selectedSport,
  weeklyMetrics,
}) => {
  const screenWidth = Dimensions.get('window').width;
  // Card has marginHorizontal: 16, paddingHorizontal: 24
  // So total horizontal space: screenWidth - (16 * 2) - (24 * 2) = screenWidth - 80
  // Add some extra padding for centering: subtract additional 32px (16px each side)
  const chartWidth = screenWidth - 80 - 32; // Centered with padding on both sides

  // Determine which chart(s) to show based on sport type
  const config = SPORT_METRICS_CONFIG[selectedSport];

  // Sport-specific charts
  if (!config) {
    return null;
  }

  // Filter metrics for selected sport
  const sportMetrics = weeklyMetrics.filter(m => m.sportType === selectedSport);

  if (sportMetrics.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available for this sport</Text>
        </View>
      </View>
    );
  }

  // Collect all chart sections to render
  const chartSections: React.ReactNode[] = [];

  // Volume chart (strength only)
  if (config.hasVolume && sportMetrics.some(m => m.volumeKg > 0)) {
    chartSections.push(
      <View key="volume" style={styles.chartSection}>
        <Text style={styles.chartTitle}>Training Volume</Text>
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>{formatVolume(sportMetrics[sportMetrics.length - 1]?.volumeKg || 0)}</Text>
          <Text style={styles.currentValueLabel}>This Week</Text>
        </View>
        <BarChart
          data={sportMetrics.map(m => ({
            label: formatWeekLabel(m.week),
            value: m.volumeKg,
          }))}
          width={chartWidth}
          height={CHART_HEIGHT}
          color={colors.primary}
          formatValue={formatVolume}
          unit="kg"
        />
        <ChartSummary
          current={sportMetrics[sportMetrics.length - 1]?.volumeKg || 0}
          average={sportMetrics.reduce((sum, m) => sum + m.volumeKg, 0) / sportMetrics.length}
          formatValue={formatVolume}
        />
      </View>
    );
  }

  // Distance chart (endurance sports)
  if (config.hasDistance && sportMetrics.some(m => m.distanceKm > 0)) {
    chartSections.push(
      <View key="distance" style={styles.chartSection}>
        <Text style={styles.chartTitle}>Distance</Text>
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>{formatDistance(sportMetrics[sportMetrics.length - 1]?.distanceKm || 0)}</Text>
          <Text style={styles.currentValueLabel}>This Week</Text>
        </View>
        <BarChart
          data={sportMetrics.map(m => ({
            label: formatWeekLabel(m.week),
            value: m.distanceKm,
          }))}
          width={chartWidth}
          height={CHART_HEIGHT}
          color={colors.info}
          formatValue={formatDistance}
          unit="km"
        />
        <ChartSummary
          current={sportMetrics[sportMetrics.length - 1]?.distanceKm || 0}
          average={sportMetrics.reduce((sum, m) => sum + m.distanceKm, 0) / sportMetrics.length}
          formatValue={formatDistance}
        />
      </View>
    );
  }

  // Duration chart
  if (config.hasTime && sportMetrics.some(m => m.durationMinutes > 0)) {
    chartSections.push(
      <View key="duration" style={styles.chartSection}>
        <Text style={styles.chartTitle}>Duration</Text>
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValue}>{formatDuration(sportMetrics[sportMetrics.length - 1]?.durationMinutes || 0)}</Text>
          <Text style={styles.currentValueLabel}>This Week</Text>
        </View>
        <BarChart
          data={sportMetrics.map(m => ({
            label: formatWeekLabel(m.week),
            value: m.durationMinutes,
          }))}
          width={chartWidth}
          height={CHART_HEIGHT}
          color={colors.secondary}
          formatValue={formatDuration}
          unit="min"
        />
        <ChartSummary
          current={sportMetrics[sportMetrics.length - 1]?.durationMinutes || 0}
          average={sportMetrics.reduce((sum, m) => sum + m.durationMinutes, 0) / sportMetrics.length}
          formatValue={formatDuration}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chartSections.map((section, index) => (
        <React.Fragment key={index}>
          {section}
          {index < chartSections.length - 1 && <View style={styles.chartSeparator} />}
        </React.Fragment>
      ))}

      {/* Heart Rate stats (if available) */}
      {config.hasHeartRate && sportMetrics.some(m => m.avgHeartRate !== null) && (
        <View style={styles.statsSection}>
          <Text style={styles.chartTitle}>Heart Rate</Text>
          <View style={styles.statsRow}>
            <StatItem
              label="Avg HR"
              value={`${Math.round(sportMetrics.filter(m => m.avgHeartRate !== null).reduce((sum, m) => sum + (m.avgHeartRate || 0), 0) / sportMetrics.filter(m => m.avgHeartRate !== null).length)} bpm`}
            />
            <StatItem
              label="Max HR"
              value={`${Math.max(...sportMetrics.filter(m => m.maxHeartRate !== null).map(m => m.maxHeartRate || 0))} bpm`}
            />
          </View>
        </View>
      )}
    </View>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: { label: string; value: number }[];
  width: number;
  height: number;
  color: string;
  formatValue: (value: number) => string;
  unit: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, width, height, color, formatValue, unit }) => {
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const chartAreaWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartAreaHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const { max: niceMax, steps } = calculateNiceScale(maxValue, 5);
  const barWidth = Math.min(chartAreaWidth / data.length - 6, 32);

  // Create gradient ID for bars
  const gradientId = `barGradient-${color.replace('#', '')}`;

  const handleBarPress = (index: number, barCenterX: number, barTopY: number) => {
    if (selectedBarIndex === index) {
      // Toggle off if same bar clicked
      setSelectedBarIndex(null);
      setTooltipPosition(null);
    } else {
      setSelectedBarIndex(index);
      // Position tooltip above the bar, centered horizontally
      setTooltipPosition({ x: barCenterX, y: barTopY - 5 });
    }
  };

  return (
    <View style={styles.chartContainer}>
      <Pressable
        style={styles.chartWrapper}
        onPress={() => {
          // Dismiss tooltip when clicking outside bars
          setSelectedBarIndex(null);
          setTooltipPosition(null);
        }}
      >
        <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.75" />
          </SvgLinearGradient>
        </Defs>

        {/* Y-axis unit label (shown once at the top) */}
        <SvgText
          x={CHART_PADDING.left - 8}
          y={CHART_PADDING.top - 12}
          textAnchor="end"
          fontSize={10}
          fontWeight="500"
          fill={colors.muted}
        >
          {unit}
        </SvgText>

        {/* Y-axis labels for each step */}
        {steps.map((step, stepIndex) => {
          const yPosition = height - CHART_PADDING.bottom - (step / niceMax) * chartAreaHeight;
          return (
            <G key={`step-${stepIndex}`}>
              <SvgText
                x={CHART_PADDING.left - 8}
                y={yPosition + 4}
                textAnchor="end"
                fontSize={11}
                fontWeight="600"
                fill={colors.muted}
              >
                {formatValueWithoutUnit(step, formatValue)}
              </SvgText>
              {/* Grid line */}
              {stepIndex > 0 && stepIndex < steps.length - 1 && (
                <Line
                  x1={CHART_PADDING.left}
                  y1={yPosition}
                  x2={width - CHART_PADDING.right}
                  y2={yPosition}
                  stroke={createColorWithOpacity(colors.muted, stepIndex === Math.floor(steps.length / 2) ? 0.1 : 0.08)}
                  strokeWidth={1}
                  strokeDasharray={stepIndex === Math.floor(steps.length / 2) ? "4,4" : undefined}
                />
              )}
            </G>
          );
        })}

        {/* Top and bottom grid lines */}
        <Line
          x1={CHART_PADDING.left}
          y1={CHART_PADDING.top}
          x2={width - CHART_PADDING.right}
          y2={CHART_PADDING.top}
          stroke={createColorWithOpacity(colors.muted, 0.15)}
          strokeWidth={1}
        />
        <Line
          x1={CHART_PADDING.left}
          y1={height - CHART_PADDING.bottom}
          x2={width - CHART_PADDING.right}
          y2={height - CHART_PADDING.bottom}
          stroke={createColorWithOpacity(colors.muted, 0.15)}
          strokeWidth={1}
        />

        {/* Bars */}
        <G>
          {data.map((item, index) => {
            const barHeight = (item.value / niceMax) * chartAreaHeight;
            const x = CHART_PADDING.left + (chartAreaWidth / data.length) * index + (chartAreaWidth / data.length - barWidth) / 2;
            const y = height - CHART_PADDING.bottom - barHeight;
            const isSelected = selectedBarIndex === index;

            return (
              <G key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 3)}
                  fill={isSelected ? color : `url(#${gradientId})`}
                  rx={6}
                  ry={6}
                  opacity={isSelected ? 0.9 : 1}
                />
                {/* X-axis label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={height - CHART_PADDING.bottom + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="500"
                  fill={colors.muted}
                >
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Clickable overlays for each bar */}
      {data.map((item, index) => {
        const barHeight = (item.value / niceMax) * chartAreaHeight;
        const x = CHART_PADDING.left + (chartAreaWidth / data.length) * index + (chartAreaWidth / data.length - barWidth) / 2;
        const y = height - CHART_PADDING.bottom - barHeight;
        const barCenterX = x + barWidth / 2;
        const barTopY = y;

        return (
          <Pressable
            key={`bar-overlay-${index}`}
            style={[
              styles.barOverlay,
              {
                left: x,
                top: y,
                width: barWidth,
                height: Math.max(barHeight, 3),
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleBarPress(index, barCenterX, barTopY);
            }}
          />
        );
      })}

      {/* Tooltip overlay */}
      {selectedBarIndex !== null && tooltipPosition && (
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipPosition.x - 50,
              top: tooltipPosition.y - 50,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipValue}>
            {formatValue(data[selectedBarIndex].value)}
          </Text>
          <Text style={styles.tooltipLabel}>
          {data[selectedBarIndex].label}
        </Text>
      </View>
      )}
      </Pressable>
    </View>
  );
};

// Chart Summary Component
interface ChartSummaryProps {
  current: number;
  average: number;
  formatValue: (value: number) => string;
}

const ChartSummary: React.FC<ChartSummaryProps> = ({ current, average, formatValue }) => {
  const change = average > 0 ? ((current - average) / average) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Average</Text>
        <Text style={styles.summaryValue}>{formatValue(average)}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Change</Text>
        <View style={styles.changeContainer}>
          <Text style={[styles.summaryValue, { color: isPositive ? colors.success : colors.error }]}>
            {isPositive ? '+' : ''}{change.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

// Stat Item Component
interface StatItemProps {
  label: string;
  value: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

// Helper function to format week label
function formatWeekLabel(weekStr: string): string {
  const date = new Date(weekStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  chartSection: {
    marginBottom: 0,
  },
  chartSeparator: {
    height: 1,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.1),
    marginVertical: 32,
    marginHorizontal: 0,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  currentValueContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.05),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.1),
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentValueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 0,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  changeContainer: {
    alignItems: 'center',
  },
  statsSection: {
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  chartWrapper: {
    position: 'relative',
  },
  barOverlay: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.muted,
  },
});
