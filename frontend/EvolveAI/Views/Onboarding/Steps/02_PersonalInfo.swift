//
//  02_PersonalInfo.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

// A custom styled gender selector
struct GenderSelector: View {
    @Binding var selection: String
    private let options = ["Male", "Female", "Other"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gender")
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
            
            HStack(spacing: 12) {
                ForEach(options, id: \.self) { option in
                    Button(action: {
                        selection = option
                    }) {
                        Text(option)
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(GenderButtonStyle(isSelected: selection == option))
                }
            }
        }
    }
}

#if canImport(UIKit)
extension View {
    func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
#endif

struct PersonalInfoStep: View {
    @Binding var userProfile: UserProfile
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer()
                
                Text("Personal Information")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                
                Text("This helps us personalize your fitness plan")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                VStack(spacing: 20) {
                    StyledTextField(title: "Age", value: Binding(
                        get: { String(userProfile.age) },
                        set: { userProfile.age = Int($0) ?? userProfile.age }
                    ), unit: "years")
                    
                    // --- MODIFICATION: Uses new onChange syntax for correct conversion ---
                    MeasurementField(
                        title: "Weight",
                        value: $userProfile.weight,
                        unit: $userProfile.weightUnit,
                        units: ["kg", "lbs"]
                    )
                    .onChange(of: userProfile.weightUnit) { oldValue, newValue in
                        userProfile.weight = convertWeight(value: userProfile.weight, from: oldValue, to: newValue)
                    }
                    
                    MeasurementField(
                        title: "Height",
                        value: $userProfile.height,
                        unit: $userProfile.heightUnit,
                        units: ["cm", "in"]
                    )
                    .onChange(of: userProfile.heightUnit) { oldValue, newValue in
                        userProfile.height = convertHeight(value: userProfile.height, from: oldValue, to: newValue)
                    }
                    
                    GenderSelector(selection: $userProfile.gender)
                }
                .padding()
                
                Spacer()
            }
        }
        .background(Color.black.opacity(0.001)) // Allows scroll while tapping outside keyboard
        .onTapGesture {
            hideKeyboard()
        }
    }
    
    // --- NEW: Corrected helper functions for unit conversion ---
    private func convertWeight(value: Double, from oldUnit: String, to newUnit: String) -> Double {
        if oldUnit == "lbs" && newUnit == "kg" { return value * 0.453592 }
        if oldUnit == "kg" && newUnit == "lbs" { return value / 0.453592 }
        return value
    }
    
    private func convertHeight(value: Double, from oldUnit: String, to newUnit: String) -> Double {
        if oldUnit == "in" && newUnit == "cm" { return value * 2.54 }
        if oldUnit == "cm" && newUnit == "in" { return value / 2.54 }
        return value
    }
}

// --- MODIFIED: MeasurementField now uses the UnitToggle ---
struct MeasurementField: View {
    let title: String
    @Binding var value: Double
    @Binding var unit: String
    let units: [String]
    var keyboardType: UIKeyboardType = .decimalPad
    
    @State private var stringValue: String
    
    init(title: String, value: Binding<Double>, unit: Binding<String>, units: [String], keyboardType: UIKeyboardType = .decimalPad) {
        self.title = title
        self._value = value
        self._unit = unit
        self.units = units
        self.keyboardType = keyboardType
        self._stringValue = State(initialValue: String(format: "%.1f", value.wrappedValue))
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
            
            HStack {
                TextField("", text: $stringValue)
                    .font(.system(.title, design: .monospaced).weight(.bold))
                    .foregroundColor(.white)
                    .keyboardType(keyboardType)
                    .onChange(of: stringValue) {
                        value = Double(stringValue) ?? 0
                    }
                    .onChange(of: value) {
                        let formattedValue = String(format: "%.1f", value)
                        if stringValue != formattedValue {
                            stringValue = formattedValue
                        }
                    }
                
                UnitToggle(unit: $unit, options: units)
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
    
// --- NEW: A custom toggle switch for units ---
struct UnitToggle: View {
    @Binding var unit: String
    let options: [String]
    
    private var isFirstOption: Bool { unit == options.first }
    
    var body: some View {
        HStack(spacing: 0) {
            Text(options[0])
                .fontWeight(.bold)
                .foregroundColor(isFirstOption ? .white : .white.opacity(0.5))
                .frame(width: 50)
                .onTapGesture { unit = options[0] }
            
            Text(options[1])
                .fontWeight(.bold)
                .foregroundColor(!isFirstOption ? .white : .white.opacity(0.5))
                .frame(width: 50)
                .onTapGesture { unit = options[1] }
        }
        .padding(4)
        .background(
            ZStack(alignment: isFirstOption ? .leading : .trailing) {
                Capsule()
                    .fill(Color.black.opacity(0.3))
                
                Capsule()
                    .fill(Color.evolvePrimary)
                    .frame(width: 50)
            }
        )
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isFirstOption)
    }
}



