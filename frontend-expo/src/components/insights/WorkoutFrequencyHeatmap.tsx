import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/src/constants/colors';

interface WorkoutFrequencyHeatmapProps {
  data: Array<{
    date: string;
    hasWorkout: boolean;
    intensity: number; // 0-1
  }>;
}

const { width: screenWidth } = Dimensions.get('window');
const cellSize = 12;
const cellSpacing = 2;

export const WorkoutFrequencyHeatmap: React.FC<WorkoutFrequencyHeatmapProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Workout Frequency</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No workout data available</Text>
        </View>
      </View>
    );
  }

  // Generate the last 12 weeks of data
  const generateHeatmapData = () => {
    const weeks = [];
    const today = new Date();
    
    for (let week = 11; week >= 0; week--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (week * 7));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      
      const weekData = [];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        const dateString = date.toISOString().split('T')[0];
        
        const workoutData = data.find(d => d.date === dateString);
        weekData.push({
          date: dateString,
          hasWorkout: workoutData?.hasWorkout || false,
          intensity: workoutData?.intensity || 0
        });
      }
      
      weeks.push({
        weekStart: weekStart.toISOString().split('T')[0],
        days: weekData
      });
    }
    
    return weeks;
  };

  const heatmapData = generateHeatmapData();

  // Get intensity color
  const getIntensityColor = (intensity: number, hasWorkout: boolean) => {
    if (!hasWorkout) return colors.background;
    
    if (intensity >= 0.8) return colors.error; // High intensity
    if (intensity >= 0.6) return colors.warning; // Medium-high intensity
    if (intensity >= 0.4) return colors.primary; // Medium intensity
    if (intensity >= 0.2) return colors.success; // Low-medium intensity
    return colors.muted; // Low intensity
  };

  // Calculate statistics
  const totalWorkouts = data.filter(d => d.hasWorkout).length;
  const totalDays = heatmapData.length * 7;
  const consistency = Math.round((totalWorkouts / totalDays) * 100);
  
  // Find current streak
  const today = new Date().toISOString().split('T')[0];
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].hasWorkout) {
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
      if (data[i].date === today || currentStreak > 0) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
      if (currentStreak > 0) break;
    }
  }

  // Format week labels
  const formatWeekLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Frequency</Text>
        <Text style={styles.period}>Last 12 weeks</Text>
      </View>
      
      <View style={styles.heatmapContainer}>
        {/* Day labels */}
        <View style={styles.dayLabels}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
        </View>
        
        {/* Heatmap grid */}
        <View style={styles.heatmap}>
          {heatmapData.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.days.map((day, dayIndex) => (
                <View
                  key={dayIndex}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: getIntensityColor(day.intensity, day.hasWorkout),
                    }
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
        
        {/* Week labels */}
        <View style={styles.weekLabels}>
          {heatmapData.map((week, index) => (
            <Text key={index} style={styles.weekLabel}>
              {formatWeekLabel(week.weekStart)}
            </Text>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        <View style={styles.legendColors}>
          <View style={[styles.legendCell, { backgroundColor: colors.muted }]} />
          <View style={[styles.legendCell, { backgroundColor: colors.success }]} />
          <View style={[styles.legendCell, { backgroundColor: colors.primary }]} />
          <View style={[styles.legendCell, { backgroundColor: colors.warning }]} />
          <View style={[styles.legendCell, { backgroundColor: colors.error }]} />
        </View>
        <Text style={styles.legendLabel}>More</Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{consistency}%</Text>
          <Text style={styles.statLabel}>Consistency</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{maxStreak}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
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
  period: {
    fontSize: 12,
    color: colors.muted,
  },
  heatmapContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 20,
  },
  dayLabel: {
    width: cellSize,
    textAlign: 'center',
    fontSize: 10,
    color: colors.muted,
    marginHorizontal: cellSpacing / 2,
  },
  heatmap: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  week: {
    flexDirection: 'column',
    marginHorizontal: 2,
  },
  cell: {
    width: cellSize,
    height: cellSize,
    borderRadius: 2,
    marginVertical: cellSpacing / 2,
  },
  weekLabels: {
    flexDirection: 'row',
    paddingLeft: 20,
  },
  weekLabel: {
    width: cellSize + cellSpacing,
    textAlign: 'center',
    fontSize: 10,
    color: colors.muted,
    marginHorizontal: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.muted,
    marginHorizontal: 8,
  },
  legendColors: {
    flexDirection: 'row',
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  emptyState: {
    height: 200,
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
