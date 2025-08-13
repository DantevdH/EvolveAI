//
//  02_PersonalInfo.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI



struct PersonalInfoStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer()
                
                Text("Personal Information")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                    .dynamicTypeSize(.large ... .accessibility3)
                
                Text("This helps us personalize your fitness plan")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                VStack(spacing: 20) {
                    StyledTextField(title: "Age", value: Binding(
                        get: { String(viewModel.userProfile.age) },
                        set: { viewModel.userProfile.age = Int($0) ?? viewModel.userProfile.age }
                    ), unit: "years")
                    
                    MeasurementField(
                        title: "Weight",
                        value: $viewModel.userProfile.weight,
                        unit: $viewModel.userProfile.weightUnit,
                        units: ["kg", "lbs"]
                    )
                    .onChange(of: viewModel.userProfile.weightUnit) { _, newValue in
                        let oldUnit = viewModel.userProfile.weightUnit
                        viewModel.userProfile.weight = viewModel.convertWeight(value: viewModel.userProfile.weight, from: oldUnit, to: newValue)
                    }
                    
                    MeasurementField(
                        title: "Height",
                        value: $viewModel.userProfile.height,
                        unit: $viewModel.userProfile.heightUnit,
                        units: ["cm", "in"]
                    )
                    .onChange(of: viewModel.userProfile.heightUnit) { _, newValue in
                        let oldUnit = viewModel.userProfile.heightUnit
                        viewModel.userProfile.height = viewModel.convertHeight(value: viewModel.userProfile.height, from: oldUnit, to: newValue)
                    }
                    
                    GenderSelector(selection: $viewModel.userProfile.gender)
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

                    .onChange(of: stringValue) { _, newValue in
                        value = Double(newValue) ?? 0
                    }
                    .onChange(of: value) { _, newValue in
                        let formattedValue = String(format: "%.1f", newValue)
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
    
    private var unitToggleBackground: some View {
        ZStack {
            Capsule()
                .fill(Color.black.opacity(0.3))
            
            Capsule()
                .fill(Color.evolvePrimary)
                .frame(width: 50)
                .offset(x: isFirstOption ? -25 : 25)
        }
    }
    
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
        .background(unitToggleBackground)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isFirstOption)
    }
}


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
