//
//  Generating.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

/// A view that displays an animated loading indicator while the AI generates the user's workout plan.
/// This view is presented at the end of the onboarding flow.
struct AIGeneratingView: View {

    @EnvironmentObject var userManager: UserManager
    let userProfile: UserProfile
    let coach: Coach?
    
    @State private var isAnimating = false
    @State private var hasError = false

    var body: some View {
        // The Group ensures the alert modifier is always present in the view hierarchy.
        Group {
            // We must have a coach to proceed. If not, show a fallback message.
            if let coach = self.coach {
                ZStack {
                    // A dark, semi-opaque background for a focused, modal feel.
                    Color.black.opacity(0.95).ignoresSafeArea()
                    
                    VStack(spacing: 40) {
                        // --- Animated Spinner ---
                        ZStack {
                            // The background track for the spinner
                            Circle()
                                .stroke(Color.white.opacity(0.1), lineWidth: 10)
                            
                            // The rotating, gradient-filled arc of the spinner
                            Circle()
                                .trim(from: 0, to: 0.7)
                                .stroke(
                                    LinearGradient(
                                        gradient: Gradient(colors: [.evolvePrimary, .evolvePrimary.opacity(0.5)]),
                                        startPoint: .top,
                                        endPoint: .bottom
                                    ),
                                    style: StrokeStyle(lineWidth: 10, lineCap: .round)
                                )
                                .rotationEffect(.degrees(isAnimating ? 360 : 0))
                            
                            // A central icon to give context to the loading process.
                            Image(systemName: "cpu")
                                .font(.system(size: 70))
                                .foregroundColor(.white)
                                .shadow(color: .evolvePrimary.opacity(0.7), radius: 10)
                        }
                        .frame(width: 180, height: 180)
                        
                        // --- Informational Text ---
                        VStack(spacing: 12) {
                            Text("\(coach.name) is thinking...")
                                .font(.title2.weight(.bold))
                                .foregroundColor(.white)

                            Text("This might take a few moments. Feel free to close the app, we'll notify you when it's ready.")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.7))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                }
                .onAppear {
                    // Start the continuous rotation animation when the view appears.
                    withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                        isAnimating = true
                    }
                    // Trigger the plan generation process.
                    generatePlan()
                }
            } else {
                // Fallback view if the coach object is unexpectedly nil.
                Text("No coach was selected. Please go back.")
                    .foregroundColor(.white)
            }
        }
        // --- Error Handling ---
        // An alert that is shown when the `hasError` state variable is true.
        .alert("Generation Failed", isPresented: $hasError) {
            Button("Retry", role: .cancel) { generatePlan() }
        } message: {
            Text("We couldn't create your plan. Please check your connection and try again.")
        }
    }

    private func generatePlan() {
        // Reset error state before a new attempt.
        hasError = false
        
        // Call the function on the shared userManager instance.
        userManager.completeOnboardingAndGeneratePlan(for: userProfile) { success in
            // If the generation fails, set the state to show the error alert.
            // The success case is handled automatically by the @Published properties
            // in UserManager, which will cause the InitialiseView to switch to the MainTabView.
            if !success {
                // We add a check to prevent the alert from showing in SwiftUI Previews,
                // as they don't have a live network connection.
                if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] != "1" {
                    self.hasError = true
                }
            }
        }
    }
}

//#Preview {
//    // 1. Create mock data instances that your view needs.
//    let mockProfile = UserProfile(
//        primaryGoal: "Increase Strength",
//        experienceLevel: "Intermediate",
//        daysPerWeek: 4,
//        minutesPerSession: 60,
//        equipment: ["Full Gym"],
//        age: 30,
//        weight: 80,
//        weightUnit: "kg",
//        height: 180,
//        heightUnit: "cm",
//        gender: "Male"
//    )
//
//    let mockCoach = Coach(
//        id: 1,
//        name: "Coach Alex",
//        specialization: "Strength Training",
//        bio: "Alex is a certified strength and conditioning specialist with over 10 years of experience.",
//        tagline: "Let's build some serious power!",
//        goal: "Increase Strength"
//    )
//
//    // 2. Instantiate your view with the mock data.
//    return AIGeneratingView(
//        userProfile: mockProfile,
//        coach: mockCoach
//    )
//    // 3. Provide a dummy UserManager for the preview to function.
//    .environmentObject(UserManager())
//    // 4. Set a specific color scheme for consistent previewing.
//    .environment(\.colorScheme, .dark)
//}
