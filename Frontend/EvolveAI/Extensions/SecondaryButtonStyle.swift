//
//  SecondaryButtonStyle.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 28/06/2025.
//

import SwiftUI

// This struct defines the style for all secondary action buttons.
// It creates a button with a clear background and a colored border.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color.clear)
            .foregroundColor(.evolveBlue)
            .overlay(
                Capsule()
                    .stroke(Color.evolveBlue, lineWidth: 2)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
