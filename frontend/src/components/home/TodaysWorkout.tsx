/**
 * Today's Workout Component - Shows today's workout or rest day
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface Exercise {
  id: string;
  name: string;
  completed: boolean;
}

interface TodaysWorkoutProps {
  workout?: {
    id: string | number;
    name: string;
    isRestDay?: boolean;
    exercises: Exercise[];
  } | null;
  onStartWorkout?: () => void;
}

export const TodaysWorkout: React.FC<TodaysWorkoutProps> = ({
  workout,
  onStartWorkout,
}) => {
  if (!workout || workout.isRestDay) {
    return <RestDayCard />;
  }

  const totalExercises = workout.exercises.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Today's Workout</Text>
          <Text style={styles.exerciseCount}>
            {totalExercises} exercises
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.playButton} onPress={onStartWorkout}>
            <Ionicons name="play" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.exercisesScroll}
      >
        <View style={styles.exercisesContainer}>
          {workout.exercises.slice(0, 5).map((exercise) => (
            <ExercisePreview
              key={exercise.id}
              name={exercise.name}
              completed={exercise.completed}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const RestDayCard: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.restDayContent}>
        <Ionicons name="moon" size={48} color={colors.purple + '60'} />
        <Text style={styles.restDayTitle}>Rest Day</Text>
         <Text style={[styles.restDaySubtitle, { color: colors.purple + '60', fontStyle: 'italic' }]}>
           Recharge and get ready for your next workout!
         </Text>

      </View>
    </View>
  );
};

interface ExercisePreviewProps {
  name: string;
  completed: boolean;
}

const ExercisePreview: React.FC<ExercisePreviewProps> = ({ name, completed }) => {
  return (
    <View style={styles.exercisePreview}>
      <Ionicons
        name="fitness"
        size={24}
        color={completed ? colors.primary : colors.muted}
      />
      <Text style={styles.exerciseName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  exercisesScroll: {
    marginTop: 8,
  },
  exercisesContainer: {
    flexDirection: 'row',
    gap: 14,
  },
  exercisePreview: {
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  restDayContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  restDayTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.purple + '60',
    marginTop: 12,
    marginBottom: 8,
  },
  restDaySubtitle: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
});
