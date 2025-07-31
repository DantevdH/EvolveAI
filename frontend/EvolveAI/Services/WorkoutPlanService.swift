import Foundation
import Supabase

// MARK: - Workout Plan Generation Service
class WorkoutPlanService: ObservableObject {
    
    // MARK: - Generated Workout Plan Response
    struct GeneratedWorkoutPlan {
        let title: String
        let summary: String
        let weeklySchedules: [GeneratedWeeklySchedule]
    }

    // MARK: - Database Models for Saving
    struct GeneratedWeeklySchedule {
        let weekNumber: Int
        let dailyWorkouts: [GeneratedDailyWorkout]
    }

    struct GeneratedDailyWorkout {
        let dayOfWeek: String
        let isRestDay: Bool
        let exercises: [GeneratedWorkoutExercise]
    }

    struct GeneratedWorkoutExercise {
        let name: String
        let sets: Int
        let reps: String
    }
    
    // MARK: - Public Methods
    
    /// Generates a workout plan using FastAPI and saves it to Supabase
    func generateAndSaveWorkoutPlan(for profile: UserProfile) async throws -> WorkoutPlan {
        // Step 1: Generate workout plan using FastAPI
        let generatedPlan = try await generateWorkoutPlanFromAPI(profile: profile)
        
        // Step 2: Save the complete workout plan structure to Supabase
        let savedWorkoutPlan = try await saveWorkoutPlanToDatabase(generatedPlan: generatedPlan, userProfile: profile)
        
        return savedWorkoutPlan
    }
    
    // MARK: - Private Methods
    
    /// Generates a workout plan using the FastAPI backend
    private func generateWorkoutPlanFromAPI(profile: UserProfile) async throws -> GeneratedWorkoutPlan {
        guard let url = URL(string: "http://localhost:8000/api/workoutplan/generate/") else {
            throw NSError(domain: "WorkoutPlanService", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Prepare the request body
        let requestBody: [String: Any] = [
            "primaryGoal": profile.primaryGoal,
            "primaryGoalDescription": profile.primaryGoalDescription,
            "experienceLevel": profile.experienceLevel,
            "daysPerWeek": profile.daysPerWeek,
            "minutesPerSession": profile.minutesPerSession,
            "equipment": profile.equipment,
            "age": profile.age,
            "weight": profile.weight,
            "weightUnit": profile.weightUnit,
            "height": profile.height,
            "heightUnit": profile.heightUnit,
            "gender": profile.gender,
            "hasLimitations": profile.hasLimitations,
            "limitationsDescription": profile.limitationsDescription,
            "trainingSchedule": profile.trainingSchedule,
            "finalChatNotes": profile.finalChatNotes
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
        }
        
        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw NSError(domain: "WorkoutPlanService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorMessage])
        }
        
        // Parse the complete workout plan response
        let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let workoutPlanData = responseData?["workout_plan"] as? [String: Any],
              let title = workoutPlanData["title"] as? String,
              let summary = workoutPlanData["summary"] as? String,
              let weeklySchedulesData = workoutPlanData["weekly_schedules"] as? [[String: Any]] else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid response format"])
        }
        
        // Parse weekly schedules using generated models
        var weeklySchedules: [GeneratedWeeklySchedule] = []
        for weeklyScheduleData in weeklySchedulesData {
            guard let weekNumber = weeklyScheduleData["week_number"] as? Int,
                  let dailyWorkoutsData = weeklyScheduleData["daily_workouts"] as? [[String: Any]] else {
                continue
            }
            
            // Parse daily workouts
            var dailyWorkouts: [GeneratedDailyWorkout] = []
            for dailyWorkoutData in dailyWorkoutsData {
                guard let dayOfWeek = dailyWorkoutData["day_of_week"] as? String,
                      let isRestDay = dailyWorkoutData["is_rest_day"] as? Bool else {
                    continue
                }
                
                var exercises: [GeneratedWorkoutExercise] = []
                if !isRestDay, let exercisesData = dailyWorkoutData["exercises"] as? [[String: Any]] {
                    for exerciseData in exercisesData {
                        guard let name = exerciseData["name"] as? String,
                              let sets = exerciseData["sets"] as? Int,
                              let reps = exerciseData["reps"] as? String else {
                            continue
                        }
                        
                        exercises.append(GeneratedWorkoutExercise(
                            name: name,
                            sets: sets,
                            reps: reps
                        ))
                    }
                }
                
                dailyWorkouts.append(GeneratedDailyWorkout(
                    dayOfWeek: dayOfWeek,
                    isRestDay: isRestDay,
                    exercises: exercises
                ))
            }
            
            weeklySchedules.append(GeneratedWeeklySchedule(
                weekNumber: weekNumber,
                dailyWorkouts: dailyWorkouts
            ))
        }
        
        return GeneratedWorkoutPlan(
            title: title,
            summary: summary,
            weeklySchedules: weeklySchedules
        )
    }
    
    /// Saves the generated workout plan to Supabase database
    private func saveWorkoutPlanToDatabase(generatedPlan: GeneratedWorkoutPlan, userProfile: UserProfile) async throws -> WorkoutPlan {
        // Get current session to get user ID
        let session = try await supabase.auth.session
        let userId = session.user.id
        
        // Get the user's profile to get the profile ID
        let userProfiles: [UserProfile] = try await supabase.database
            .from("user_profiles")
            .select()
            .eq("user_id", value: userId)
            .execute()
            .value
        
        guard let userProfile = userProfiles.first else {
            throw NSError(domain: "WorkoutPlanService", code: 404, userInfo: [NSLocalizedDescriptionKey: "User profile not found"])
        }
        
        // Step 1: Create the main workout plan
        let newWorkoutPlan = WorkoutPlan(
            id: 0, // Will be set by database
            userProfileId: userProfile.id!,
            title: generatedPlan.title,
            summary: generatedPlan.summary,
            createdAt: ISO8601DateFormatter().string(from: Date()),
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
        
        let workoutPlanResponse: [WorkoutPlan] = try await supabase.database
            .from("workout_plans")
            .insert(newWorkoutPlan)
            .execute()
            .value
        
        guard let createdWorkoutPlan = workoutPlanResponse.first else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create workout plan"])
        }
        
        // Step 2: Save weekly schedules and daily workouts
        for weeklySchedule in generatedPlan.weeklySchedules {
            // Create weekly schedule
            let newWeeklySchedule = WeeklySchedule(
                id: 0, // Will be set by database
                workoutPlanId: createdWorkoutPlan.id,
                weekNumber: weeklySchedule.weekNumber,
                createdAt: ISO8601DateFormatter().string(from: Date()),
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            
            let weeklyScheduleResponse: [WeeklySchedule] = try await supabase.database
                .from("weekly_schedules")
                .insert(newWeeklySchedule)
                .execute()
                .value
            
            guard let createdWeeklySchedule = weeklyScheduleResponse.first else {
                throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create weekly schedule"])
            }
            
            // Create daily workouts for this week
            for dailyWorkout in weeklySchedule.dailyWorkouts {
                let newDailyWorkout = DailyWorkout(
                    id: 0, // Will be set by database
                    weeklyScheduleId: createdWeeklySchedule.id,
                    dayOfWeek: dailyWorkout.dayOfWeek,
                    createdAt: ISO8601DateFormatter().string(from: Date()),
                    updatedAt: ISO8601DateFormatter().string(from: Date())
                )
                
                let dailyWorkoutResponse: [DailyWorkout] = try await supabase.database
                    .from("daily_workouts")
                    .insert(newDailyWorkout)
                    .execute()
                    .value
                
                guard let createdDailyWorkout = dailyWorkoutResponse.first else {
                    throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create daily workout"])
                }
                
                // Create workout exercises for this day (if not a rest day)
                if !dailyWorkout.isRestDay {
                    for exercise in dailyWorkout.exercises {
                        // First, check if exercise exists in exercises table, if not create it
                        let exerciseResponse: [Exercise] = try await supabase.database
                            .from("exercises")
                            .select()
                            .eq("name", value: exercise.name)
                            .execute()
                            .value
                        
                        let exerciseId: Int
                        if let existingExercise = exerciseResponse.first {
                            exerciseId = existingExercise.id
                        } else {
                            // Create new exercise
                            let newExercise = Exercise(
                                id: 0, // Will be set by database
                                name: exercise.name,
                                description: "Generated exercise",
                                video_url: nil
                            )
                            
                            let createdExerciseResponse: [Exercise] = try await supabase.database
                                .from("exercises")
                                .insert(newExercise)
                                .execute()
                                .value
                            
                            guard let createdExercise = createdExerciseResponse.first else {
                                throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create exercise"])
                            }
                            
                            exerciseId = createdExercise.id
                        }
                        
                        // Create workout exercise
                        let newWorkoutExercise = WorkoutExercise(
                            id: 0, // Will be set by database
                            dailyWorkoutId: createdDailyWorkout.id,
                            exerciseId: exerciseId,
                            sets: exercise.sets,
                            reps: exercise.reps,
                            weight: nil,
                            createdAt: ISO8601DateFormatter().string(from: Date()),
                            updatedAt: ISO8601DateFormatter().string(from: Date())
                        )
                        
                        try await supabase.database
                            .from("workout_exercises")
                            .insert(newWorkoutExercise)
                            .execute()
                    }
                }
            }
        }
        
        return createdWorkoutPlan
    }
} 