//
//  Buttons.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

// This struct defines the style for all primary action buttons in the app.
struct StartButtonStyle: ButtonStyle {
    // A futuristic gradient from your brand red to a slightly darker, richer red.
    let futuristicGradient = LinearGradient(
        gradient: Gradient(colors: [Color(hex: "#b74248"), Color(hex: "#4a1117")]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .padding()
            .frame(maxWidth: .infinity) // Make the button stretch to the edges
            .foregroundColor(.white)
            .background(
                // Use the gradient for the background
                futuristicGradient
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)) // Modern rounded corners
            // Add a "glow" effect using a shadow with the button's own color
            .shadow(color: .evolvePrimary.opacity(0.6), radius: configuration.isPressed ? 8 : 12, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            // Use a spring animation for a more dynamic press effect
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    // A futuristic gradient from your brand red to a slightly darker, richer red.
    let futuristicGradient = LinearGradient(
        gradient: Gradient(colors: [Color(hex: "#b74248"), Color(hex: "#4a1117")]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .padding()
            .frame(maxWidth: .infinity) // Make the button stretch to the edges
            .foregroundColor(.white)
            .background(
                // Use the gradient for the background
                futuristicGradient
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)) // Modern rounded corners
            // Add a "glow" effect using a shadow with the button's own color
            .shadow(color: .evolvePrimary.opacity(0.6), radius: configuration.isPressed ? 8 : 12, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            // Use a spring animation for a more dynamic press effect
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct NextButtonStyle: ButtonStyle {
    
    @Environment(\.isEnabled) private var isEnabled
    let disabledBackgroundColor = Color(white: 0.3).opacity(0.8)
    
    // A futuristic gradient from your brand red to a slightly darker, richer red.
    let futuristicGradient = LinearGradient(
        gradient: Gradient(colors: [Color(hex: "#b74248"), Color(hex: "#4a1117")]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .padding()
            .frame(maxWidth: .infinity) // Make the button stretch to the edges
            .foregroundColor(.white)
            .background {
                if isEnabled {
                    futuristicGradient
                } else {
                    disabledBackgroundColor
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)) // Modern rounded corners
            // Add a "glow" effect using a shadow with the button's own color
            .shadow(color: .evolvePrimary.opacity(0.6), radius: configuration.isPressed ? 8 : 12, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            // Use a spring animation for a more dynamic press effect
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    let disabledBackgroundColor = Color(white: 0.3).opacity(0.8)
    
    // A futuristic gradient from your brand red to a slightly darker, richer red.
    let futuristicGradient = LinearGradient(
        gradient: Gradient(colors: [Color(hex: "#4a1117"), Color(hex: "#b74248")]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .padding()
            .frame(maxWidth: .infinity) // Make the button stretch to the edges
            .foregroundColor(.white)
            .background (futuristicGradient)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)) // Modern rounded corners
            // Add a "glow" effect using a shadow with the button's own color
            .shadow(color: .evolvePrimary.opacity(0.6), radius: configuration.isPressed ? 8 : 12, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            // Use a spring animation for a more dynamic press effect
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct StepperButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .foregroundColor(isEnabled ? .white : .gray)
            .frame(width: 50, height: 50)
            .background(
                Circle()
                    .fill(isEnabled ? Color.white.opacity(0.15) : Color.white.opacity(0.05))
            )
            .scaleEffect(configuration.isPressed ? 0.9 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct GenderButtonStyle: ButtonStyle {
    let isSelected: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .background(isSelected ? Color.evolvePrimary : Color.white.opacity(0.1))
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isSelected)
            .animation(.spring(), value: configuration.isPressed)
    }
}

// A reusable styled text field for personal info
struct StyledTextField: View {
    let title: String
    @Binding var value: String
    let unit: String
    var keyboardType: UIKeyboardType = .numberPad
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
            
            HStack {
                TextField("", text: $value)
                    .font(.system(.title, design: .monospaced).weight(.bold))
                    .foregroundColor(.white)
                    .keyboardType(keyboardType)
                
                Text(unit)
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

struct MainButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.evolvePrimary)
            .foregroundStyle(Color.evolveText)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .shadow(color: .evolvePrimary.opacity(0.4), radius: configuration.isPressed ? 4 : 8, x: 0, y: 4)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
