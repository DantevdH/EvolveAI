import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Line, Polyline, Circle, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/constants/colors';

interface ForecastData {
  week: number;
  predictedVolume: number;
  confidence: number;
  exercise?: string;
}

interface MilestonePrediction {
  exercise: {
    id: number;
    name: string;
  };
  current1RM: number;
  nextMilestone: number;
  predictedDate: string;
  confidence: number;
  weeksToGoal: number;
}

interface ForecastAndMilestonesProps {
  forecastData: ForecastData[];
  milestoneData: MilestonePrediction[];
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 150;
const padding = 40;

export const ForecastAndMilestones: React.FC<ForecastAndMilestonesProps> = ({ 
  forecastData, 
  milestoneData 
}) => {
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return colors.success;
    if (confidence >= 60) return colors.warning;
    return colors.error;
  };

  return (
    <View style={styles.container}>
      {/* 4-Week Forecast */}
      {forecastData && forecastData.length > 0 && (
        <View style={styles.section}>
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
                  const y = padding + ratio * (chartHeight - padding * 2);
                  return (
                    <Line
                      key={index}
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke={colors.card}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  );
                })}
              </G>

              {/* Forecast line */}
              <Polyline
                points={forecastData.map((point, index) => {
                  const volume = isNaN(point.predictedVolume) || !isFinite(point.predictedVolume) ? 1000 : point.predictedVolume;
                  const x = padding + (index / Math.max(1, forecastData.length - 1)) * (chartWidth - padding * 2);
                  const volumes = forecastData.map(p => p.predictedVolume).filter(v => !isNaN(v) && isFinite(v));
                  const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 2000;
                  const minVolume = volumes.length > 0 ? Math.min(...volumes) : 0;
                  const range = maxVolume - minVolume || 2000;
                  const y = padding + ((maxVolume - volume) / range) * (chartHeight - padding * 2);
                  return `${isNaN(x) ? padding : x},${isNaN(y) ? padding : y}`;
                }).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5,5"
              />

              {/* Data points */}
              {forecastData.map((point, index) => {
                const volume = isNaN(point.predictedVolume) || !isFinite(point.predictedVolume) ? 1000 : point.predictedVolume;
                const x = padding + (index / Math.max(1, forecastData.length - 1)) * (chartWidth - padding * 2);
                const volumes = forecastData.map(p => p.predictedVolume).filter(v => !isNaN(v) && isFinite(v));
                const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 2000;
                const minVolume = volumes.length > 0 ? Math.min(...volumes) : 0;
                const range = maxVolume - minVolume || 2000;
                const y = padding + ((maxVolume - volume) / range) * (chartHeight - padding * 2);
                
                return (
                  <G key={index}>
                    <Circle
                      cx={isNaN(x) ? padding : x}
                      cy={isNaN(y) ? padding : y}
                      r="6"
                      fill={colors.primary}
                      stroke={colors.background}
                      strokeWidth="2"
                    />
                    <Circle
                      cx={isNaN(x) ? padding : x}
                      cy={isNaN(y) ? padding : y}
                      r="3"
                      fill={getConfidenceColor(point.confidence)}
                    />
                  </G>
                );
              })}

              {/* Week labels */}
              {forecastData.map((point, index) => {
                const x = padding + (index / Math.max(1, forecastData.length - 1)) * (chartWidth - padding * 2);
                return (
                  <SvgText
                    key={index}
                    x={isNaN(x) ? padding : x}
                    y={chartHeight - 10}
                    fontSize="10"
                    fill={colors.muted}
                    textAnchor="middle"
                  >
                    Week {point.week}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          <View style={styles.forecastStats}>
            {forecastData.map((forecast, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastWeek}>Week {forecast.week}</Text>
                <Text style={styles.forecastVolume}>
                  {formatVolume(forecast.predictedVolume)}
                </Text>
                <Text style={[
                  styles.forecastConfidence,
                  { color: getConfidenceColor(forecast.confidence) }
                ]}>
                  {forecast.confidence}% confidence
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Milestone Predictions */}
      {milestoneData && milestoneData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>Upcoming Milestones</Text>
          </View>
          
          <View style={styles.milestonesContainer}>
            {milestoneData.map((milestone, index) => (
              <View key={index} style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneExercise}>
                      {milestone.exercise.name}
                    </Text>
                    <Text style={styles.milestoneTarget}>
                      Next: {milestone.nextMilestone} lbs
                    </Text>
                  </View>
                  <View style={styles.milestoneBadge}>
                    <Ionicons name="flag" size={16} color={colors.primary} />
                  </View>
                </View>

                <View style={styles.milestoneProgress}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${(milestone.current1RM / milestone.nextMilestone) * 100}%`,
                          backgroundColor: colors.primary
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {milestone.current1RM} / {milestone.nextMilestone} lbs
                  </Text>
                </View>

                <View style={styles.milestoneDetails}>
                  <View style={styles.milestoneDetail}>
                    <Ionicons name="calendar" size={14} color={colors.muted} />
                    <Text style={styles.milestoneDetailText}>
                      {formatDate(milestone.predictedDate)}
                    </Text>
                  </View>
                  <View style={styles.milestoneDetail}>
                    <Ionicons name="time" size={14} color={colors.muted} />
                    <Text style={styles.milestoneDetailText}>
                      {milestone.weeksToGoal} weeks
                    </Text>
                  </View>
                  <View style={styles.milestoneDetail}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={14} 
                      color={getConfidenceColor(milestone.confidence)} 
                    />
                    <Text style={[
                      styles.milestoneDetailText,
                      { color: getConfidenceColor(milestone.confidence) }
                    ]}>
                      {milestone.confidence}% likely
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* No data state */}
      {(!forecastData || forecastData.length === 0) && (!milestoneData || milestoneData.length === 0) && (
        <View style={styles.emptyState}>
          <Ionicons name="trending-up" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No Predictions Available</Text>
          <Text style={styles.emptyText}>
            Complete more trainings to unlock performance predictions and milestone forecasts.
          </Text>
        </View>
      )}
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forecastStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  forecastItem: {
    alignItems: 'center',
    flex: 1,
  },
  forecastWeek: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  forecastVolume: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  forecastConfidence: {
    fontSize: 10,
    fontWeight: '500',
  },
  milestonesContainer: {
    gap: 12,
  },
  milestoneCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneExercise: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  milestoneTarget: {
    fontSize: 12,
    color: colors.muted,
  },
  milestoneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneProgress: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.card,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  milestoneDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  milestoneDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneDetailText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
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
    paddingHorizontal: 20,
  },
});
