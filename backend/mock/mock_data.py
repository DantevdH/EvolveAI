# Centralized mock data for scenario-based development/testing

MOCK_USER_PROFILE = {
    'username': 'Dante',
    'id': 1,
    'primaryGoal': 'Increase Strength',
    'primaryGoalDescription': 'Focus on increasing raw power and lifting heavier.',
    'experienceLevel': 'Intermediate',
    'daysPerWeek': 3,
    'minutesPerSession': 60,
    'equipment': 'Full Gym',
    'age': 32,
    'weight': 85.5,
    'weightUnit': 'kg',
    'height': 182,
    'heightUnit': 'cm',
    'gender': 'Male',
    'hasLimitations': False,
    'limitationsDescription': '',
    'trainingSchedule': 'Monday, Wednesday, Friday',
    'finalChatNotes': 'User is motivated and ready to start. Wants to focus on compound lifts.'
}

MOCK_WORKOUT_PLAN = {
    'id': 1,
    'title': 'Strength Builder Pro',
    'summary': 'A comprehensive 4-week strength training program designed for intermediate lifters focusing on compound movements and progressive overload',
    'total_weeks': 4,
    'created_at': '2025-07-27T10:00:00Z',
    'updated_at': '2025-07-27T10:00:00Z',
    'weekly_schedules': [
        # FULL weekly_schedules list from scenario_views.py (copy-paste the original content here)
        {
            'id': 1,
            'week_number': 1,
            'daily_workouts': [
                {
                    'id': 1,
                    'day_of_week': 'Monday',
                    'is_rest_day': False,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': [
                        {
                            'id': 1,
                            'exercise': {'id': 1, 'name': 'Barbell Squat', 'description': 'Compound lower body exercise targeting quads, glutes, and core', 'video_url': None},
                            'sets': 4,
                            'reps': '8-10',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 2,
                            'exercise': {'id': 2, 'name': 'Bench Press', 'description': 'Compound upper body exercise targeting chest, shoulders, and triceps', 'video_url': None},
                            'sets': 3,
                            'reps': '8-12',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 3,
                            'exercise': {'id': 3, 'name': 'Bent Over Row', 'description': 'Compound back exercise targeting lats, rhomboids, and biceps', 'video_url': None},
                            'sets': 3,
                            'reps': '10-12',
                            'is_completed': False,
                            'progress_id': None
                        }
                    ]
                },
                {
                    'id': 2,
                    'day_of_week': 'Tuesday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': []
                },
                {
                    'id': 3,
                    'day_of_week': 'Wednesday',
                    'is_rest_day': False,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': [
                        {
                            'id': 4,
                            'exercise': {'id': 4, 'name': 'Deadlift', 'description': 'Compound posterior chain exercise targeting hamstrings, glutes, and lower back', 'video_url': None},
                            'sets': 4,
                            'reps': '6-8',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 5,
                            'exercise': {'id': 5, 'name': 'Overhead Press', 'description': 'Compound shoulder exercise targeting deltoids and triceps', 'video_url': None},
                            'sets': 3,
                            'reps': '8-10',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 6,
                            'exercise': {'id': 6, 'name': 'Pull-ups', 'description': 'Compound back exercise targeting lats and biceps', 'video_url': None},
                            'sets': 3,
                            'reps': '6-8',
                            'is_completed': False,
                            'progress_id': None
                        }
                    ]
                },
                {
                    'id': 4,
                    'day_of_week': 'Thursday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': []
                },
                {
                    'id': 5,
                    'day_of_week': 'Friday',
                    'is_rest_day': False,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': [
                        {
                            'id': 7,
                            'exercise': {'id': 7, 'name': 'Front Squat', 'description': 'Compound lower body exercise with focus on quads and core stability', 'video_url': None},
                            'sets': 3,
                            'reps': '8-10',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 8,
                            'exercise': {'id': 8, 'name': 'Dumbbell Row', 'description': 'Unilateral back exercise targeting lats and improving balance', 'video_url': None},
                            'sets': 3,
                            'reps': '10-12',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 9,
                            'exercise': {'id': 9, 'name': 'Dips', 'description': 'Compound upper body exercise targeting chest, shoulders, and triceps', 'video_url': None},
                            'sets': 3,
                            'reps': '8-12',
                            'is_completed': False,
                            'progress_id': None
                        }
                    ]
                },
                {
                    'id': 6,
                    'day_of_week': 'Saturday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': []
                },
                {
                    'id': 7,
                    'day_of_week': 'Sunday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 1,
                    'workout_exercises': []
                }
            ]
        },
        {
            'id': 2,
            'week_number': 2,
            'daily_workouts': [
                {
                    'id': 8,
                    'day_of_week': 'Monday',
                    'is_rest_day': False,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': [
                        {
                            'id': 10,
                            'exercise': {'id': 10, 'name': 'Barbell Squat', 'description': 'Compound lower body exercise - increased weight this week', 'video_url': None},
                            'sets': 4,
                            'reps': '6-8',
                            'is_completed': False,
                            'progress_id': None
                        },
                        {
                            'id': 11,
                            'exercise': {'id': 11, 'name': 'Bench Press', 'description': 'Compound upper body exercise - progressive overload', 'video_url': None},
                            'sets': 4,
                            'reps': '6-8',
                            'is_completed': False,
                            'progress_id': None
                        }
                    ]
                },
                {
                    'id': 9,
                    'day_of_week': 'Tuesday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': []
                },
                {
                    'id': 10,
                    'day_of_week': 'Wednesday',
                    'is_rest_day': False,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': [
                        {
                            'id': 12,
                            'exercise': {'id': 12, 'name': 'Deadlift', 'description': 'Compound posterior chain exercise - focus on form', 'video_url': None},
                            'sets': 4,
                            'reps': '5-6',
                            'is_completed': False,
                            'progress_id': None
                        }
                    ]
                },
                {
                    'id': 11,
                    'day_of_week': 'Thursday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': []
                },
                {
                    'id': 12,
                    'day_of_week': 'Friday',
                    'is_rest_day': False,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': [
                        {
                            'id': 13,
                            'exercise': {'id': 13, 'name': 'Military Press', 'description': 'Compound shoulder exercise for strength building', 'video_url': None},
                            'sets': 3,
                            'reps': '6-8',
                            'is_completed': False,
                            'progress_id': None
                        }
                    ]
                },
                {
                    'id': 13,
                    'day_of_week': 'Saturday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': []
                },
                {
                    'id': 14,
                    'day_of_week': 'Sunday',
                    'is_rest_day': True,
                    'is_completed': False,
                    'week_number': 2,
                    'workout_exercises': []
                }
            ]
        }
    ]
} 