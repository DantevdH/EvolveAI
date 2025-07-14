//
//  01_ExperienceLevel.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct ExperienceStep: View {
    @Binding var userProfile: UserProfile
    
    private let levels = [
        ("Beginner", "Just starting my fitness journey"),
        ("Intermediate", "I workout regularly with some experience"),
        ("Advanced", "I'm experienced with training and nutrition")
    ]
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("Experience Level")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Help us tailor your program")
                .font(.subheadline)
                .foregroundColor(.white)
            
            VStack(spacing: 16) {
                ForEach(levels, id: \.0) { level in
                    ExperienceCard(
                        title: level.0,
                        description: level.1,
                        isSelected: userProfile.experienceLevel == level.0
                    ) {
                        userProfile.experienceLevel = level.0
                    }
                }
            }
            .padding(.horizontal)
            
            Spacer()
        }
    }
}

struct ExperienceCard: View {
    let title: String
    let description: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                    
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(isSelected ? .white : .gray)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .black : .evolvePrimary)
                    .font(.title2)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.evolvePrimary : Color.evolveCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.clear : Color.evolvePrimary.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}
