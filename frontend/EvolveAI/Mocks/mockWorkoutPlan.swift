//
//  mockWorkoutPlan.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 14/07/2025.
//

import Foundation

let today = Date()

// MARK: - Mock Workout Plan (matches Supabase schema)
let mockWorkoutPlan = WorkoutPlan(
    id: 1,
    userProfileId: 1,
    title: "Foundational Strength Program",
    summary: "A 2-week plan to build a solid strength base and improve technique.",
    createdAt: today,
    updatedAt: today
)

// MARK: - Mock Weekly Schedules
let mockWeeklySchedules = [
    WeeklySchedule(
        id: 1,
        workoutPlanId: 1,
        weekNumber: 1,
        createdAt: today,
        updatedAt: today
    ),
    WeeklySchedule(
        id: 2,
        workoutPlanId: 1,
        weekNumber: 2,
        createdAt: today,
        updatedAt: today
    )
]

// MARK: - Mock Daily Workouts
let mockDailyWorkouts = [
    // Week 1
    DailyWorkout(
        id: 1,
        weeklyScheduleId: 1,
        dayOfWeek: "Monday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 2,
        weeklyScheduleId: 1,
        dayOfWeek: "Tuesday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 3,
        weeklyScheduleId: 1,
        dayOfWeek: "Wednesday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 4,
        weeklyScheduleId: 1,
        dayOfWeek: "Thursday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 5,
        weeklyScheduleId: 1,
        dayOfWeek: "Friday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 6,
        weeklyScheduleId: 1,
        dayOfWeek: "Saturday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 7,
        weeklyScheduleId: 1,
        dayOfWeek: "Sunday",
        createdAt: today,
        updatedAt: today
    ),
    // Week 2
    DailyWorkout(
        id: 8,
        weeklyScheduleId: 2,
        dayOfWeek: "Monday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 9,
        weeklyScheduleId: 2,
        dayOfWeek: "Tuesday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 10,
        weeklyScheduleId: 2,
        dayOfWeek: "Wednesday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 11,
        weeklyScheduleId: 2,
        dayOfWeek: "Thursday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 12,
        weeklyScheduleId: 2,
        dayOfWeek: "Friday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 13,
        weeklyScheduleId: 2,
        dayOfWeek: "Saturday",
        createdAt: today,
        updatedAt: today
    ),
    DailyWorkout(
        id: 14,
        weeklyScheduleId: 2,
        dayOfWeek: "Sunday",
        createdAt: today,
        updatedAt: today
    )
]

// MARK: - Mock Workout Exercises
let mockWorkoutExercises = [
    // Monday Week 1
    WorkoutExercise(
        id: 1,
        dailyWorkoutId: 1,
        exerciseId: 1,
        sets: 4,
        reps: "8-10",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 2,
        dailyWorkoutId: 1,
        exerciseId: 2,
        sets: 3,
        reps: "10-12",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 3,
        dailyWorkoutId: 1,
        exerciseId: 3,
        sets: 3,
        reps: "10-12",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    // Wednesday Week 1
    WorkoutExercise(
        id: 4,
        dailyWorkoutId: 3,
        exerciseId: 4,
        sets: 3,
        reps: "5-8",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 5,
        dailyWorkoutId: 3,
        exerciseId: 5,
        sets: 4,
        reps: "8-10",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 6,
        dailyWorkoutId: 3,
        exerciseId: 6,
        sets: 3,
        reps: "45 seconds",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    // Friday Week 1
    WorkoutExercise(
        id: 7,
        dailyWorkoutId: 5,
        exerciseId: 7,
        sets: 4,
        reps: "As many as possible",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 8,
        dailyWorkoutId: 5,
        exerciseId: 8,
        sets: 3,
        reps: "12-15",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 9,
        dailyWorkoutId: 5,
        exerciseId: 9,
        sets: 3,
        reps: "12-15",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    // Monday Week 2
    WorkoutExercise(
        id: 10,
        dailyWorkoutId: 8,
        exerciseId: 1,
        sets: 4,
        reps: "10-12",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 11,
        dailyWorkoutId: 8,
        exerciseId: 10,
        sets: 3,
        reps: "10-12",
        weight: nil,
        createdAt: today,
        updatedAt: today
    ),
    WorkoutExercise(
        id: 12,
        dailyWorkoutId: 8,
        exerciseId: 11,
        sets: 3,
        reps: "12-15",
        weight: nil,
        createdAt: today,
        updatedAt: today
    )
]

// MARK: - Mock Exercises (referenced by workout exercises)
let mockExercises = [
    Exercise(id: 1, name: "Barbell Squats", description: "A compound exercise targeting quadriceps, glutes, and core stability.", video_url: nil),
    Exercise(id: 2, name: "Dumbbell Bench Press", description: "Upper body exercise targeting chest, shoulders, and triceps.", video_url: nil),
    Exercise(id: 3, name: "Lat Pulldowns", description: "Back exercise targeting latissimus dorsi and biceps.", video_url: nil),
    Exercise(id: 4, name: "Deadlifts", description: "Full body compound movement targeting posterior chain.", video_url: nil),
    Exercise(id: 5, name: "Overhead Press", description: "Shoulder and core strength exercise.", video_url: nil),
    Exercise(id: 6, name: "Plank", description: "Core stability and endurance exercise.", video_url: nil),
    Exercise(id: 7, name: "Pull Ups (Assisted)", description: "Upper body pulling exercise for back and biceps.", video_url: nil),
    Exercise(id: 8, name: "Leg Press", description: "Lower body exercise targeting quadriceps and glutes.", video_url: nil),
    Exercise(id: 9, name: "Bicep Curls", description: "Isolation exercise for bicep development.", video_url: nil),
    Exercise(id: 10, name: "Incline Dumbbell Press", description: "Upper chest and shoulder development exercise.", video_url: nil),
    Exercise(id: 11, name: "Seated Cable Rows", description: "Back exercise for middle trapezius and rhomboids.", video_url: nil)
]

// MARK: - Complete Mock Workout Plan Structure
let mockCompleteWorkoutPlan = CompleteWorkoutPlan(
    workoutPlan: mockWorkoutPlan,
    weeklySchedules: mockWeeklySchedules,
    dailyWorkouts: mockDailyWorkouts,
    workoutExercises: mockWorkoutExercises,
    exercises: mockExercises
)

// MARK: - Legacy Workout Conversion Helper
extension Workout {
    static func fromDailyWorkout(_ dailyWorkout: DailyWorkout, exercises: [Exercise], workoutExercises: [WorkoutExercise]) -> Workout {
        return Workout(from: dailyWorkout, exercises: exercises, workoutExercises: workoutExercises)
    }
}
