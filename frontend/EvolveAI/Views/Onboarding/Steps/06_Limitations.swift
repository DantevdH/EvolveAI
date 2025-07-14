//
//  06_Limitations.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct LimitationsStep: View {
    @Binding var userProfile: UserProfile
    
    private let characterLimit = 300
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer()
                
                Text("Physical Limitations")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                
                Text("Do you have any injuries or physical limitations we should be aware of?")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                // Custom Toggle for Yes/No
                LimitationToggle(hasLimitations: $userProfile.hasLimitations)
                    .padding(.top)

                // Conditional TextEditor for describing limitations
                if userProfile.hasLimitations {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Please describe your limitations")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $userProfile.limitationsDescription)
                                .scrollContentBackground(.hidden)
                                .padding(8)
                                .frame(minHeight: 150)
                                .background(Color.white.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .foregroundColor(.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                                .onChange(of: userProfile.limitationsDescription) {
                                    let newValue = userProfile.limitationsDescription
                                    if newValue.count > characterLimit {
                                        userProfile.limitationsDescription = String(newValue.prefix(characterLimit))
                                    }
                                }
                            
                            if userProfile.limitationsDescription.isEmpty {
                                Text("e.g., 'Bad lower back', 'Recovering from a knee injury'")
                                    .foregroundColor(.white.opacity(0.4))
                                    .padding(16)
                                    .allowsHitTesting(false)
                            }
                        }
                        
                        // Character count indicator
                        Text("\(userProfile.limitationsDescription.count) / \(characterLimit)")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .scale(scale: 0.9, anchor: .top)))
                }
                
                Spacer()
            }
            .animation(.easeInOut, value: userProfile.hasLimitations)
        }
        .background(Color.black.opacity(0.001))
        .onTapGesture {
            hideKeyboard()
        }
    }
}

// A custom toggle for the "Yes/No" limitation question
struct LimitationToggle: View {
    @Binding var hasLimitations: Bool

    var body: some View {
        HStack(spacing: 16) {
            Button(action: { hasLimitations = false }) {
                Text("No")
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(LimitationButtonStyle(isSelected: !hasLimitations))
            
            Button(action: { hasLimitations = true }) {
                Text("Yes")
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(LimitationButtonStyle(isSelected: hasLimitations))
        }
        .padding(.horizontal)
    }
}

// Custom button style for the limitation toggle
struct LimitationButtonStyle: ButtonStyle {
    let isSelected: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .background(isSelected ? Color.evolvePrimary : Color.white.opacity(0.1))
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.clear : Color.white.opacity(0.2), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isSelected)
    }
}
