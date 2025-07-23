//
//  Error.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 17/07/2025.
//
import SwiftUI

struct ErrorView: View {
    let message: String
    let retryAction: () -> Void
    
    var body: some View {
        VStack(spacing: 15) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.largeTitle)
                .foregroundColor(.yellow)
            Text(message)
                .font(.headline)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button("Retry", action: retryAction)
                .buttonStyle(.borderedProminent)
        }
    }
}
