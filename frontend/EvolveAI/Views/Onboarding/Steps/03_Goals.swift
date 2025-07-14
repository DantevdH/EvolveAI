//
//  03_Goals.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct GoalsStep: View {
    @Binding var userProfile: UserProfile
    let availableCoaches: [Coach]
    var onCoachSelected: (Coach) -> Void
    
    // --- MODIFIED: More accurate icons and descriptions ---
    private let goals = [
        ("Improve Endurance", "figure.run", "Enhance stamina for long-distance activities."),
        ("Bodybuilding", "dumbbell.fill", "Maximize muscle growth and definition."),
        ("Increase Strength", "flame.fill", "Focus on increasing raw power and lifting heavier."),
        ("General Fitness", "heart.fill", "Maintain overall health and well-being."),
        ("Weight Loss", "scalemass.fill", "Burn fat and improve body composition."),
        ("Power & Speed", "trophy.fill", "Boost speed, agility, and sport-specific skills.")
    ]
    
    private let characterLimit = 300
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("What's Your Goal?")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                
                Text("Select your primary fitness objective")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(goals, id: \.0) { goal in
                        GoalCard(
                            title: goal.0,
                            icon: goal.1,
                            description: goal.2,
                            isSelected: userProfile.primaryGoal == goal.0
                        ) {
                            // When a new goal is selected, reset the description
                            if userProfile.primaryGoal != goal.0 {
                                userProfile.primaryGoalDescription = ""
                            }
                            userProfile.primaryGoal = goal.0
                            if let coach = availableCoaches.first(where: { $0.goal == goal.0 }) {
                                    onCoachSelected(coach)
                                }
                            
 
                        }
                    }
                }
                .padding(.horizontal)
                
                if !userProfile.primaryGoal.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Describe your goal (optional)")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        // --- MODIFICATION: Replaced TextField with TextEditor for multi-line, expanding input ---
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $userProfile.primaryGoalDescription)
                                .scrollContentBackground(.hidden) // Allows custom background
                                .padding(8)
                                .frame(minHeight: 120) // Set a larger initial height
                                .background(Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .foregroundColor(.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                                // --- MODIFICATION: Updated onChange syntax ---
                                .onChange(of: userProfile.primaryGoalDescription) {
                                    // The old and new values are no longer passed directly in the closure
                                    let newValue = userProfile.primaryGoalDescription
                                    if newValue.count > characterLimit {
                                        userProfile.primaryGoalDescription = String(newValue.prefix(characterLimit))
                                    }
                                }
                            
                            // Custom placeholder for the TextEditor
                            if userProfile.primaryGoalDescription.isEmpty {
                                Text("e.g., 'Run a 5k without stopping'")
                                    .foregroundColor(.white.opacity(0.4))
                                    .padding(16)
                                    .allowsHitTesting(false)
                            }
                        }
                        
                        // Character count indicator
                        Text("\(userProfile.primaryGoalDescription.count) / \(characterLimit)")
                            .font(.caption)
                            .foregroundColor(userProfile.primaryGoalDescription.count > characterLimit ? .red : .white.opacity(0.6))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .padding(.horizontal)
                    .padding(.top)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                
                // Add a spacer to push content up and prevent the textbox
                // from being hidden behind the navigation buttons.
                Spacer(minLength: 100)
            }
            .animation(.easeInOut, value: userProfile.primaryGoal)
        }
    }
}


struct GoalCard: View {
    let title: String
    let icon: String
    let description: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(isSelected ? .black : .evolvePrimary)
                
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                Text(description)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundColor(isSelected ? .white : .gray)
            }
            .padding(8)
            .frame(height: 140)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? Color.evolvePrimary : Color.evolveCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isSelected ? Color.clear : Color.evolvePrimary.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}
