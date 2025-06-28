//
//  Exercise.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 28/06/2025.
//

import Foundation

// This struct defines the blueprint for a single exercise.
// It includes all the necessary details to display and categorize it.
struct Exercise: Identifiable {
    let id = UUID() // Provides a unique ID for each exercise, required for lists.
    let name: String
    let category: String
    let difficulty: String
    let equipment: String
}
