//
//  Generating.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct AIGeneratingView: View {
    
    @Binding var userProfile: UserProfile
    // State for the spinner animation
    @State private var isAnimating = false
    
    // --- REMOVED dynamic text properties and timer ---

    var body: some View {
        ZStack {
            // A dark, blurred background for a focused, futuristic feel
            Color.black.opacity(0.95).ignoresSafeArea()
            
            VStack(spacing: 40) {
                // The spinner and coach icon
                ZStack {
                    // Background track for the spinner
                    Circle()
                        .stroke(Color.white.opacity(0.1), lineWidth: 10)
                    
                    // The animated part of the spinner
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
                    
                    // The "Coach Cortex" icon
                    Image(systemName: "cpu")
                        .font(.system(size: 70))
                        .foregroundColor(.white)
                        .shadow(color: .evolvePrimary.opacity(0.7), radius: 10)
                }
                .frame(width: 180, height: 180)
                
                // The text block
                VStack(spacing: 12) {
                    Text("\(userProfile.coach.name) is thinking...")
                        .font(.title2.weight(.bold))
                        .foregroundColor(.white)
                    
                    Text("This might take a few minutes, you can close down the app.")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
        }
        .onAppear {
            // Start the spinner animation
            withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
        // --- REMOVED .onReceive(timer) modifier ---
    }
}


struct AIGeneratingView_Previews: PreviewProvider {
    static var previews: some View {
        // --- MODIFICATION: Provide a binding to a sample UserProfile for the preview ---
        AIGeneratingView(userProfile: .constant(UserProfile(coach: CoachProvider.allCoaches[2])))
    }
}
