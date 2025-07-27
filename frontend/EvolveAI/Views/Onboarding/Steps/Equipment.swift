//
//  05_Equipment.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct EquipmentStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    
    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Text("Available Equipment")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Select the option that best describes your setup")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 20) {
                ForEach(viewModel.equipmentOptions, id: \.0) { equipment in
                    EquipmentCard(
                        title: equipment.0,
                        icon: equipment.1,
                        isSelected: viewModel.userProfile.equipment == equipment.0
                    ) {
                        viewModel.userProfile.equipment = equipment.0
                    }
                }
            }
            .padding(.horizontal)
            
            Spacer()
            Spacer()
        }
    }
}

struct EquipmentCard: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    private var gradient: LinearGradient {
        isSelected ?
            LinearGradient(gradient: Gradient(colors: [Color.evolvePrimary, Color.evolvePrimary.opacity(0.7)]), startPoint: .topLeading, endPoint: .bottomTrailing) :
            LinearGradient(gradient: Gradient(colors: [Color.white.opacity(0.1), Color.white.opacity(0.05)]), startPoint: .top, endPoint: .bottom)
    }
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundColor(isSelected ? .white : .evolvePrimary)
                    .shadow(color: isSelected ? .black.opacity(0.2) : .clear, radius: 5, y: 5)
                
                Text(title)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            .frame(height: 150)
            .frame(maxWidth: .infinity)
            .background(gradient)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isSelected ? Color.clear : Color.white.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: isSelected ? .evolvePrimary.opacity(0.5) : .clear, radius: 10, x: 0, y: 10)
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isSelected)
    }
}

