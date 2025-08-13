//
//  Coach.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

// 1. The Blueprint for a Coach
// The Coach struct now works with Supabase database
struct Coach: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let goal: String
    let iconName: String
    let tagline: String
    let primaryColorHex: String
    let createdAt: Date?
    let updatedAt: Date?

    var primaryColor: Color {
        Color(hex: primaryColorHex)
    }

    // This tells Swift how to map the JSON keys to the struct properties.
    enum CodingKeys: String, CodingKey {
        case id, name, goal, tagline
        case iconName = "icon_name"
        case primaryColorHex = "primary_color_hex"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CoachMessageView: View {
    let coach: Coach
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: coach.iconName)
                .font(.system(size: 60))
                .foregroundColor(coach.primaryColor)
                .shadow(color: coach.primaryColor.opacity(0.5), radius: 10)
            
            Text(coach.name)
                .font(.largeTitle.bold())
                .foregroundColor(.white)
            
            Text(coach.tagline)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
        }
        .padding(30)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.white.opacity(0.1), Color.white.opacity(0.05)]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 10)
    }
}


