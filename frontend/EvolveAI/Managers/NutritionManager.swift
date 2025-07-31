import Foundation
import Combine
import Supabase

class NutritionManager: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
}
// // MARK: - NutritionManager Protocol
// protocol NutritionManagerProtocol: AnyObject {
//     var nutritionPlan: NutritionPlan? { get }
//     var dailyMealPlans: [DailyMealPlan] { get }
//     var meals: [Meal] { get }
//     var isLoading: Bool { get }
//     var errorMessage: String? { get }
    
//     func fetchNutritionPlan(completion: @escaping (Bool) -> Void)
//     func createNutritionPlan(for profile: UserProfile, completion: @escaping (Bool) -> Void)
//     func fetchMeals(completion: @escaping (Bool) -> Void)
// }

// // NutritionManager.swift
// // This class will manage everything related to the user's diet.
// class NutritionManager: ObservableObject, NutritionManagerProtocol {
//     @Published var nutritionPlan: NutritionPlan?
//     @Published var dailyMealPlans: [DailyMealPlan] = []
//     @Published var meals: [Meal] = []
//     @Published var isLoading = false
//     @Published var errorMessage: String?
    
//     // Legacy properties for backward compatibility
//     @Published var calorieTarget: Int = 2000
//     @Published var mealPlan: [Meal] = []
    
//     init() {
//         // Load mock meals for development
//         self.meals = mockMeals
//         self.mealPlan = mockMeals
//     }
    
//     /// Fetches the user's nutrition plan from Supabase
//     func fetchNutritionPlan(completion: @escaping (Bool) -> Void) {
//         DispatchQueue.main.async { [weak self] in
//             self?.isLoading = true
//             self?.errorMessage = nil
//         }
        
//         Task {
//             do {
//                 // Get current session to get user ID
//                 let session = try await supabase.auth.session
//                 let userId = session.user.id
                
//                 // First, get the user's profile to get the profile ID
//                 let userProfiles: [UserProfile] = try await supabase.database
//                     .from("user_profiles")
//                     .select()
//                     .eq("user_id", value: userId)
//                     .execute()
//                     .value
                
//                 guard let userProfile = userProfiles.first else {
//                     await MainActor.run {
//                         self.isLoading = false
//                         self.errorMessage = "User profile not found"
//                         completion(false)
//                     }
//                     return
//                 }
                
//                 // Get the nutrition plan for this user
//                 let nutritionPlans: [NutritionPlan] = try await supabase.database
//                     .from("nutrition_plans")
//                     .select()
//                     .eq("user_profile_id", value: userProfile.id!)
//                     .execute()
//                     .value
                
//                 await MainActor.run {
//                     self.isLoading = false
//                     if let plan = nutritionPlans.first {
//                         self.nutritionPlan = plan
//                         self.calorieTarget = plan.dailyCalories
//                         completion(true)
//                     } else {
//                         // No nutrition plan exists yet
//                         self.nutritionPlan = nil
//                         completion(false)
//                     }
//                 }
//             } catch {
//                 await MainActor.run {
//                     self.isLoading = false
//                     self.errorMessage = "Failed to fetch nutrition plan: \(error.localizedDescription)"
//                     completion(false)
//                 }
//             }
//         }
//     }
    
//     /// Creates a new nutrition plan for the user
//     func createNutritionPlan(for profile: UserProfile, completion: @escaping (Bool) -> Void) {
//         self.errorMessage = nil
        
//         Task {
//             do {
//                 // Get current session to get user ID
//                 let session = try await supabase.auth.session
//                 let userId = session.user.id
                
//                 // Get the user's profile to get the profile ID
//                 let userProfiles: [UserProfile] = try await supabase.database
//                     .from("user_profiles")
//                     .select()
//                     .eq("user_id", value: userId)
//                     .execute()
//                     .value
                
//                 guard let userProfile = userProfiles.first else {
//                     await MainActor.run {
//                         self.errorMessage = "User profile not found"
//                         completion(false)
//                     }
//                     return
//                 }
                
//                 // Calculate nutrition targets based on user profile
//                 let dailyCalories = calculateDailyCalories(for: profile)
//                 let proteinTarget = dailyCalories * 0.3 / 4 // 30% of calories from protein
//                 let carbsTarget = dailyCalories * 0.45 / 4 // 45% of calories from carbs
//                 let fatTarget = dailyCalories * 0.25 / 9 // 25% of calories from fat
                
//                 // Create a new nutrition plan
//                 let newNutritionPlan = NutritionPlan(
//                     id: 0, // Will be set by database
//                     userProfileId: userProfile.id!,
//                     dailyCalories: dailyCalories,
//                     proteinTarget: proteinTarget,
//                     carbsTarget: carbsTarget,
//                     fatTarget: fatTarget,
//                     createdAt: nil,
//                     updatedAt: nil
//                 )
                
//                 let response: [NutritionPlan] = try await supabase.database
//                     .from("nutrition_plans")
//                     .insert(newNutritionPlan)
//                     .execute()
//                     .value
                
//                 await MainActor.run {
//                     if let createdPlan = response.first {
//                         self.nutritionPlan = createdPlan
//                         self.calorieTarget = createdPlan.dailyCalories
//                         completion(true)
//                     } else {
//                         self.errorMessage = "Failed to create nutrition plan"
//                         completion(false)
//                     }
//                 }
//             } catch {
//                 await MainActor.run {
//                     self.errorMessage = "Failed to create nutrition plan: \(error.localizedDescription)"
//                     completion(false)
//                 }
//             }
//         }
//     }
    
//     /// Fetches available meals from Supabase
//     func fetchMeals(completion: @escaping (Bool) -> Void) {
//         Task {
//             do {
//                 let response: [Meal] = try await supabase.database
//                     .from("meals")
//                     .select()
//                     .execute()
//                     .value
                
//                 await MainActor.run {
//                     self.meals = response
//                     completion(true)
//                 }
//             } catch {
//                 await MainActor.run {
//                     self.errorMessage = "Failed to fetch meals: \(error.localizedDescription)"
//                     completion(false)
//                 }
//             }
//         }
//     }
    
//     // MARK: - Private Helper Methods
    
//     /// Calculate daily calorie needs based on user profile
//     private func calculateDailyCalories(for profile: UserProfile) -> Int {
//         // Basic BMR calculation using Mifflin-St Jeor Equation
//         let bmr: Double
//         if profile.gender.lowercased() == "male" {
//             bmr = 10 * profile.weight + 6.25 * profile.height - 5 * Double(profile.age) + 5
//         } else {
//             bmr = 10 * profile.weight + 6.25 * profile.height - 5 * Double(profile.age) - 161
//         }
        
//         // Activity multiplier based on days per week
//         let activityMultiplier: Double
//         switch profile.daysPerWeek {
//         case 1...2:
//             activityMultiplier = 1.2 // Sedentary
//         case 3...4:
//             activityMultiplier = 1.375 // Lightly active
//         case 5...6:
//             activityMultiplier = 1.55 // Moderately active
//         default:
//             activityMultiplier = 1.725 // Very active
//         }
        
//         let tdee = bmr * activityMultiplier
        
//         // Adjust based on goal
//         switch profile.primaryGoal.lowercased() {
//         case let goal where goal.contains("lose") || goal.contains("weight"):
//             return Int(tdee * 0.85) // 15% deficit
//         case let goal where goal.contains("gain") || goal.contains("muscle"):
//             return Int(tdee * 1.1) // 10% surplus
//         default:
//             return Int(tdee) // Maintenance
//         }
//     }
// }
