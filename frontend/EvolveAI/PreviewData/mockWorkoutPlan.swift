//
//  mockWorkoutPlan.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 14/07/2025.
//

let mockWorkoutPlan = WorkoutPlan(
    title: "4-Week Strength Foundation",
    summary: "A beginner-friendly plan to build a solid strength base, focusing on compound movements and progressive overload.",
    weeklySchedules: [
        WeeklySchedule(
            weekNumber: 1,
            dailyWorkouts: [
                DailyWorkout(
                    dayOfWeek: "Monday",
                    workoutExercises: [
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Barbell Squat",
                                description: "A full-body compound exercise that trains muscles of the thighs, hips, and buttocks.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "8-10"
                        ),
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Bench Press",
                                description: "An upper-body strength training exercise that consists of pressing a weight upwards from a supine position.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "8-10"
                        ),
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Bent Over Row",
                                description: "A weight training exercise that targets a variety of back muscles.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "10-12"
                        )
                    ]
                ),
                DailyWorkout(
                    dayOfWeek: "Wednesday",
                    workoutExercises: [
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Overhead Press",
                                description: "A compound shoulder exercise that can be performed with dumbbells or a barbell.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "8-10"
                        ),
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Deadlift",
                                description: "A weight training exercise in which a loaded barbell or bar is lifted off the ground to the level of the hips, torso perpendicular to the floor, before being placed back on the ground.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "5-8"
                        )
                    ]
                ),
                DailyWorkout(
                    dayOfWeek: "Friday",
                    workoutExercises: [
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Pull-ups",
                                description: "An upper-body strength exercise. The pull-up is a closed-chain movement where the body is suspended by the hands and pulls up.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "To Failure"
                        ),
                        WorkoutExercise(
                            exercise: Exercise(
                                name: "Leg Press",
                                description: "A weight training exercise in which the individual pushes a weight or resistance away from them using their legs.",
                                videoUrl: nil
                            ),
                            sets: 3,
                            reps: "10-15"
                        )
                    ]
                )
            ]
        )
    ]
)
