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
    func fetchCompleteWorkoutPlan(for workoutPlan: WorkoutPlan) async throws -> CompleteWorkoutPlan
    func updateWorkoutExerciseDetails(workoutExerciseId: Int, sets: Int, reps: [Int], weight: [Double?], weight1rm: [Int]) async throws
    func batchUpdateWorkoutExercises(_ updates: [(id: Int, sets: Int, reps: [Int], weight: [Double?], weight1rm: [Int])]) async throws
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
    
    // Custom URLSession with extended timeouts for workout plan generation
    // Workout plan generation can take 2-5 minutes due to:
    // - AI processing complex multi-week programs
    // - Detailed justifications for each level (program, weekly, daily)
    // - Exercise selection and validation
    // - RAG-enhanced knowledge retrieval
    private lazy var workoutPlanSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 180.0  // 3 minutes for request timeout
        config.timeoutIntervalForResource = 300.0 // 5 minutes for total resource timeout
        return URLSession(configuration: config)
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
        
        print("--- [DEBUG] ⏱️ Starting workout plan generation (this may take 2-5 minutes)... ---")
        let (data, response) = try await workoutPlanSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("--- [DEBUG] ❌ Invalid HTTP response ---")
            throw NetworkError.invalidResponse
        }
        
        print("--- [DEBUG] 📥 Received response with status: \(httpResponse.statusCode) ---")
        print("--- [DEBUG] ✅ Workout plan generation completed successfully! ---")
        
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
                        guard let exerciseId = exerciseData["exercise_id"] as? Int,
                              let sets = exerciseData["sets"] as? Int,
                              let repsArray = exerciseData["reps"] as? [Int] else {
                            print("--- [DEBUG] ⚠️ Failed to parse exercise data ---")
                            print("--- [DEBUG] exerciseData: \(exerciseData) ---")
                            continue
                        }
                        
                        // Parse weight_1rm field (array of integers, default to [80] if not provided)
                        let weight1rm = exerciseData["weight_1rm"] as? [Int] ?? Array(repeating: 80, count: sets)
                        
                        exercises.append(GeneratedWorkoutExercise(
                            name: String(exerciseId),  // Convert exercise_id to string for storage
                            sets: sets,
                            reps: repsArray,  // Keep as array of integers
                            weight1rm: weight1rm
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
        let rows: [WorkoutPlan] = try await supabase.database
            .rpc("upsert_complete_workout_plan", params: [
                "p_user_profile_id": String(userProfileId),
                "p_title": title,
                "p_summary": summary,
            ])
            .execute()
            .value
        guard let plan = rows.first else {
            throw NetworkError.workoutPlanGenerationFailed("Empty function response")
        }
        return plan
    }
    
    private func parseWorkoutPlan(from jsonData: Data) throws -> WorkoutPlan {
        // Prefer typed decode via Supabase SDK structure; support both array and single object
        if let array = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]], !array.isEmpty {
            let data = try JSONSerialization.data(withJSONObject: array)
            let rows = try JSONDecoder().decode([WorkoutPlan].self, from: data)
            if let first = rows.first { return first }
        } else if let obj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            let data = try JSONSerialization.data(withJSONObject: obj)
            return try JSONDecoder().decode(WorkoutPlan.self, from: data)
        }
        throw NetworkError.workoutPlanGenerationFailed("Invalid function response")
    }
    
    private func parseWorkoutPlanObject(_ jsonObject: [String: Any]) throws -> WorkoutPlan {
        let data = try JSONSerialization.data(withJSONObject: jsonObject)
        return try JSONDecoder().decode(WorkoutPlan.self, from: data)
    }
    
    private func parseDateOrThrow(_ dateString: String) throws -> Date {
        // This is now only used by legacy manual parsers (kept for safety). Prefer typed decoding.
        if let date = ISO8601DateFormatter().date(from: dateString) { return date }
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime]
        if let date = f.date(from: dateString) { return date }
        throw NetworkError.workoutPlanGenerationFailed("Invalid date format in function response")
    }

    // MARK: - Public fetching helpers (Workout Plans)
    func fetchWorkoutPlans(userProfileId: Int) async throws -> [WorkoutPlan] {
        try await supabase.database
            .from("workout_plans")
            .select()
            .eq("user_profile_id", value: userProfileId)
            .execute()
            .value
    }
    
    func fetchWorkoutPlansByUserIdJoin(userId: UUID) async throws -> [WorkoutPlan] {
        try await supabase.database
            .from("workout_plans")
            .select("id,user_profile_id,title,summary,created_at,updated_at,user_profiles!inner(user_id)")
            .eq("user_profiles.user_id", value: userId)
            .execute()
            .value
    }
    
    private func parseWorkoutPlansArray(from data: Data) throws -> [WorkoutPlan] {
        guard let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }
        return try jsonArray.map { try parseWorkoutPlanObject($0) }
    }
    
    // MARK: - Complete plan fetching
    func fetchCompleteWorkoutPlan(for workoutPlan: WorkoutPlan) async throws -> CompleteWorkoutPlan {
        // Step 1: Fetch weekly schedules (typed)
        let weeklySchedules: [WeeklySchedule] = try await supabase.database
            .from("weekly_schedules")
            .select()
            .eq("workout_plan_id", value: workoutPlan.id)
            .execute()
            .value
        
        // Step 2: Fetch daily workouts (typed)
        let weeklyScheduleIds = weeklySchedules.map { $0.id }
        let dailyWorkouts: [DailyWorkout] = try await supabase.database
            .from("daily_workouts")
            .select()
            .`in`("weekly_schedule_id", values: weeklyScheduleIds)
            .execute()
            .value
        
        // Step 3: Fetch workout exercises (typed)
        let dailyWorkoutIds = dailyWorkouts.map { $0.id }
        let workoutExercises: [WorkoutExercise] = try await supabase.database
            .from("workout_exercises")
            .select()
            .`in`("daily_workout_id", values: dailyWorkoutIds)
            .execute()
            .value
        
        // Step 4: Fetch exercises referenced by workout exercises (no dates; typed decoding fine)
        let exerciseIds = workoutExercises.map { $0.exerciseId }
        let exercises: [Exercise] = try await supabase.database
            .from("exercises")
            .select()
            .`in`("id", values: exerciseIds)
            .execute()
            .value
        
        // Step 5: Create complete workout plan structure
        return CompleteWorkoutPlan(
            workoutPlan: workoutPlan,
            weeklySchedules: weeklySchedules,
            dailyWorkouts: dailyWorkouts,
            workoutExercises: workoutExercises,
            exercises: exercises
        )
    }
    
    // MARK: - Parsers retained for legacy/manual fallbacks (prefer typed decoding)
    private func parseWeeklySchedulesArray(from data: Data) throws -> [WeeklySchedule] {
        let decoder = JSONDecoder()
        return try decoder.decode([WeeklySchedule].self, from: data)
    }
    
    private func parseDailyWorkoutsArray(from data: Data) throws -> [DailyWorkout] {
        let decoder = JSONDecoder()
        return try decoder.decode([DailyWorkout].self, from: data)
    }
    
    private func parseWorkoutExercisesArray(from data: Data) throws -> [WorkoutExercise] {
        let decoder = JSONDecoder()
        return try decoder.decode([WorkoutExercise].self, from: data)
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
        
        // Extract exercise_id from the name field (which contains the exercise_id from backend)
        guard let exerciseId = Int(exercise.name) else {
            print("--- [DEBUG] ❌ Invalid exercise_id: \(exercise.name) ---")
            throw NetworkError.workoutPlanGenerationFailed("Invalid exercise_id format")
        }
        
        print("--- [DEBUG] 🔍 Using exercise_id: \(exerciseId) ---")
        
        // Create workout exercise directly with the provided exercise_id
        let newWorkoutExercise = WorkoutExerciseInsert(
            daily_workout_id: dailyWorkoutId,
            exercise_id: exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: Array(repeating: nil, count: exercise.sets),  // Array of NULLs matching sets length
            weight_1rm: exercise.weight1rm  // Now an array of integers
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
    
    // MARK: - Workout Progress Updates
    
    /// Update workout exercise details (reps and weights) in the database
    func updateWorkoutExerciseDetails(
        workoutExerciseId: Int,
        sets: Int,
        reps: [Int],
        weight: [Double?],
        weight1rm: [Int] = [80]
    ) async throws {
        print("--- [DEBUG] 🔄 Updating workout exercise details for ID: \(workoutExerciseId) ---")
        
        struct WorkoutExerciseUpdate: Encodable {
            let sets: Int
            let reps: [Int]
            let weight: [Double?]
            let weight_1rm: [Int]
        }
        
        let updateData = WorkoutExerciseUpdate(sets: sets, reps: reps, weight: weight, weight_1rm: weight1rm)
        
        try await supabase.database
            .from("workout_exercises")
            .update(updateData)
            .eq("id", value: workoutExerciseId)
            .execute()
        
        print("--- [DEBUG] ✅ Successfully updated workout exercise details ---")
    }
    
    /// Batch update multiple workout exercises
    func batchUpdateWorkoutExercises(_ updates: [(id: Int, sets: Int, reps: [Int], weight: [Double?], weight1rm: [Int])]) async throws {
        print("--- [DEBUG] 🔄 Batch updating \(updates.count) workout exercises ---")
        
        for update in updates {
            try await updateWorkoutExerciseDetails(
                workoutExerciseId: update.id,
                sets: update.sets,
                reps: update.reps,
                weight: update.weight,
                weight1rm: update.weight1rm
            )
        }
        
        print("--- [DEBUG] ✅ Successfully batch updated all workout exercises ---")
    }
}

