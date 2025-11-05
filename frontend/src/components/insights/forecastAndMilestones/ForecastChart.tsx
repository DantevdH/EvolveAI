import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Line, Polyline, Circle, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../../constants/colors';
import { ForecastData } from './types';

interface ForecastChartProps {
  forecastData: ForecastData[];
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 150;
const padding = 40;

export const ForecastChart: React.FC<ForecastChartProps> = ({ forecastData }) => {
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };

  if (!forecastData || forecastData.length === 0) {
    return null;
  }

  const volumes = forecastData.map(d => d.predictedVolume).filter(v => !isNaN(v) && isFinite(v));
  const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1000;
  const minVolume = volumes.length > 0 ? Math.min(...volumes) : 0;
  const volumeRange = maxVolume - minVolume || 1000;
  const chartInnerHeight = chartHeight - padding * 2;

  const points = forecastData.map((data, index) => {
    const x = padding + (index / (forecastData.length - 1 || 1)) * (chartWidth - padding * 2);
    const normalizedVolume = (data.predictedVolume - minVolume) / volumeRange;
    const y = padding + (1 - normalizedVolume) * chartInnerHeight;
    return { x, y, volume: data.predictedVolume, week: data.week };
  });

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trending-up" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>4-Week Forecast</Text>
      </View>
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="forecastGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
                    {formatVolume(volume)}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* Forecast line */}
          <Polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5,5"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill={colors.primary}
            />
          ))}

          {/* Week labels */}
          {points.map((point, index) => (
            <SvgText
              key={index}
              x={point.x}
              y={chartHeight - 10}
              fontSize="10"
              fill={colors.muted}
              textAnchor="middle"
            >
              W{point.week}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  chartContainer: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

