//
//  Error.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//
import SwiftUI

struct ErrorView: View {
    let message: String
    let canRetry: Bool
    let retryAction: () -> Void
    
    var body: some View {
        ZStack {
            // Background
            Color.evolveBackground
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                // Main Error Card
                VStack(spacing: 32) {
                    // Error Icon with animated background
                    ZStack {
                        // Animated background circle
                        Circle()
                            .fill(
                                RadialGradient(
                                    gradient: Gradient(colors: [
                                        Color.evolvePrimary.opacity(0.3),
                                        Color.evolvePrimary.opacity(0.1),
                                        Color.clear
                                    ]),
                                    center: .center,
                                    startRadius: 20,
                                    endRadius: 80
                                )
                            )
                            .frame(width: 160, height: 160)
                            .scaleEffect(1.2)
                        
                        // Error icon
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 60, weight: .medium))
                            .foregroundColor(.evolvePrimary)
                            .shadow(color: .evolvePrimary.opacity(0.6), radius: 20, x: 0, y: 10)
                    }
                    
                    // Error Message
                    VStack(spacing: 16) {
                        Text("Something went wrong")
                            .font(.title2.weight(.bold))
                            .foregroundColor(.evolveText)
                        
                        Text(message)
                            .font(.body)
                            .foregroundColor(.evolveMuted)
                            .multilineTextAlignment(.center)
                            .lineLimit(nil)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal, 24)
                    
                    // Action Buttons
                    VStack(spacing: 16) {
                        if canRetry {
                            Button(action: retryAction) {
                                HStack(spacing: 12) {
                                    Image(systemName: "arrow.clockwise")
                                        .font(.system(size: 18, weight: .semibold))
                                    Text("Try Again")
                                        .font(.headline.weight(.semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.evolvePrimary,
                                            Color.evolvePrimary.opacity(0.8)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .shadow(color: .evolvePrimary.opacity(0.6), radius: 12, y: 8)
                                .shadow(color: .evolvePrimary.opacity(0.3), radius: 24, y: 0)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .scaleEffect(1.0)
                            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: true)
                        } else {
                            Button(action: retryAction) {
                                HStack(spacing: 12) {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.system(size: 18, weight: .semibold))
                                    Text("Restart App")
                                        .font(.headline.weight(.semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.red.opacity(0.8),
                                            Color.red.opacity(0.6)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .shadow(color: .red.opacity(0.6), radius: 12, y: 8)
                                .shadow(color: .red.opacity(0.3), radius: 24, y: 0)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .scaleEffect(1.0)
                            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: true)
                        }
                        
                        // Additional Help Text
                        if canRetry {
                            Text("We'll automatically try to fix this in a few seconds")
                                .font(.caption)
                                .foregroundColor(.evolveMuted.opacity(0.7))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 20)
                        }
                    }
                    .padding(.horizontal, 24)
                }
                .padding(.vertical, 40)
                .padding(.horizontal, 24)
                .background(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(Color.evolveCard)
                        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.white.opacity(0.2),
                                    Color.white.opacity(0.05)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
                .padding(.horizontal, 24)
                
                Spacer()
                
            }
        }
    }
}

// MARK: - Preview
#Preview {
    Group {
        // Preview with retry option
        ErrorView(
            message: "Failed to connect to the server. Please check your internet connection and try again.",
            canRetry: true
        ) {
            print("Retry tapped")
        }
        
//        // Preview without retry option
//        ErrorView(
//            message: "Critical error occurred. The app needs to be restarted to continue.",
//            canRetry: false
//        ) {
//            print("Restart tapped")
//        }
    }
}
