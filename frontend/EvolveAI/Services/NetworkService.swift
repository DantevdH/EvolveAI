//
//  NetworkService.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation
import Supabase

// MARK: - Custom Network Error
/// A custom error enum to provide more specific details about network failures.
enum NetworkError: LocalizedError {
    case invalidURL
    case requestFailed(Error)
    case invalidResponse
    case serverError(statusCode: Int)
    case decodingError(Error)
    case noAuthToken
    case timeoutError
    case workoutPlanGenerationFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The provided URL was invalid."
        case .requestFailed(let error):
            return "The network request failed: \(error.localizedDescription)"
        case .invalidResponse:
            return "Received an invalid response from the server."
        case .serverError(let statusCode):
            return "The server returned an error with status code: \(statusCode)."
        case .decodingError(let error):
            return "Failed to decode the response: \(error.localizedDescription)"
        case .noAuthToken:
            return "No authentication token available."
        case .timeoutError:
            return "Operation timed out."
        case .workoutPlanGenerationFailed(let message):
            return "Workout plan generation failed: \(message)"
        }
    }
}

// MARK: - Timeout Helper
func withTimeout<T>(seconds: TimeInterval, operation: @escaping () async throws -> T) async throws -> T {
    return try await withThrowingTaskGroup(of: T.self) { group in
        group.addTask {
            try await operation()
        }
        
        group.addTask {
            try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            throw NetworkError.timeoutError
        }
        
        guard let result = try await group.next() else {
            throw NetworkError.timeoutError
        }
        
        group.cancelAll()
        return result
    }
}


// MARK: - Network Service Protocol
/// A protocol for the network service to allow for mocking in tests.
protocol NetworkServiceProtocol {
    func getAuthToken() -> String?
    func getCurrentScenario() -> String
    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void)
    func generateAndSaveWorkoutPlan(for profile: UserProfile) async throws -> WorkoutPlan
    // Exposed helpers for reuse
    func fetchUserProfile(for userId: UUID) async throws -> UserProfile
    func generateWorkoutPlanFromAPI(profile: UserProfile) async throws -> GeneratedWorkoutPlan
    func saveWorkoutPlanToDatabase(generatedPlan: GeneratedWorkoutPlan, userProfile: UserProfile) async throws -> WorkoutPlan
    func fetchWorkoutPlans(userProfileId: Int) async throws -> [WorkoutPlan]
    func fetchWorkoutPlansByUserIdJoin(userId: UUID) async throws -> [WorkoutPlan]
}

// MARK: - Unified Network Service
class NetworkService: NetworkServiceProtocol, ObservableObject {
    
    private let jsonDecoder = JSONDecoder()
    private let jsonEncoder = JSONEncoder()
    private let iso8601Formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    private let iso8601FormatterNoFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
    
    init() {
        print("--- [DEBUG] 🚀 NetworkService initialized ---")
        // Configure JSON decoder for date handling
        jsonDecoder.dateDecodingStrategy = .iso8601
        jsonEncoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - Public API Methods
    
    /// Gets the current Supabase auth token
    func getAuthToken() -> String? {
        // For testing scenarios, check launch arguments first
        let arguments = ProcessInfo.processInfo.arguments
        let scenario = arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "new-user"
        
        switch scenario {
        case "new-user":
            return nil
        case "existing-user", "onboarded-user", "user-with-plan":
            return "mock-token" // Return mock token for these scenarios
        default:
            // In production, check if we have a valid Supabase session
            return UserDefaults.standard.string(forKey: "supabase_access_token")
        }
    }
    
    /// Get the current scenario for debugging/testing purposes
    func getCurrentScenario() -> String {
        let arguments = ProcessInfo.processInfo.arguments
        return arguments.first { arg in
            arg.hasPrefix("--scenario-")
        }?.replacingOccurrences(of: "--scenario-", with: "") ?? "new-user"
    }
    
    // MARK: - Scenario Setup for Backend (Testing Only)
    func setScenarioIfNeeded(completion: @escaping (Bool) -> Void) {
        let scenario = getCurrentScenario()
        guard !scenario.isEmpty else {
            completion(true) // No scenario to set, continue
            return
        }
        
        // Only set scenario if we're in a testing environment
        guard scenario != "new-user" else {
            completion(true) // Production mode, no scenario needed
            return
        }
        
        print("--- [DEBUG] 🧪 Setting up test scenario: \(scenario) ---")
        
        // For now, just simulate success
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            completion(true)
        }
    }
    
    // MARK: - Workout Plan Generation
    
    /// Generates a workout plan using FastAPI and saves it to Supabase
    func generateAndSaveWorkoutPlan(for profile: UserProfile) async throws -> WorkoutPlan {
        print("--- [DEBUG] 🏋️ Starting generateAndSaveWorkoutPlan ---")
        print("--- [DEBUG] 📊 Profile: \(profile.primaryGoal) - \(profile.experienceLevel) level ---")
        
        // Step 1: Generate workout plan using FastAPI
        let generatedPlan = try await generateWorkoutPlanFromAPI(profile: profile)
        print("--- [DEBUG] ✅ Generated plan from API successfully ---")
        
        // Step 2: Save the complete workout plan structure to Supabase
        let savedWorkoutPlan = try await saveWorkoutPlanToDatabase(generatedPlan: generatedPlan, userProfile: profile)
        print("--- [DEBUG] 💾 Saved workout plan to database: \(savedWorkoutPlan.title) ---")
        
        return savedWorkoutPlan
    }
    
    // MARK: - Private Methods
    
    /// Generates a workout plan using the FastAPI backend
    func generateWorkoutPlanFromAPI(profile: UserProfile) async throws -> GeneratedWorkoutPlan {
        print("--- [DEBUG] 🌐 Calling FastAPI workout plan generation endpoint ---")
        
        guard let url = URL(string: "http://localhost:8000/api/workoutplan/generate/") else {
            print("--- [DEBUG] ❌ Invalid API URL ---")
            throw NetworkError.invalidURL
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
            "finalChatNotes": profile.finalChatNotes
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        print("--- [DEBUG] 📤 Request body prepared with \(requestBody.count) parameters ---")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("--- [DEBUG] ❌ Invalid HTTP response ---")
            throw NetworkError.invalidResponse
        }
        
        print("--- [DEBUG] 📥 Received response with status: \(httpResponse.statusCode) ---")
        
        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("--- [DEBUG] ❌ Server error: \(errorMessage) ---")
            throw NetworkError.serverError(statusCode: httpResponse.statusCode)
        }
        
        // Parse the complete workout plan response
        let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        print("--- [DEBUG] 🔍 Parsing response data from generate workoutplan ---")
        
        guard let workoutPlanData = responseData?["workout_plan"] as? [String: Any],
              let title = workoutPlanData["title"] as? String,
              let summary = workoutPlanData["summary"] as? String,
              let weeklySchedulesData = workoutPlanData["weekly_schedules"] as? [[String: Any]] else {
            print("--- [DEBUG] ❌ Invalid response format ---")
            throw NetworkError.invalidResponse
        }
        
        print("--- [DEBUG] 📋 Parsing \(weeklySchedulesData.count) weekly schedules ---")
        
        // Parse weekly schedules using generated models
        var weeklySchedules: [GeneratedWeeklySchedule] = []
        
        for weeklyScheduleData in weeklySchedulesData {
            guard let weekNumber = weeklyScheduleData["week_number"] as? Int,
                  let dailyWorkoutsData = weeklyScheduleData["daily_workouts"] as? [[String: Any]] else {
                print("--- [DEBUG] ⚠️ Failed to parse weekly schedule data ---")
                continue
            }
            
            print("--- [DEBUG] 📅 Parsing week \(weekNumber) with \(dailyWorkoutsData.count) daily workouts ---")
            
            // Parse daily workouts
            var dailyWorkouts: [GeneratedDailyWorkout] = []
            for dailyWorkoutData in dailyWorkoutsData {
                guard let dayOfWeek = dailyWorkoutData["day_of_week"] as? String else {
                    print("--- [DEBUG] ⚠️ Failed to parse day_of_week ---")
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
                
                print("--- [DEBUG] 🗓️ \(dayOfWeek): isRestDay = \(isRestDay) ---")
                
                var exercises: [GeneratedWorkoutExercise] = []
                if !isRestDay, let exercisesData = dailyWorkoutData["exercises"] as? [[String: Any]] {
                    print("--- [DEBUG] 💪 Parsing \(exercisesData.count) exercises for \(dayOfWeek) ---")
                    for exerciseData in exercisesData {
                        guard let name = exerciseData["name"] as? String,
                              let sets = exerciseData["sets"] as? Int,
                              let reps = exerciseData["reps"] as? String else {
                            print("--- [DEBUG] ⚠️ Failed to parse exercise data ---")
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
        
        print("--- [DEBUG] ✅ Successfully parsed \(weeklySchedules.count) weekly schedules ---")
        
        return GeneratedWorkoutPlan(
            title: title,
            summary: summary,
            weeklySchedules: weeklySchedules
        )
    }
    
    /// Saves the generated workout plan to Supabase database
    func saveWorkoutPlanToDatabase(generatedPlan: GeneratedWorkoutPlan, userProfile: UserProfile) async throws -> WorkoutPlan {
        print("--- [DEBUG] 💾 Starting saveWorkoutPlanToDatabase ---")
        
        // Get current session to get user ID
        let session = try await supabase.auth.session
        let userId = session.user.id
        print("--- [DEBUG] 👤 User ID: \(userId) ---")
        
        // Fetch user's profile
        let userProfile = try await fetchUserProfile(for: userId)
        print("--- [DEBUG] 📋 Found user profile with ID: \(userProfile.id!) ---")
        
        // Upsert workout plan via RPC
        let createdWorkoutPlan = try await upsertCompleteWorkoutPlan(
            userProfileId: userProfile.id!,
            title: generatedPlan.title,
            summary: generatedPlan.summary
        )
        print("--- [DEBUG] 💾 Saved workout plan to database: \(createdWorkoutPlan.title) ---")
        
        // Continue with saving weekly schedules
        print("--- [DEBUG] 📊 Starting to save \(generatedPlan.weeklySchedules.count) weekly schedules ---")
        for weeklySchedule in generatedPlan.weeklySchedules {
            try await saveWeeklySchedule(weeklySchedule, workoutPlanId: createdWorkoutPlan.id)
        }
        
        print("--- [DEBUG] 🎉 SUCCESS: Complete workout plan saved to database! ---")
        print("--- [DEBUG] 📊 Summary: Workout Plan ID: \(createdWorkoutPlan.id), \(generatedPlan.weeklySchedules.count) weeks, all exercises saved ---")
        return createdWorkoutPlan
    }
    
    // MARK: - Private Helpers (RPC & Parsing)
    
    func fetchUserProfile(for userId: UUID) async throws -> UserProfile {
        let userProfiles: [UserProfile] = try await supabase.database
            .from("user_profiles")
            .select()
            .eq("user_id", value: userId)
            .execute()
            .value
        
        guard let userProfile = userProfiles.first else {
            print("--- [DEBUG] ❌ User profile not found ---")
            throw NetworkError.workoutPlanGenerationFailed("User profile not found")
        }
        return userProfile
    }
    
    private func upsertCompleteWorkoutPlan(userProfileId: Int, title: String, summary: String) async throws -> WorkoutPlan {
        print("--- [DEBUG] 🔧 Calling upsert_complete_workout_plan function ---")
        let functionResult = try await supabase.database
            .rpc("upsert_complete_workout_plan", params: [
                "p_user_profile_id": String(userProfileId),
                "p_title": title,
                "p_summary": summary,
            ])
            .execute()
        print("--- [DEBUG] 🔍 Function result status: \(functionResult.status) ---")
        
        let jsonData = functionResult.data
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            print("--- [DEBUG] 📄 Raw JSON response: \(jsonString) ---")
        } else {
            print("--- [DEBUG] ❌ Could not convert data to UTF-8 string ---")
        }
        
        return try parseWorkoutPlan(from: jsonData)
    }
    
    private func parseWorkoutPlan(from jsonData: Data) throws -> WorkoutPlan {
        // Accept either an array with one object or a single object
        if let jsonArray = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]],
           let jsonObject = jsonArray.first {
            return try parseWorkoutPlanObject(jsonObject)
        } else if let jsonObject = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            return try parseWorkoutPlanObject(jsonObject)
        } else {
            print("--- [DEBUG] ❌ Failed to parse workout plan from function result ---")
            throw NetworkError.workoutPlanGenerationFailed("Invalid function response")
        }
    }
    
    private func parseWorkoutPlanObject(_ jsonObject: [String: Any]) throws -> WorkoutPlan {
        guard let id = jsonObject["id"] as? Int,
              let userProfileId = jsonObject["user_profile_id"] as? Int,
              let title = jsonObject["title"] as? String,
              let summary = jsonObject["summary"] as? String,
              let createdAt = jsonObject["created_at"] as? String,
              let updatedAt = jsonObject["updated_at"] as? String else {
            throw NetworkError.workoutPlanGenerationFailed("Missing fields in function response")
        }
        
        let createdAtDate = try parseDateOrThrow(createdAt)
        let updatedAtDate = try parseDateOrThrow(updatedAt)
        
        return WorkoutPlan(
            id: id,
            userProfileId: userProfileId,
            title: title,
            summary: summary,
            createdAt: createdAtDate,
            updatedAt: updatedAtDate
        )
    }
    
    private func parseDateOrThrow(_ dateString: String) throws -> Date {
        if let date = iso8601Formatter.date(from: dateString) ?? iso8601FormatterNoFraction.date(from: dateString) {
            return date
        }
        throw NetworkError.workoutPlanGenerationFailed("Invalid date format in function response")
    }

    // MARK: - Public fetching helpers (Workout Plans)
    func fetchWorkoutPlans(userProfileId: Int) async throws -> [WorkoutPlan] {
        // Prefer manual parsing to avoid decoding issues
        let response = try await supabase.database
            .from("workout_plans")
            .select()
            .eq("user_profile_id", value: userProfileId)
            .execute()
        guard let data = response.data as? Data else {
            // Fallback to typed decoding
            let typed: [WorkoutPlan] = try await supabase.database
                .from("workout_plans")
                .select()
                .eq("user_profile_id", value: userProfileId)
                .execute()
                .value
            return typed
        }
        return try parseWorkoutPlansArray(from: data)
    }
    
    func fetchWorkoutPlansByUserIdJoin(userId: UUID) async throws -> [WorkoutPlan] {
        let response = try await supabase.database
            .from("workout_plans")
            .select("id,user_profile_id,title,summary,created_at,updated_at,user_profiles!inner(user_id)")
            .eq("user_profiles.user_id", value: userId)
            .execute()
        guard let data = response.data as? Data else {
            let typed: [WorkoutPlan] = try await supabase.database
                .from("workout_plans")
                .select("id,user_profile_id,title,summary,created_at,updated_at,user_profiles!inner(user_id)")
                .eq("user_profiles.user_id", value: userId)
                .execute()
                .value
            return typed
        }
        return try parseWorkoutPlansArray(from: data)
    }
    
    private func parseWorkoutPlansArray(from data: Data) throws -> [WorkoutPlan] {
        guard let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }
        return try jsonArray.map { try parseWorkoutPlanObject($0) }
    }
    
    /// Save weekly schedule and its daily workouts
    private func saveWeeklySchedule(_ weeklySchedule: GeneratedWeeklySchedule, workoutPlanId: Int) async throws {
        print("--- [DEBUG] 📅 Saving weekly schedule for week \(weeklySchedule.weekNumber) ---")
        
        let newWeeklySchedule = WeeklyScheduleInsert(
            workout_plan_id: workoutPlanId,
            week_number: weeklySchedule.weekNumber,
        )
        
        let weeklyScheduleResponse: [WeeklySchedule] = try await supabase.database
            .from("weekly_schedules")
            .insert(newWeeklySchedule)
            .select()
            .execute()
            .value
        
        guard let createdWeeklySchedule = weeklyScheduleResponse.first else {
            print("--- [DEBUG] ❌ Failed to create weekly schedule ---")
            throw NetworkError.workoutPlanGenerationFailed("Failed to create weekly schedule")
        }
        
        print("--- [DEBUG] ✅ Created weekly schedule with ID: \(createdWeeklySchedule.id) ---")
        
        // Save daily workouts
        for dailyWorkout in weeklySchedule.dailyWorkouts {
            try await saveDailyWorkout(dailyWorkout, weeklyScheduleId: createdWeeklySchedule.id)
        }
    }
    
    /// Save daily workout and its exercises
    private func saveDailyWorkout(_ dailyWorkout: GeneratedDailyWorkout, weeklyScheduleId: Int) async throws {
        print("--- [DEBUG] 🗓️ Saving daily workout for \(dailyWorkout.dayOfWeek) ---")
        
        let newDailyWorkout = DailyWorkoutInsert(
            weekly_schedule_id: weeklyScheduleId,
            day_of_week: dailyWorkout.dayOfWeek,
        )
        
        let dailyWorkoutResponse: [DailyWorkout] = try await supabase.database
            .from("daily_workouts")
            .insert(newDailyWorkout)
            .select()
            .execute()
            .value
        
        guard let createdDailyWorkout = dailyWorkoutResponse.first else {
            print("--- [DEBUG] ❌ Failed to create daily workout ---")
            throw NetworkError.workoutPlanGenerationFailed("Failed to create daily workout")
        }
        
        print("--- [DEBUG] ✅ Created daily workout with ID: \(createdDailyWorkout.id) ---")
        
        // Save exercises if not a rest day
        if !dailyWorkout.isRestDay {
            print("--- [DEBUG] 💪 Saving \(dailyWorkout.exercises.count) exercises for \(dailyWorkout.dayOfWeek) ---")
            for exercise in dailyWorkout.exercises {
                try await saveWorkoutExercise(exercise, dailyWorkoutId: createdDailyWorkout.id)
            }
        } else {
            print("--- [DEBUG] 😴 Rest day - no exercises to save ---")
        }
    }
    
    /// Save individual workout exercise
    private func saveWorkoutExercise(_ exercise: GeneratedWorkoutExercise, dailyWorkoutId: Int) async throws {
        print("--- [DEBUG] 🏋️ Saving exercise: \(exercise.name) (\(exercise.sets) sets, \(exercise.reps) reps) ---")
        
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
            print("--- [DEBUG] 🔍 Found existing exercise with ID: \(exerciseId) ---")
        } else {
            // Create new exercise
            print("--- [DEBUG] 🆕 Creating new exercise: \(exercise.name) ---")
            
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
                print("--- [DEBUG] ❌ Failed to create exercise ---")
                throw NetworkError.workoutPlanGenerationFailed("Failed to create exercise")
            }
            
            exerciseId = createdExercise.id
            print("--- [DEBUG] ✅ Created new exercise with ID: \(exerciseId) ---")
        }
        
        // Create workout exercise
        let newWorkoutExercise = WorkoutExerciseInsert(
            daily_workout_id: dailyWorkoutId,
            exercise_id: exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: nil
        )
        
        try await supabase.database
            .from("workout_exercises")
            .insert(newWorkoutExercise)
            .execute()
        
        print("--- [DEBUG] ✅ Saved workout exercise successfully ---")
    }
    
    // MARK: - Helper Methods for Supabase Integration
    
    /// Saves the Supabase access token to UserDefaults
    func saveAuthToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: "supabase_access_token")
        print("--- [DEBUG] 🔑 Auth token saved to UserDefaults ---")
    }
    
    /// Clears the stored auth token
    func clearAuthToken() {
        UserDefaults.standard.removeObject(forKey: "supabase_access_token")
        print("--- [DEBUG] 🗑️ Auth token cleared from UserDefaults ---")
    }
    
    /// Checks if we have a valid stored auth token
    func hasStoredAuthToken() -> Bool {
        let hasToken = UserDefaults.standard.string(forKey: "supabase_access_token") != nil
        print("--- [DEBUG] 🔍 Stored auth token check: \(hasToken ? "Found" : "Not found") ---")
        return hasToken
    }
}

