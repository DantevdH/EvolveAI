//
//  evolveTitle.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 14/07/2025.
//

import SwiftUI

struct MainTitleView: View {
    let titleGradient = LinearGradient(
        gradient: Gradient(colors: [.white, Color(hex: "#B0B0B0")]),
        startPoint: .top,
        endPoint: .bottom
    )
    
    var body: some View {
        Text("EvolveAI")
            .font(.system(size: 40, weight: .black, design: .monospaced))
            .kerning(4)
            .foregroundStyle(titleGradient)
            .shadow(color: .red.opacity(0.8), radius: 10) // Assuming .evolvePrimary is blue
    }
}
