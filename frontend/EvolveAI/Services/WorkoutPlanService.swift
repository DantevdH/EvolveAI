import Foundation
import Supabase

// MARK: - Timeout Helper
func withTimeout<T>(seconds: TimeInterval, operation: @escaping () async throws -> T) async throws -> T {
    return try await withThrowingTaskGroup(of: T.self) { group in
        group.addTask {
            try await operation()
        }
        
        group.addTask {
            try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            throw TimeoutError()
        }
        
        guard let result = try await group.next() else {
            throw TimeoutError()
        }
        
        group.cancelAll()
        return result
    }
}

struct TimeoutError: Error {
    let message = "Operation timed out"
}

// MARK: - Workout Plan Generation Service
class WorkoutPlanService: ObservableObject {
    
    // MARK: - Insert Models
    struct WorkoutPlanInsert: Encodable {
        let user_profile_id: Int
        let title: String
        let summary: String
        let created_at: String
        let updated_at: String
    }
    
    // MARK: - Generated Workout Plan Response
    struct GeneratedWorkoutPlan {
        let title: String
        let summary: String
        let weeklySchedules: [GeneratedWeeklySchedule]
    }

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
        print("--- [DEBUG] Starting generateAndSaveWorkoutPlan ---")
        
        // Step 1: Generate workout plan using FastAPI
        let generatedPlan = try await generateWorkoutPlanFromAPI(profile: profile)
        print("--- [DEBUG] Generated plan from API successfully ---")
        
        // Step 2: Save the complete workout plan structure to Supabase
        let savedWorkoutPlan = try await saveWorkoutPlanToDatabase(generatedPlan: generatedPlan, userProfile: profile)
        print("--- [DEBUG] Saved workout plan to database: \(savedWorkoutPlan) ---")
        
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
        print("--- [DEBUG] Response data from generate workoutplan: \(responseData) ---")
        guard let workoutPlanData = responseData?["workout_plan"] as? [String: Any],
              let title = workoutPlanData["title"] as? String,
              let summary = workoutPlanData["summary"] as? String,
              let weeklySchedulesData = workoutPlanData["weekly_schedules"] as? [[String: Any]] else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid response format"])
        }
        
        // Parse weekly schedules using generated models
        var weeklySchedules: [GeneratedWeeklySchedule] = []
        print("--- [DEBUG] Parsing \(weeklySchedulesData.count) weekly schedules ---")
        
        for weeklyScheduleData in weeklySchedulesData {
            guard let weekNumber = weeklyScheduleData["week_number"] as? Int,
                  let dailyWorkoutsData = weeklyScheduleData["daily_workouts"] as? [[String: Any]] else {
                print("--- [DEBUG] Failed to parse weekly schedule data ---")
                continue
            }
            
            print("--- [DEBUG] Parsing week \(weekNumber) with \(dailyWorkoutsData.count) daily workouts ---")
            
            // Parse daily workouts
            var dailyWorkouts: [GeneratedDailyWorkout] = []
            for dailyWorkoutData in dailyWorkoutsData {
                guard let dayOfWeek = dailyWorkoutData["day_of_week"] as? String else {
                    print("--- [DEBUG] Failed to parse day_of_week ---")
                    continue
                }
                
                // Handle is_rest_day which can be Bool or Int (0/1)
                let isRestDay: Bool
                if let boolValue = dailyWorkoutData["is_rest_day"] as? Bool {
                    isRestDay = boolValue
                } else if let intValue = dailyWorkoutData["is_rest_day"] as? Int {
                    isRestDay = intValue != 0
                } else {
                    // Default to false if we can't parse it
                    isRestDay = false
                }
                
                print("--- [DEBUG] \(dayOfWeek): isRestDay = \(isRestDay) ---")
                
                var exercises: [GeneratedWorkoutExercise] = []
                if !isRestDay, let exercisesData = dailyWorkoutData["exercises"] as? [[String: Any]] {
                    print("--- [DEBUG] Parsing \(exercisesData.count) exercises for \(dayOfWeek) ---")
                    for exerciseData in exercisesData {
                        guard let name = exerciseData["name"] as? String,
                              let sets = exerciseData["sets"] as? Int,
                              let reps = exerciseData["reps"] as? String else {
                            print("--- [DEBUG] Failed to parse exercise data ---")
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
        
        print("--- [DEBUG] Successfully parsed \(weeklySchedules.count) weekly schedules ---")
        
        return GeneratedWorkoutPlan(
            title: title,
            summary: summary,
            weeklySchedules: weeklySchedules
        )
    }
    
    
    
    /// Saves the generated workout plan to Supabase database
    private func saveWorkoutPlanToDatabase(generatedPlan: GeneratedWorkoutPlan, userProfile: UserProfile) async throws -> WorkoutPlan {
        print("--- [DEBUG] Starting saveWorkoutPlanToDatabase ---")
        
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
        
        // Create the workout plan object for insertion
        let newWorkoutPlan = WorkoutPlanInsert(
            user_profile_id: userProfile.id!,
            title: generatedPlan.title,
            summary: generatedPlan.summary,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        print("--- [DEBUG] Creating workout plan: \(newWorkoutPlan.title) ---")
        print("--- [DEBUG] WorkoutPlan object: \(newWorkoutPlan) ---")
        
        let createdWorkoutPlan: WorkoutPlan
        
        do {
            // Use Supabase function to upsert complete workout plan
            let functionResult = try await supabase.database
                .rpc("upsert_complete_workout_plan", params: [
                    "p_user_profile_id": String(userProfile.id!),
                    "p_title": generatedPlan.title,
                    "p_summary": generatedPlan.summary
                ])
                .execute()
            
            // Parse the JSON response from the function
            if let jsonData = functionResult.data as? Data {
                // Print the JSON string to see the format

                if let jsonArray = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]],
                   let jsonObject = jsonArray.first,
                   let id = jsonObject["id"] as? Int,
                   let userProfileId = jsonObject["user_profile_id"] as? Int,
                   let title = jsonObject["title"] as? String,
                   let summary = jsonObject["summary"] as? String,
                   let createdAt = jsonObject["created_at"] as? String,
                   let updatedAt = jsonObject["updated_at"] as? String {
                    
                    let workoutPlan = WorkoutPlan(
                        id: id,
                        userProfileId: userProfileId,
                        title: title,
                        summary: summary,
                        createdAt: createdAt,
                        updatedAt: updatedAt
                    )
                    
                    print("--- [DEBUG] ✅ Successfully created WorkoutPlan with ID: \(id) ---")
                    createdWorkoutPlan = workoutPlan
                } else {
                    print("--- [DEBUG] Failed to parse workout plan from function result ---")
                    throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid function response"])
                }
            } else {
                print("--- [DEBUG] Function result is not Data type ---")
                throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid function response"])
            }
            
        } catch {
            print("--- [DEBUG] ❌ UPSERT ERROR: \(error) ---")
            throw error
        }
        
        // Continue with saving weekly schedules...
        print("--- [DEBUG] Starting to save \(generatedPlan.weeklySchedules.count) weekly schedules ---")
        
        for weeklySchedule in generatedPlan.weeklySchedules {
            try await saveWeeklySchedule(weeklySchedule, workoutPlanId: createdWorkoutPlan.id)
        }
        
        print("--- [DEBUG] ✅ SUCCESS: Complete workout plan saved to database! ---")
        print("--- [DEBUG] 📊 Summary: Workout Plan ID: \(createdWorkoutPlan.id), \(generatedPlan.weeklySchedules.count) weeks, all exercises saved ---")
        return createdWorkoutPlan
    }
    
    
    /// Parse workout plan from function result
    private func parseWorkoutPlanFromFunction(_ data: [String: Any]) throws -> WorkoutPlan {
        guard let id = data["id"] as? Int,
              let userProfileId = data["user_profile_id"] as? Int,
              let title = data["title"] as? String,
              let summary = data["summary"] as? String,
              let createdAt = data["created_at"] as? String,
              let updatedAt = data["updated_at"] as? String else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid function response format"])
        }
        
        return WorkoutPlan(
            id: id,
            userProfileId: userProfileId,
            title: title,
            summary: summary,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
    
    /// Save weekly schedule and its daily workouts
    private func saveWeeklySchedule(_ weeklySchedule: GeneratedWeeklySchedule, workoutPlanId: Int) async throws {
        // Create insert model without id field
        struct WeeklyScheduleInsert: Encodable {
            let workout_plan_id: Int
            let week_number: Int
            let created_at: String
            let updated_at: String
        }
        
        let newWeeklySchedule = WeeklyScheduleInsert(
            workout_plan_id: workoutPlanId,
            week_number: weeklySchedule.weekNumber,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        let weeklyScheduleResponse: [WeeklySchedule] = try await supabase.database
            .from("weekly_schedules")
            .insert(newWeeklySchedule)
            .select()
            .execute()
            .value
        
        guard let createdWeeklySchedule = weeklyScheduleResponse.first else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create weekly schedule"])
        }
        
        // Save daily workouts
        for dailyWorkout in weeklySchedule.dailyWorkouts {
            try await saveDailyWorkout(dailyWorkout, weeklyScheduleId: createdWeeklySchedule.id)
        }
    }
    
    /// Save daily workout and its exercises
    private func saveDailyWorkout(_ dailyWorkout: GeneratedDailyWorkout, weeklyScheduleId: Int) async throws {
        // Create insert model without id field
        struct DailyWorkoutInsert: Encodable {
            let weekly_schedule_id: Int
            let day_of_week: String
            let created_at: String
            let updated_at: String
        }
        
        let newDailyWorkout = DailyWorkoutInsert(
            weekly_schedule_id: weeklyScheduleId,
            day_of_week: dailyWorkout.dayOfWeek,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        let dailyWorkoutResponse: [DailyWorkout] = try await supabase.database
            .from("daily_workouts")
            .insert(newDailyWorkout)
            .select()
            .execute()
            .value
        
        guard let createdDailyWorkout = dailyWorkoutResponse.first else {
            throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create daily workout"])
        }
        
        // Save exercises if not a rest day
        if !dailyWorkout.isRestDay {
            for exercise in dailyWorkout.exercises {
                try await saveWorkoutExercise(exercise, dailyWorkoutId: createdDailyWorkout.id)
            }
        }
    }
    
    /// Save individual workout exercise
    private func saveWorkoutExercise(_ exercise: GeneratedWorkoutExercise, dailyWorkoutId: Int) async throws {
        // First, find or create the exercise
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
            struct ExerciseInsert: Encodable {
                let name: String
                let description: String
                let video_url: String?
            }
            
            let newExercise = ExerciseInsert(
                name: exercise.name,
                description: "Generated exercise",
                video_url: nil
            )
            
            let createdExerciseResponse: [Exercise] = try await supabase.database
                .from("exercises")
                .insert(newExercise)
                .select()
                .execute()
                .value
            
            guard let createdExercise = createdExerciseResponse.first else {
                throw NSError(domain: "WorkoutPlanService", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create exercise"])
            }
            
            exerciseId = createdExercise.id
        }
        
        // Create workout exercise
        struct WorkoutExerciseInsert: Encodable {
            let daily_workout_id: Int
            let exercise_id: Int
            let sets: Int
            let reps: String
            let weight: Double?
            let created_at: String
            let updated_at: String
        }
        
        let newWorkoutExercise = WorkoutExerciseInsert(
            daily_workout_id: dailyWorkoutId,
            exercise_id: exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await supabase.database
            .from("workout_exercises")
            .insert(newWorkoutExercise)
            .execute()
    }
}
