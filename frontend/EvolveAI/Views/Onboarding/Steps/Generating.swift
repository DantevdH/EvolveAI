//
//  Generating.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct AIGeneratingView: View {
    @EnvironmentObject var userManager: UserManager
    
    // The completed profile is passed in from the onboarding flow.
    let userProfile: UserProfile
    // The view accepts an optional Coach.
    let coach: Coach?
    
    @State private var isAnimating = false
    @State private var hasError = false

    var body: some View {
        // FIX: Use a Group to wrap the conditional logic.
        Group {
            // FIX: Use 'if let' to safely unwrap the coach. This is the standard
            // pattern in a SwiftUI view body and avoids multiple return paths.
            if let coach = self.coach {
                ZStack {
                    Color.black.opacity(0.95).ignoresSafeArea()
                    
                    VStack(spacing: 40) {
                        ZStack {
                            // --- Spinner UI (no changes needed) ---
                            Circle()
                                .stroke(Color.white.opacity(0.1), lineWidth: 10)
                            
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
                            
                            Image(systemName: "cpu")
                                .font(.system(size: 70))
                                .foregroundColor(.white)
                                .shadow(color: .evolvePrimary.opacity(0.7), radius: 10)
                        }
                        .frame(width: 180, height: 180)
                        
                        // --- Text Block UI (no changes needed) ---
                        VStack(spacing: 12) {
                            // Use the safely unwrapped 'coach' instance.
                            Text("\(coach.name) is thinking...")
                                .font(.title2.weight(.bold))
                                .foregroundColor(.white)

                            Text("This might take a few minutes. Feel free to close the app.")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.7))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                }
                .onAppear {
                    withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                        isAnimating = true
                    }
                    generatePlan()
                }
            } else {
                // This is the fallback view if no coach is provided.
                Text("No coach was selected. Please go back.").foregroundColor(.white)
            }
        }
        // FIX: The .alert modifier is now attached to the Group, ensuring it's
        // always part of the view hierarchy and its result is used.
        .alert("Generation Failed", isPresented: $hasError) {
            Button("Retry", role: .cancel) { generatePlan() }
        } message: {
            Text("We couldn't create your plan. Please check your connection and try again.")
        }
    }

    private func generatePlan() {
        hasError = false
        
        userManager.generateAndSavePlan(for: userProfile) { success in
            if (!success && ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] != "1") {
                self.hasError = true
            }
        }
    }
}

#Preview {
    // 1. Create mock data instances that your view needs.
    let mockProfile = UserProfile()

    let mockCoach = mockCoaches[0]

    // 2. Instantiate your view with the mock data.
    return AIGeneratingView(
        userProfile: mockProfile,
        coach: mockCoach
    )
    .environmentObject(UserManager())
    .environment(\.colorScheme, .dark)
}
