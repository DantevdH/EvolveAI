//
//  mockCoach.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 14/07/2025.
//

import Foundation

let mockCoaches: [Coach] = [
    Coach(
        id: 1,
        name: "Coach Stride",
        goal: "Improve Endurance",
        iconName: "figure.run",
        tagline: "Going the distance, one step at a time.",
        primaryColorHex: "#007AFF",
        createdAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z"),
        updatedAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z")
    ),
    Coach(
        id: 2,
        name: "Coach Forge",
        goal: "Bodybuilding",
        iconName: "Coachforge",
        tagline: "Sculpting strength, building legends.",
        primaryColorHex: "#FF9500",
        createdAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z"),
        updatedAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z")
    ),
    Coach(
        id: 3,
        name: "Coach Titan",
        goal: "Increase Strength",
        iconName: "flame.fill",
        tagline: "Unleash your inner power.",
        primaryColorHex: "#FF3B30",
        createdAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z"),
        updatedAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z")
    ),
    Coach(
        id: 4,
        name: "Coach Balance",
        goal: "General Fitness",
        iconName: "heart.fill",
        tagline: "Your daily dose of wellness.",
        primaryColorHex: "#428044",
        createdAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z"),
        updatedAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z")
    ),
    Coach(
        id: 5,
        name: "Coach Shift",
        goal: "Weight Loss",
        iconName: "scalemass.fill",
        tagline: "Transforming your energy.",
        primaryColorHex: "#7F1093",
        createdAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z"),
        updatedAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z")
    ),
    Coach(
        id: 6,
        name: "Coach Bolt",
        goal: "Power & Speed",
        iconName: "bolt.fill",
        tagline: "Ignite your potential.",
        primaryColorHex: "#1AD1DD",
        createdAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z"),
        updatedAt: ISO8601DateFormatter().date(from: "2025-01-01T00:00:00Z")
    )
]
