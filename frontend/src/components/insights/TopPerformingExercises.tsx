import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Line, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { colors } from '@/src/constants/colors';

interface TopPerformingExercise {
  id: number;
  name: string;
  currentVolume: number;
  improvementRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastTraining: string;
  totalTrainings: number;
  insights: any;
}

interface TopPerformingExercisesProps {
  data: TopPerformingExercise[];
  onExercisePress?: (exercise: TopPerformingExercise) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = (screenWidth - 60) / 3; // 3 exercises side by side
const chartHeight = 80;

export const TopPerformingExercises: React.FC<TopPerformingExercisesProps> = ({ 
  data, 
  onExercisePress 
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Top Performing Exercises</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No exercise data available</Text>
        </View>
      </View>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'trending-up';
      case 'decreasing': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return colors.success;
      case 'decreasing': return colors.error;
      default: return colors.muted;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  const formatImprovement = (rate: number) => {
    return `${rate > 0 ? '+' : ''}${Math.round(rate)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };

  // Generate mini trend chart data
  const generateTrendData = (insights: any) => {
    const strengthGains = insights.strengthProgression.strengthGains || [];
    if (strengthGains.length < 2) return [];
    
    // Take last 6 data points or all if less than 6
    const recentData = strengthGains.slice(-6);
    const max1RM = Math.max(...recentData.map((d: any) => d.estimated1RM));
    const min1RM = Math.min(...recentData.map((d: any) => d.estimated1RM));
    const range = max1RM - min1RM || 1;
    
    return recentData.map((point: any, index: number) => {
      const x = (index / (recentData.length - 1)) * (chartWidth - 20);
      const y = ((max1RM - point.estimated1RM) / range) * (chartHeight - 20) + 10;
      return { x, y, value: point.estimated1RM };
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Performing Exercises</Text>
        <Text style={styles.subtitle}>Based on overall performance score</Text>
      </View>
      
      <View style={styles.exercisesContainer}>
        {data.slice(0, 3).map((exercise, index) => {
          const trendData = generateTrendData(exercise.insights);
          const performanceScore = exercise.insights.overallScore;
          
          return (
            <TouchableOpacity
              key={exercise.id}
              style={[
                styles.exerciseCard,
                index === 0 && styles.firstPlace,
                index === 1 && styles.secondPlace,
                index === 2 && styles.thirdPlace,
              ]}
              onPress={() => onExercisePress?.(exercise)}
            >
              {/* Rank indicator */}
              <View style={styles.rankContainer}>
                <View style={[
                  styles.rankBadge,
                  { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }
                ]}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
              </View>

              {/* Exercise name */}
              <Text style={styles.exerciseName} numberOfLines={1}>
                {exercise.name}
              </Text>

              {/* Performance score */}
              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.scoreValue,
                  { color: getPerformanceColor(performanceScore) }
                ]}>
                  {Math.round(performanceScore)}
                </Text>
                <Text style={styles.scoreLabel}>Score</Text>
              </View>

              {/* Mini trend chart */}
              {trendData.length > 1 && (
                <View style={styles.chartContainer}>
                  <Svg width={chartWidth - 20} height={chartHeight}>
                    <Polyline
                      points={trendData.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={getTrendColor(exercise.trend)}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {trendData.map((point, pointIndex) => (
                      <Circle
                        key={pointIndex}
                        cx={point.x}
                        cy={point.y}
                        r="2"
                        fill={getTrendColor(exercise.trend)}
                      />
                    ))}
                  </Svg>
                </View>
              )}

              {/* Metrics */}
              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <Ionicons 
                    name={getTrendIcon(exercise.trend)} 
                    size={12} 
                    color={getTrendColor(exercise.trend)} 
                  />
                  <Text style={[
                    styles.metricValue,
                    { color: getTrendColor(exercise.trend) }
                  ]}>
                    {formatImprovement(exercise.improvementRate)}
                  </Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Ionicons name="fitness" size={12} color={colors.muted} />
                  <Text style={styles.metricValue}>
                    {formatVolume(exercise.currentVolume)}
                  </Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Ionicons name="calendar" size={12} color={colors.muted} />
                  <Text style={styles.metricValue}>
                    {exercise.totalTrainings}
                  </Text>
                </View>
              </View>

              {/* Key insight */}
              {exercise.insights.keyInsights.length > 0 && (
                <Text style={styles.insight} numberOfLines={2}>
                  💡 {exercise.insights.keyInsights[0]}
                </Text>
              )}

              {/* Plateau warning */}
              {exercise.insights.plateauDetection.isPlateaued && (
                <View style={[
                  styles.plateauWarning,
                  { backgroundColor: exercise.insights.plateauDetection.severity === 'severe' ? colors.error + '20' : colors.warning + '20' }
                ]}>
                  <Ionicons name="warning" size={12} color={colors.warning} />
                  <Text style={styles.plateauText}>
                    {exercise.insights.plateauDetection.severity} plateau
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* View all exercises button */}
      <TouchableOpacity style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>View All Exercises</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  exercisesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exerciseCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    minHeight: 200,
  },
  firstPlace: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  secondPlace: {
    borderWidth: 2,
    borderColor: '#C0C0C0',
  },
  thirdPlace: {
    borderWidth: 2,
    borderColor: '#CD7F32',
  },
  rankContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  chartContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  metricsContainer: {
    width: '100%',
    marginBottom: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 10,
    color: colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  insight: {
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 14,
    marginBottom: 8,
  },
  plateauWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plateauText: {
    fontSize: 9,
    color: colors.warning,
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
});
