/**
 * Recent Activity Component - Shows recent workout history
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface ActivityItem {
  id: string;
  type: 'workout' | 'rest' | 'achievement';
  title: string;
  subtitle: string;
  date: string;
  duration?: string;
  calories?: number;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities = [],
}) => {

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
      </View>

      <View style={styles.activitiesList}>
        {activities.length > 0 ? (
          activities.slice(0, 3).map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness" size={32} color={colors.muted} />
            <Text style={styles.emptyText}>No completed workouts yet</Text>
            <Text style={styles.emptySubtext}>Complete your first workout to see it here!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface ActivityItemProps {
  activity: ActivityItem;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'workout':
        return 'fitness';
      case 'rest':
        return 'moon';
      case 'achievement':
        return 'trophy';
      default:
        return 'ellipse';
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'workout':
        return colors.primary;
      case 'rest':
        return colors.secondary;
      case 'achievement':
        return colors.tertiary;
      default:
        return colors.muted;
    }
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Ionicons 
          name={getActivityIcon() as keyof typeof Ionicons.glyphMap} 
          size={20} 
          color={getActivityColor()} 
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
      </View>
      <Text style={styles.activityDate}>{activity.date}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  activitiesList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  activityDate: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});
