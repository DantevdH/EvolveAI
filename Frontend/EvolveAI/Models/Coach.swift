//
//  Coach.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

// 1. The Blueprint for a Coach
struct Coach {
    let name: String
    let goal: String // The primaryGoal this coach is for
    let iconName: String
    let tagline: String
    let primaryColor: Color
}

// 2. A central place to store all your defined coaches
struct CoachProvider {
    static let allCoaches: [Coach] = [
        Coach(
            name: "Coach Stride",
            goal: "Improve Endurance",
            iconName: "figure.run",
            tagline: "Going the distance, one step at a time.",
            primaryColor: .blue
        ),
        Coach(
            name: "Coach Forge",
            goal: "Bodybuilding",
            iconName: "dumbbell.fill",
            tagline: "Sculpting strength, building legends.",
            primaryColor: .orange
        ),
        Coach(
            name: "Coach Titan",
            goal: "Increase Strength",
            iconName: "flame.fill",
            tagline: "Unleash your inner power.",
            primaryColor: .evolvePrimary
        ),
        Coach(
            name: "Coach Balance",
            goal: "General Fitness",
            iconName: "heart.fill",
            tagline: "Your daily dose of wellness.",
            primaryColor: .green
        ),
        Coach(
            name: "Coach Shift",
            goal: "Weight Loss",
            iconName: "scalemass.fill",
            tagline: "Transforming your energy.",
            primaryColor: .teal
        ),
        Coach(
            name: "Coach Bolt",
            goal: "Power & Speed",
            iconName: "bolt.fill", // A more dynamic icon
            tagline: "Ignite your potential.",
            primaryColor: .purple
        )
    ]
    
    // 3. A helper function to easily find the right coach
    static func coach(for goal: String) -> Coach? {
        return allCoaches.first { $0.goal == goal }
    }
}

struct CoachMessageView: View {
    let coach: Coach
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: coach.iconName)
                .font(.system(size: 60))
                .foregroundColor(coach.primaryColor)
                .shadow(color: coach.primaryColor.opacity(0.5), radius: 10)
            
            Text(coach.name)
                .font(.largeTitle.bold())
                .foregroundColor(.white)
            
            Text(coach.tagline)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
        }
        .padding(30)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.white.opacity(0.1), Color.white.opacity(0.05)]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 10)
    }
}
