//
//  mockWorkoutPlan.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 14/07/2025.
//

let mockWorkoutPlan = WorkoutPlan(
    id: 1,
    title: "Foundational Strength Program",
    summary: "A 2-week plan to build a solid strength base and improve technique.",
    user_profile: mockUserProfile,
    weekly_schedules: [
        // --- WEEK 1 ---
        WeeklySchedule(
            // FIXED: Added ID
            id: 101,
            week_number: 1,
            daily_workouts: [
                // Day 1: Monday (Workout)
                // FIXED: Changed 'workout_exercises' to 'exercises' and added IDs throughout
                DailyWorkout(id: 201, day_of_week: "Monday", exercises: [
                    WorkoutExercise(id: 301, exercise: Exercise(id: 401, name: "Barbell Squats"), sets: 4, reps: "8-10"),
                    WorkoutExercise(id: 302, exercise: Exercise(id: 402, name: "Dumbbell Bench Press"), sets: 3, reps: "10-12"),
                    WorkoutExercise(id: 303, exercise: Exercise(id: 403, name: "Lat Pulldowns"), sets: 3, reps: "10-12")
                ]),
                // Day 2: Tuesday (Rest)
                DailyWorkout(id: 202, day_of_week: "Tuesday", exercises: []),
                // Day 3: Wednesday (Workout)
                DailyWorkout(id: 203, day_of_week: "Wednesday", exercises: [
                    WorkoutExercise(id: 304, exercise: Exercise(id: 404, name: "Deadlifts"), sets: 3, reps: "5-8"),
                    WorkoutExercise(id: 305, exercise: Exercise(id: 405, name: "Overhead Press"), sets: 4, reps: "8-10"),
                    WorkoutExercise(id: 306, exercise: Exercise(id: 406, name: "Plank"), sets: 3, reps: "45 seconds")
                ]),
                // Day 4: Thursday (Rest)
                DailyWorkout(id: 204, day_of_week: "Thursday", exercises: []),
                // Day 5: Friday (Workout)
                DailyWorkout(id: 205, day_of_week: "Friday", exercises: [
                    WorkoutExercise(id: 307, exercise: Exercise(id: 407, name: "Pull Ups (Assisted)"), sets: 4, reps: "As many as possible"),
                    WorkoutExercise(id: 308, exercise: Exercise(id: 408, name: "Leg Press"), sets: 3, reps: "12-15"),
                    WorkoutExercise(id: 309, exercise: Exercise(id: 409, name: "Bicep Curls"), sets: 3, reps: "12-15")
                ]),
                // Day 6 & 7: Weekend (Rest)
                DailyWorkout(id: 206, day_of_week: "Saturday", exercises: []),
                DailyWorkout(id: 207, day_of_week: "Sunday", exercises: [])
            ]
        ),
        // --- WEEK 2 ---
        WeeklySchedule(
            id: 102,
            week_number: 2,
            daily_workouts: [
                // Day 1: Monday (Workout)
                DailyWorkout(id: 208, day_of_week: "Monday", exercises: [
                    WorkoutExercise(id: 310, exercise: Exercise(id: 401, name: "Barbell Squats"), sets: 4, reps: "10-12"),
                    WorkoutExercise(id: 311, exercise: Exercise(id: 410, name: "Incline Dumbbell Press"), sets: 3, reps: "10-12"),
                    WorkoutExercise(id: 312, exercise: Exercise(id: 411, name: "Seated Cable Rows"), sets: 3, reps: "12-15")
                ]),
                // Day 2: Tuesday (Rest)
                DailyWorkout(id: 209, day_of_week: "Tuesday", exercises: []),
                // Day 3: Wednesday (Workout)
                DailyWorkout(id: 210, day_of_week: "Wednesday", exercises: [
                    WorkoutExercise(id: 313, exercise: Exercise(id: 412, name: "Romanian Deadlifts"), sets: 3, reps: "10-12"),
                    WorkoutExercise(id: 314, exercise: Exercise(id: 413, name: "Dumbbell Shoulder Press"), sets: 4, reps: "10-12"),
                    WorkoutExercise(id: 315, exercise: Exercise(id: 414, name: "Hanging Leg Raises"), sets: 3, reps: "15-20")
                ]),
                // Day 4: Thursday (Rest)
                DailyWorkout(id: 211, day_of_week: "Thursday", exercises: []),
                // Day 5: Friday (Workout)
                DailyWorkout(id: 212, day_of_week: "Friday", exercises: [
                    WorkoutExercise(id: 316, exercise: Exercise(id: 415, name: "Chin Ups"), sets: 4, reps: "As many as possible"),
                    WorkoutExercise(id: 317, exercise: Exercise(id: 416, name: "Goblet Squats"), sets: 3, reps: "12-15"),
                    WorkoutExercise(id: 318, exercise: Exercise(id: 417, name: "Tricep Pushdowns"), sets: 3, reps: "12-15")
                ]),
                // Day 6 & 7: Weekend (Rest)
                DailyWorkout(id: 213, day_of_week: "Saturday", exercises: []),
                DailyWorkout(id: 214, day_of_week: "Sunday", exercises: [])
            ]
        )
    ]
)