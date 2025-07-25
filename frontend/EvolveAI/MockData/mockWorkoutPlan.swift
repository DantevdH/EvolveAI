//
//  mockWorkoutPlan.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 14/07/2025.
//

import Foundation

let todayString = ISO8601DateFormatter().string(from: Date())

let mockWorkoutPlan = WorkoutPlan(
    id: 1,
    title: "Foundational Strength Program",
    summary: "A 2-week plan to build a solid strength base and improve technique.",
    totalWeeks: 2,
    createdAt: todayString,
    updatedAt: "2025-01-01T12:00:00Z",
    weekly_schedules: [
        // --- WEEK 1 ---
        WeeklySchedule(
            id: 101,
            week_number: 1,
            daily_workouts: [
                // Day 1: Monday (Workout)
                DailyWorkout(
                    id: 201, 
                    day_of_week: "Monday", 
                    exercises: [
                        WorkoutExercise(
                            id: 301, 
                            exercise: Exercise(
                                id: 401, 
                                name: "Barbell Squats",
                                description: "A compound exercise targeting quadriceps, glutes, and core stability.",
                                video_url: "https://example.com/videos/barbell-squats"
                            ), 
                            sets: 4, 
                            reps: "8-10",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 302, 
                            exercise: Exercise(
                                id: 402, 
                                name: "Dumbbell Bench Press",
                                description: "Upper body exercise targeting chest, shoulders, and triceps.",
                                video_url: "https://example.com/videos/dumbbell-bench-press"
                            ), 
                            sets: 3, 
                            reps: "10-12",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 303, 
                            exercise: Exercise(
                                id: 403, 
                                name: "Lat Pulldowns",
                                description: "Back exercise targeting latissimus dorsi and biceps.",
                                video_url: "https://example.com/videos/lat-pulldowns"
                            ), 
                            sets: 3, 
                            reps: "10-12",
                            isCompleted: false,
                            progressId: nil
                        )
                    ],
                    isCompleted: false,
                    weekNumber: 1
                ),
                // Day 2: Tuesday (Rest)
                DailyWorkout(
                    id: 202, 
                    day_of_week: "Tuesday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 1
                ),
                // Day 3: Wednesday (Workout)
                DailyWorkout(
                    id: 203, 
                    day_of_week: "Wednesday", 
                    exercises: [
                        WorkoutExercise(
                            id: 304, 
                            exercise: Exercise(
                                id: 404, 
                                name: "Deadlifts",
                                description: "Full body compound movement targeting posterior chain.",
                                video_url: "https://example.com/videos/deadlifts"
                            ), 
                            sets: 3, 
                            reps: "5-8",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 305, 
                            exercise: Exercise(
                                id: 405, 
                                name: "Overhead Press",
                                description: "Shoulder and core strength exercise.",
                                video_url: "https://example.com/videos/overhead-press"
                            ), 
                            sets: 4, 
                            reps: "8-10",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 306, 
                            exercise: Exercise(
                                id: 406, 
                                name: "Plank",
                                description: "Core stability and endurance exercise.",
                                video_url: "https://example.com/videos/plank"
                            ), 
                            sets: 3, 
                            reps: "45 seconds",
                            isCompleted: false,
                            progressId: nil
                        )
                    ],
                    isCompleted: false,
                    weekNumber: 1
                ),
                // Day 4: Thursday (Rest)
                DailyWorkout(
                    id: 204, 
                    day_of_week: "Thursday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 1
                ),
                // Day 5: Friday (Workout)
                DailyWorkout(
                    id: 205, 
                    day_of_week: "Friday", 
                    exercises: [
                        WorkoutExercise(
                            id: 307, 
                            exercise: Exercise(
                                id: 407, 
                                name: "Pull Ups (Assisted)",
                                description: "Upper body pulling exercise for back and biceps.",
                                video_url: "https://example.com/videos/assisted-pullups"
                            ), 
                            sets: 4, 
                            reps: "As many as possible",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 308, 
                            exercise: Exercise(
                                id: 408, 
                                name: "Leg Press",
                                description: "Lower body exercise targeting quadriceps and glutes.",
                                video_url: "https://example.com/videos/leg-press"
                            ), 
                            sets: 3, 
                            reps: "12-15",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 309, 
                            exercise: Exercise(
                                id: 409, 
                                name: "Bicep Curls",
                                description: "Isolation exercise for bicep development.",
                                video_url: "https://example.com/videos/bicep-curls"
                            ), 
                            sets: 3, 
                            reps: "12-15",
                            isCompleted: false,
                            progressId: nil
                        )
                    ],
                    isCompleted: false,
                    weekNumber: 1
                ),
                // Day 6 & 7: Weekend (Rest)
                DailyWorkout(
                    id: 206, 
                    day_of_week: "Saturday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 1
                ),
                DailyWorkout(
                    id: 207, 
                    day_of_week: "Sunday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 1
                )
            ]
        ),
        // --- WEEK 2 ---
        WeeklySchedule(
            id: 102,
            week_number: 2,
            daily_workouts: [
                // Day 1: Monday (Workout)
                DailyWorkout(
                    id: 208, 
                    day_of_week: "Monday", 
                    exercises: [
                        WorkoutExercise(
                            id: 310, 
                            exercise: Exercise(
                                id: 401, 
                                name: "Barbell Squats",
                                description: "A compound exercise targeting quadriceps, glutes, and core stability.",
                                video_url: "https://example.com/videos/barbell-squats"
                            ), 
                            sets: 4, 
                            reps: "10-12",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 311, 
                            exercise: Exercise(
                                id: 410, 
                                name: "Incline Dumbbell Press",
                                description: "Upper chest and shoulder development exercise.",
                                video_url: "https://example.com/videos/incline-dumbbell-press"
                            ), 
                            sets: 3, 
                            reps: "10-12",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 312, 
                            exercise: Exercise(
                                id: 411, 
                                name: "Seated Cable Rows",
                                description: "Back exercise for middle trapezius and rhomboids.",
                                video_url: "https://example.com/videos/seated-cable-rows"
                            ), 
                            sets: 3, 
                            reps: "12-15",
                            isCompleted: false,
                            progressId: nil
                        )
                    ],
                    isCompleted: false,
                    weekNumber: 2
                ),
                // Day 2: Tuesday (Rest)
                DailyWorkout(
                    id: 209, 
                    day_of_week: "Tuesday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 2
                ),
                // Day 3: Wednesday (Workout)
                DailyWorkout(
                    id: 210, 
                    day_of_week: "Wednesday", 
                    exercises: [
                        WorkoutExercise(
                            id: 313, 
                            exercise: Exercise(
                                id: 412, 
                                name: "Romanian Deadlifts",
                                description: "Hip-hinge movement targeting hamstrings and glutes.",
                                video_url: "https://example.com/videos/romanian-deadlifts"
                            ), 
                            sets: 3, 
                            reps: "10-12",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 314, 
                            exercise: Exercise(
                                id: 413, 
                                name: "Dumbbell Shoulder Press",
                                description: "Shoulder and tricep development exercise.",
                                video_url: "https://example.com/videos/dumbbell-shoulder-press"
                            ), 
                            sets: 4, 
                            reps: "10-12",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 315, 
                            exercise: Exercise(
                                id: 414, 
                                name: "Hanging Leg Raises",
                                description: "Advanced core exercise targeting lower abdominals.",
                                video_url: "https://example.com/videos/hanging-leg-raises"
                            ), 
                            sets: 3, 
                            reps: "15-20",
                            isCompleted: false,
                            progressId: nil
                        )
                    ],
                    isCompleted: false,
                    weekNumber: 2
                ),
                // Day 4: Thursday (Rest)
                DailyWorkout(
                    id: 211, 
                    day_of_week: "Thursday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 2
                ),
                // Day 5: Friday (Workout)
                DailyWorkout(
                    id: 212, 
                    day_of_week: "Friday", 
                    exercises: [
                        WorkoutExercise(
                            id: 316, 
                            exercise: Exercise(
                                id: 415, 
                                name: "Chin Ups",
                                description: "Upper body pulling exercise emphasizing biceps.",
                                video_url: "https://example.com/videos/chin-ups"
                            ), 
                            sets: 4, 
                            reps: "As many as possible",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 317, 
                            exercise: Exercise(
                                id: 416, 
                                name: "Goblet Squats",
                                description: "Front-loaded squat variation for mobility and strength.",
                                video_url: "https://example.com/videos/goblet-squats"
                            ), 
                            sets: 3, 
                            reps: "12-15",
                            isCompleted: false,
                            progressId: nil
                        ),
                        WorkoutExercise(
                            id: 318, 
                            exercise: Exercise(
                                id: 417, 
                                name: "Tricep Pushdowns",
                                description: "Isolation exercise for tricep development.",
                                video_url: "https://example.com/videos/tricep-pushdowns"
                            ), 
                            sets: 3, 
                            reps: "12-15",
                            isCompleted: false,
                            progressId: nil
                        )
                    ],
                    isCompleted: false,
                    weekNumber: 2
                ),
                // Day 6 & 7: Weekend (Rest)
                DailyWorkout(
                    id: 213, 
                    day_of_week: "Saturday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 2
                ),
                DailyWorkout(
                    id: 214, 
                    day_of_week: "Sunday", 
                    exercises: [],
                    isCompleted: false,
                    weekNumber: 2
                )
            ]
        )
    ]
)

// MARK: - Different Progress State Previews

/// Mock data representing week 1 with some progress
let mockWorkoutPlanWeek1WithProgress = WorkoutPlan(
    id: 1,
    title: "Foundational Strength Program - Week 1 Progress",
    summary: "A 2-week plan to build a solid strength base and improve technique.",
    totalWeeks: 2,
    createdAt: todayString,
    updatedAt: "2025-01-01T12:00:00Z",
    weekly_schedules: [
        WeeklySchedule(
            id: 101,
            week_number: 1,
            daily_workouts: [
                // Monday - COMPLETED
                DailyWorkout(
                    id: 201, 
                    day_of_week: "Monday", 
                    exercises: [
                        WorkoutExercise(id: 301, exercise: Exercise(id: 401, name: "Barbell Squats", description: nil, video_url: nil), sets: 4, reps: "8-10", isCompleted: true, progressId: 1001),
                        WorkoutExercise(id: 302, exercise: Exercise(id: 402, name: "Dumbbell Bench Press", description: nil, video_url: nil), sets: 3, reps: "10-12", isCompleted: true, progressId: 1002),
                        WorkoutExercise(id: 303, exercise: Exercise(id: 403, name: "Lat Pulldowns", description: nil, video_url: nil), sets: 3, reps: "10-12", isCompleted: true, progressId: 1003)
                    ],
                    isCompleted: true,
                    weekNumber: 1
                ),
                // Tuesday - REST (completed)
                DailyWorkout(id: 202, day_of_week: "Tuesday", exercises: [], isCompleted: true, weekNumber: 1),
                // Wednesday - PARTIALLY COMPLETED
                DailyWorkout(
                    id: 203, 
                    day_of_week: "Wednesday", 
                    exercises: [
                        WorkoutExercise(id: 304, exercise: Exercise(id: 404, name: "Deadlifts", description: nil, video_url: nil), sets: 3, reps: "5-8", isCompleted: true, progressId: 1004),
                        WorkoutExercise(id: 305, exercise: Exercise(id: 405, name: "Overhead Press", description: nil, video_url: nil), sets: 4, reps: "8-10", isCompleted: false, progressId: 1005),
                        WorkoutExercise(id: 306, exercise: Exercise(id: 406, name: "Plank", description: nil, video_url: nil), sets: 3, reps: "45 seconds", isCompleted: false, progressId: 1006)
                    ],
                    isCompleted: false,
                    weekNumber: 1
                ),
                // Rest of week - NOT STARTED
                DailyWorkout(id: 204, day_of_week: "Thursday", exercises: [], isCompleted: false, weekNumber: 1),
                DailyWorkout(id: 205, day_of_week: "Friday", exercises: [
                    WorkoutExercise(id: 307, exercise: Exercise(id: 407, name: "Pull Ups (Assisted)", description: nil, video_url: nil), sets: 4, reps: "AMRAP", isCompleted: false, progressId: 1007),
                    WorkoutExercise(id: 308, exercise: Exercise(id: 408, name: "Leg Press", description: nil, video_url: nil), sets: 3, reps: "12-15", isCompleted: false, progressId: 1008),
                    WorkoutExercise(id: 309, exercise: Exercise(id: 409, name: "Bicep Curls", description: nil, video_url: nil), sets: 3, reps: "12-15", isCompleted: false, progressId: 1009)
                ], isCompleted: false, weekNumber: 1),
                DailyWorkout(id: 206, day_of_week: "Saturday", exercises: [], isCompleted: false, weekNumber: 1),
                DailyWorkout(id: 207, day_of_week: "Sunday", exercises: [], isCompleted: false, weekNumber: 1)
            ]
        )
    ]
)

/// Mock data representing week 3 scenario
let mockWorkoutPlanWeek3 = WorkoutPlan(
    id: 1,
    title: "Foundational Strength Program",
    summary: "A 4-week plan to build a solid strength base and improve technique.",
    totalWeeks: 4,
    createdAt: todayString,
    updatedAt: "2025-01-15T12:00:00Z",
    weekly_schedules: [
        // Week 1 - COMPLETED
        WeeklySchedule(id: 101, week_number: 1, daily_workouts: [
            DailyWorkout(id: 201, day_of_week: "Monday", exercises: [
                WorkoutExercise(id: 301, exercise: Exercise(id: 401, name: "Barbell Squats", description: nil, video_url: nil), sets: 4, reps: "8-10", isCompleted: true, progressId: 1001)
            ], isCompleted: true, weekNumber: 1),
            DailyWorkout(id: 202, day_of_week: "Tuesday", exercises: [], isCompleted: true, weekNumber: 1),
            DailyWorkout(id: 203, day_of_week: "Wednesday", exercises: [
                WorkoutExercise(id: 304, exercise: Exercise(id: 404, name: "Deadlifts", description: nil, video_url: nil), sets: 3, reps: "5-8", isCompleted: true, progressId: 1004)
            ], isCompleted: true, weekNumber: 1),
            DailyWorkout(id: 204, day_of_week: "Thursday", exercises: [], isCompleted: true, weekNumber: 1),
            DailyWorkout(id: 205, day_of_week: "Friday", exercises: [
                WorkoutExercise(id: 307, exercise: Exercise(id: 407, name: "Pull Ups", description: nil, video_url: nil), sets: 4, reps: "AMRAP", isCompleted: true, progressId: 1007)
            ], isCompleted: true, weekNumber: 1),
            DailyWorkout(id: 206, day_of_week: "Saturday", exercises: [], isCompleted: true, weekNumber: 1),
            DailyWorkout(id: 207, day_of_week: "Sunday", exercises: [], isCompleted: true, weekNumber: 1)
        ]),
        // Week 2 - COMPLETED  
        WeeklySchedule(id: 102, week_number: 2, daily_workouts: [
            DailyWorkout(id: 208, day_of_week: "Monday", exercises: [
                WorkoutExercise(id: 310, exercise: Exercise(id: 401, name: "Barbell Squats", description: nil, video_url: nil), sets: 4, reps: "10-12", isCompleted: true, progressId: 1010)
            ], isCompleted: true, weekNumber: 2),
            DailyWorkout(id: 209, day_of_week: "Tuesday", exercises: [], isCompleted: true, weekNumber: 2),
            DailyWorkout(id: 210, day_of_week: "Wednesday", exercises: [
                WorkoutExercise(id: 313, exercise: Exercise(id: 412, name: "Romanian Deadlifts", description: nil, video_url: nil), sets: 3, reps: "10-12", isCompleted: true, progressId: 1013)
            ], isCompleted: true, weekNumber: 2),
            DailyWorkout(id: 211, day_of_week: "Thursday", exercises: [], isCompleted: true, weekNumber: 2),
            DailyWorkout(id: 212, day_of_week: "Friday", exercises: [
                WorkoutExercise(id: 316, exercise: Exercise(id: 415, name: "Chin Ups", description: nil, video_url: nil), sets: 4, reps: "AMRAP", isCompleted: true, progressId: 1016)
            ], isCompleted: true, weekNumber: 2),
            DailyWorkout(id: 213, day_of_week: "Saturday", exercises: [], isCompleted: true, weekNumber: 2),
            DailyWorkout(id: 214, day_of_week: "Sunday", exercises: [], isCompleted: true, weekNumber: 2)
        ]),
        // Week 3 - CURRENT WEEK (In Progress)
        WeeklySchedule(id: 103, week_number: 3, daily_workouts: [
            DailyWorkout(id: 301, day_of_week: "Monday", exercises: [
                WorkoutExercise(id: 401, exercise: Exercise(id: 501, name: "Front Squats", description: "Advanced squat variation for core strength", video_url: nil), sets: 4, reps: "8-10", isCompleted: true, progressId: 1020),
                WorkoutExercise(id: 402, exercise: Exercise(id: 502, name: "Incline Bench Press", description: "Upper chest development", video_url: nil), sets: 3, reps: "8-10", isCompleted: true, progressId: 1021),
                WorkoutExercise(id: 403, exercise: Exercise(id: 503, name: "Bent Over Rows", description: "Back strength and posture", video_url: nil), sets: 3, reps: "10-12", isCompleted: false, progressId: 1022)
            ], isCompleted: false, weekNumber: 3),
            DailyWorkout(id: 302, day_of_week: "Tuesday", exercises: [], isCompleted: true, weekNumber: 3),
            DailyWorkout(id: 303, day_of_week: "Wednesday", exercises: [
                WorkoutExercise(id: 404, exercise: Exercise(id: 504, name: "Sumo Deadlifts", description: "Wide stance deadlift variation", video_url: nil), sets: 3, reps: "6-8", isCompleted: false, progressId: 1023),
                WorkoutExercise(id: 405, exercise: Exercise(id: 505, name: "Military Press", description: "Strict overhead pressing", video_url: nil), sets: 4, reps: "6-8", isCompleted: false, progressId: 1024),
                WorkoutExercise(id: 406, exercise: Exercise(id: 506, name: "Russian Twists", description: "Core rotational strength", video_url: nil), sets: 3, reps: "20 each side", isCompleted: false, progressId: 1025)
            ], isCompleted: false, weekNumber: 3),
            DailyWorkout(id: 304, day_of_week: "Thursday", exercises: [], isCompleted: false, weekNumber: 3),
            DailyWorkout(id: 305, day_of_week: "Friday", exercises: [
                WorkoutExercise(id: 407, exercise: Exercise(id: 507, name: "Weighted Pull Ups", description: "Advanced pulling exercise", video_url: nil), sets: 4, reps: "5-8", isCompleted: false, progressId: 1026),
                WorkoutExercise(id: 408, exercise: Exercise(id: 508, name: "Bulgarian Split Squats", description: "Single leg strength", video_url: nil), sets: 3, reps: "10 each leg", isCompleted: false, progressId: 1027),
                WorkoutExercise(id: 409, exercise: Exercise(id: 509, name: "Diamond Push Ups", description: "Tricep-focused push ups", video_url: nil), sets: 3, reps: "8-12", isCompleted: false, progressId: 1028)
            ], isCompleted: false, weekNumber: 3),
            DailyWorkout(id: 306, day_of_week: "Saturday", exercises: [], isCompleted: false, weekNumber: 3),
            DailyWorkout(id: 307, day_of_week: "Sunday", exercises: [], isCompleted: false, weekNumber: 3)
        ]),
        // Week 4 - FUTURE WEEK
        WeeklySchedule(id: 104, week_number: 4, daily_workouts: [
            DailyWorkout(id: 401, day_of_week: "Monday", exercises: [
                WorkoutExercise(id: 501, exercise: Exercise(id: 601, name: "Back Squats", description: nil, video_url: nil), sets: 5, reps: "5-6", isCompleted: false, progressId: nil)
            ], isCompleted: false, weekNumber: 4),
            DailyWorkout(id: 402, day_of_week: "Tuesday", exercises: [], isCompleted: false, weekNumber: 4),
            DailyWorkout(id: 403, day_of_week: "Wednesday", exercises: [
                WorkoutExercise(id: 502, exercise: Exercise(id: 602, name: "Conventional Deadlifts", description: nil, video_url: nil), sets: 5, reps: "3-5", isCompleted: false, progressId: nil)
            ], isCompleted: false, weekNumber: 4),
            DailyWorkout(id: 404, day_of_week: "Thursday", exercises: [], isCompleted: false, weekNumber: 4),
            DailyWorkout(id: 405, day_of_week: "Friday", exercises: [
                WorkoutExercise(id: 503, exercise: Exercise(id: 603, name: "Muscle Ups", description: nil, video_url: nil), sets: 3, reps: "3-5", isCompleted: false, progressId: nil)
            ], isCompleted: false, weekNumber: 4),
            DailyWorkout(id: 406, day_of_week: "Saturday", exercises: [], isCompleted: false, weekNumber: 4),
            DailyWorkout(id: 407, day_of_week: "Sunday", exercises: [], isCompleted: false, weekNumber: 4)
        ])
    ]
)

let oneWeekAgoString = ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .weekOfYear, value: -1, to: Date())!)
let fiveWeeksAgoString = ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .weekOfYear, value: -5, to: Date())!)

let mockWorkoutPlanWeek3_OneWeekAgo = WorkoutPlan(
    id: 2,
    title: "Foundational Strength Program (Started 1 Week Ago)",
    summary: "A 4-week plan to build a solid strength base and improve technique.",
    totalWeeks: 4,
    createdAt: oneWeekAgoString,
    updatedAt: todayString,
    weekly_schedules: mockWorkoutPlanWeek3.weekly_schedules
)

let mockWorkoutPlanWeek3_FiveWeeksAgo = WorkoutPlan(
    id: 3,
    title: "Foundational Strength Program (Started 5 Weeks Ago)",
    summary: "A 4-week plan to build a solid strength base and improve technique.",
    totalWeeks: 4,
    createdAt: fiveWeeksAgoString,
    updatedAt: todayString,
    weekly_schedules: mockWorkoutPlanWeek3.weekly_schedules
)