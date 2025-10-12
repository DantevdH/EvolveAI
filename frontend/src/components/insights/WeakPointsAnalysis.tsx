import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { WeakPointsExplanation } from './WeakPointsExplanation';
import { WeakPointAnalysis } from '@/src/services/insightsAnalyticsService';

interface WeakPointsAnalysisProps {
  data: WeakPointAnalysis[];
  onExercisePress?: (exercise: WeakPointAnalysis) => void;
}

export const WeakPointsAnalysis: React.FC<WeakPointsAnalysisProps> = ({ 
  data, 
  onExercisePress 
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Weak Points Analysis</Text>
          <WeakPointsExplanation />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>All Good!</Text>
          <Text style={styles.emptyText}>
            No major issues detected. Keep up the great work!
          </Text>
        </View>
      </View>
    );
  }

  const getIssueIcon = (issue: string) => {
    switch (issue) {
      case 'plateau': return 'trending-up-outline';
      case 'declining': return 'trending-down';
      case 'inconsistent': return 'calendar-outline';
      case 'low_frequency': return 'time-outline';
      default: return 'alert-circle';
    }
  };

  const getIssueColor = (issue: string, severity: string) => {
    const baseColors = {
      plateau: colors.warning,
      declining: colors.error,
      inconsistent: colors.primary,
      low_frequency: colors.muted,
    };
    
    const baseColor = baseColors[issue as keyof typeof baseColors] || colors.muted;
    
    // Adjust opacity based on severity
    if (severity === 'high') return baseColor;
    if (severity === 'medium') return baseColor + 'CC';
    return baseColor + '99';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      default: return colors.success;
    }
  };

  const formatIssueTitle = (issue: string) => {
    switch (issue) {
      case 'plateau': return 'Performance Plateau';
      case 'declining': return 'Declining Performance';
      case 'inconsistent': return 'Inconsistent Training';
      case 'low_frequency': return 'Low Training Frequency';
      default: return 'Issue Detected';
    }
  };

  const formatMetrics = (metrics: WeakPointAnalysis['metrics']) => {
    if (metrics.change !== 0) {
      return `${metrics.change > 0 ? '+' : ''}${Math.round(metrics.change)}%`;
    }
    return Math.round(metrics.current).toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Weak Points Analysis</Text>
          <WeakPointsExplanation />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.length} Issues</Text>
        </View>
      </View>
      
      <Text style={styles.subtitle}>
        AI-identified areas that need attention for better results
      </Text>

      <View style={styles.issuesContainer}>
        {data.map((weakPoint, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.issueCard,
              { borderLeftColor: getIssueColor(weakPoint.issue, weakPoint.severity) }
            ]}
            onPress={() => onExercisePress?.(weakPoint)}
          >
            <View style={styles.issueHeader}>
              <View style={styles.issueInfo}>
                <View style={styles.issueIconContainer}>
                  <Ionicons 
                    name={getIssueIcon(weakPoint.issue)} 
                    size={20} 
                    color={getIssueColor(weakPoint.issue, weakPoint.severity)} 
                  />
                </View>
                <View style={styles.issueDetails}>
                  <Text style={styles.muscleGroupName}>
                    {weakPoint.muscleGroup}
                  </Text>
                  <Text style={styles.issueTitle}>
                    {formatIssueTitle(weakPoint.issue)}
                  </Text>
                  <Text style={styles.affectedExercises}>
                    Affects {weakPoint.affectedExercises.length} exercise{weakPoint.affectedExercises.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              
              <View style={styles.severityContainer}>
                <Ionicons 
                  name={getSeverityIcon(weakPoint.severity)} 
                  size={16} 
                  color={getSeverityColor(weakPoint.severity)} 
                />
                <Text style={[
                  styles.severityText,
                  { color: getSeverityColor(weakPoint.severity) }
                ]}>
                  {weakPoint.severity.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.recommendation}>
              {weakPoint.recommendation}
            </Text>

            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Current</Text>
                <Text style={styles.metricValue}>
                  {Math.round(weakPoint.metrics.current)}
                </Text>
              </View>
              
              {weakPoint.metrics.change !== 0 && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Change</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: weakPoint.metrics.change > 0 ? colors.error : colors.success }
                  ]}>
                    {formatMetrics(weakPoint.metrics)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionContainer}>
              <Text style={styles.actionText}>
                Tap for detailed analysis and solutions
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary insights */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
          <Text style={styles.summaryTitle}>AI Recommendations</Text>
        </View>
        
        <View style={styles.summaryContent}>
          {data.filter(wp => wp.issue === 'plateau').length > 0 && (
            <Text style={styles.summaryText}>
              • AI detected {data.filter(wp => wp.issue === 'plateau').length} muscle group(s) with plateaus - consider exercise variation
            </Text>
          )}
          
          {data.filter(wp => wp.issue === 'declining').length > 0 && (
            <Text style={styles.summaryText}>
              • AI detected {data.filter(wp => wp.issue === 'declining').length} muscle group(s) declining - focus on recovery and form
            </Text>
          )}
          
          {data.filter(wp => wp.issue === 'inconsistent').length > 0 && (
            <Text style={styles.summaryText}>
              • AI detected {data.filter(wp => wp.issue === 'inconsistent').length} muscle group(s) inconsistent - improve training schedule
            </Text>
          )}
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
    marginBottom: 8,
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
  badge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
  },
  issuesContainer: {
    marginBottom: 16,
  },
  issueCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  issueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  issueIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueDetails: {
    flex: 1,
  },
  muscleGroupName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  issueTitle: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  affectedExercises: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  recommendation: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 6,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.card,
  },
  actionText: {
    fontSize: 12,
    color: colors.muted,
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.success,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  summaryContent: {
    marginLeft: 28,
  },
  summaryText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
});
