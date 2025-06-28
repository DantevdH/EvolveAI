//
//  04_Schedule.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct ScheduleStep: View {
    @Binding var userProfile: UserProfile
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("Training Schedule")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("How often can you train?")
                .font(.subheadline)
                .foregroundColor(.white)
            
            VStack(spacing: 20) {
                ScheduleSelector(
                    title: "Days per week",
                    value: $userProfile.daysPerWeek,
                    range: 1...7,
                    unit: "Days"
                )
                
                ScheduleSelector(
                    title: "Minutes per session",
                    value: $userProfile.minutesPerSession,
                    range: 15...120,
                    step: 5,
                    unit: "Min"
                )
            }
            .padding(.horizontal)
            
            Spacer()
        }
    }
}

struct ScheduleSelector: View {
    let title: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let step: Int
    let unit: String // e.g., "days", "min"
    
    init(title: String, value: Binding<Int>, range: ClosedRange<Int>, step: Int = 1, unit: String) {
        self.title = title
        self._value = value
        self.range = range
        self.step = step
        self.unit = unit
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Title
            Text(title)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
            
            // Main interactive element
            HStack(spacing: 16) {
                // Minus Button
                Button(action: {
                    value = max(range.lowerBound, value - step)
                }) {
                    Image(systemName: "minus")
                }
                .buttonStyle(StepperButtonStyle())
                .disabled(value <= range.lowerBound)
                
                // Digital Display
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(value)")
                        .font(.system(size: 48, weight: .bold, design: .monospaced))
                        .contentTransition(.numericText())
                    
                    Text(unit)
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.6))
                        .padding(.top, 8)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(
                    Color.black.opacity(0.2)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                
                // Plus Button
                Button(action: {
                    value = min(range.upperBound, value + step)
                }) {
                    Image(systemName: "plus")
                }
                .buttonStyle(StepperButtonStyle())
                .disabled(value >= range.upperBound)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.evolvePrimary.opacity(0.3), lineWidth: 1)
                )
        )
        .animation(.spring(response: 0.4, dampingFraction: 0.6), value: value)
    }
}
