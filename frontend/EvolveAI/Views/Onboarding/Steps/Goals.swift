//
//  03_Goals.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct GoalsStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    // let availableCoaches: [Coach]
    // var onCoachSelected: (Coach) -> Void
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
                    ForEach(viewModel.goals, id: \.0) { goal in
                        GoalCard(
                            title: goal.0,
                            icon: goal.1,
                            description: goal.2,
                            isSelected: viewModel.userProfile.primaryGoal == goal.0
                        ) {
                            // When a new goal is selected, reset the description
                            if viewModel.userProfile.primaryGoal != goal.0 {
                                viewModel.userProfile.primaryGoalDescription = ""
                            }
                            viewModel.userProfile.primaryGoal = goal.0
                            viewModel.fetchCoaches(userGoal: goal.0)
                        }
                    }
                }
                .padding(.horizontal)
                
                if !viewModel.userProfile.primaryGoal.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Describe your goal (optional)")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $viewModel.userProfile.primaryGoalDescription)
                                .scrollContentBackground(.hidden)
                                .padding(8)
                                .frame(minHeight: 120)
                                .background(Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .foregroundColor(.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )

                               
                                .onChange(of: viewModel.userProfile.primaryGoalDescription) { _, newValue in
                                    if newValue.count > characterLimit {
                                        viewModel.userProfile.primaryGoalDescription = String(newValue.prefix(characterLimit))
                                    }
                                }
                            
                            // Custom placeholder for the TextEditor
                            if viewModel.userProfile.primaryGoalDescription.isEmpty {
                                Text("e.g., 'Run a 5k without stopping'")
                                    .foregroundColor(.white.opacity(0.4))
                                    .padding(16)
                                    .allowsHitTesting(false)
                            }
                        }
                        
                        // Character count indicator
                        Text("\(viewModel.userProfile.primaryGoalDescription.count) / \(characterLimit)")
                            .font(.caption)
                            .foregroundColor(viewModel.userProfile.primaryGoalDescription.count > characterLimit ? .red : .white.opacity(0.6))
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
            .animation(.easeInOut, value: viewModel.userProfile.primaryGoal)
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
                    .accessibilityHidden(true)
                
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
