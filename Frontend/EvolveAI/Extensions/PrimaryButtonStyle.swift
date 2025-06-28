//
//  PrimaryButtonStyle.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 28/06/2025.
//
import SwiftUI

// This struct defines the style for all primary action buttons in the app.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color.evolveBlue)
            .foregroundColor(.white)
            .clipShape(Capsule()) // This creates the rounded pill shape.
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0) // Adds a nice press effect.
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
