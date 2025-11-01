import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
  // Always show the component, even if no data
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Muscle Strength Index (MSI)</Text>
          <WeakPointsExplanation />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyText}>
            Complete some training sessions to see your muscle group analysis.
          </Text>
        </View>
      </View>
    );
  }

  // Sort from low to high (ascending) by strength score
  // Lower strength = higher weakness, so we prioritize showing weaker muscles first
  const sortedData = [...data].sort((a, b) => {
    const strengthA = 100 - a.metrics.current;
    const strengthB = 100 - b.metrics.current;
    return strengthA - strengthB; // Ascending: weak muscles first
  });

  // Calculate average strength across all muscles
  const averageStrength = data.length > 0
    ? data.reduce((sum, item) => {
        const strengthScore = 100 - item.metrics.current;
        return sum + strengthScore;
      }, 0) / data.length
    : 0;

  const formatIssueTitle = (issue: string) => {
    switch (issue) {
      case 'plateau': return 'Performance Plateau';
      case 'declining': return 'Declining Performance';
      case 'inconsistent': return 'Inconsistent Training';
      case 'low_frequency': return 'Low Training Frequency';
      default: return 'Issue Detected';
    }
  };

  const getScoreColor = (score: number) => {
    // Updated ranges: Excellent >80, Good 60-80, Fair 40-60, Weak 20-40, Very Weak <20
    if (score > 80) return '#2E7D32'; // Excellent - Dark green
    if (score >= 60) return '#81C784'; // Good - Light green
    if (score >= 40) return colors.warning; // Fair - Orange
    if (score >= 20) return '#FF6B6B'; // Weak - Red-orange
    return colors.error; // Very Weak - Red
  };

  const getScoreLabel = (score: number) => {
    // Updated ranges with clearer naming
    if (score > 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Muscle Strength Index (MSI)</Text>
          <WeakPointsExplanation />
        </View>
      </View>

      {/* Average Strength Value */}
      {data.length > 0 && (
        <View style={styles.weeklyValueContainer}>
          <Text style={styles.weeklyValueLabel}>Average MSI</Text>
          <Text style={styles.weeklyValue}>
            {Math.round(averageStrength)}
          </Text>
        </View>
      )}
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        {sortedData.map((weakPoint, index) => {
          // Convert weakness score (0-100) to strength score (100-0)
          // Higher weakness = lower strength, lower weakness = higher strength
          const weaknessScore = weakPoint.metrics.current;
          const strengthScore = 100 - weaknessScore;
          const scoreColor = getScoreColor(strengthScore);
          const scoreLabel = getScoreLabel(strengthScore);
          
          return (
          <View
            key={index}
            style={styles.muscleCard}
          >
              <View style={styles.muscleCardHeader}>
                <View style={styles.muscleInfo}>
                  <Text style={styles.muscleGroupName}>
                    {weakPoint.muscleGroup}
                  </Text>
                  {strengthScore > 80 ? (
                    <Text style={styles.issueTitle}>
                      Performing excellently
                    </Text>
                  ) : strengthScore >= 60 ? (
                    <Text style={styles.issueTitle}>
                      Performing well
                    </Text>
                  ) : (
                  <Text style={styles.issueTitle}>
                    {formatIssueTitle(weakPoint.issue)}
                  </Text>
                  )}
                </View>
                
                <View style={styles.scoreContainer}>
                  <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
                    <Text style={[styles.scoreValue, { color: scoreColor }]}>
                      {strengthScore}
                    </Text>
                    <Text style={[styles.scoreMax, { color: scoreColor + '80' }]}>
                      /100
                    </Text>
                  </View>
                  <Text style={[styles.scoreLabel, { color: scoreColor }]}>
                    {scoreLabel}
                  </Text>
                </View>
              </View>
              
              {/* Only show details for muscle groups with issues (strength < 60) */}
              {strengthScore < 60 && (
                <View style={styles.detailsContainer}>
                  {weakPoint.affectedExercises.length > 0 && (
                    <Text style={styles.affectedExercises}>
                      {weakPoint.affectedExercises.length} exercise{weakPoint.affectedExercises.length !== 1 ? 's' : ''}
                </Text>
                  )}
            <Text style={styles.recommendation}>
              {weakPoint.recommendation}
                  </Text>
                </View>
              )}
          </View>
          );
        })}
      </ScrollView>

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
    marginBottom: 20,
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
  scrollContainer: {
    maxHeight: 400,
    marginTop: 8,
  },
  muscleCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  muscleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  muscleInfo: {
    flex: 1,
    marginRight: 8,
  },
  muscleGroupName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  issueTitle: {
    fontSize: 11,
    color: colors.muted,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailsContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.card,
  },
  affectedExercises: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  recommendation: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
    fontStyle: 'italic',
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
