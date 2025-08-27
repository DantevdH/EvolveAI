import SwiftUI

// MARK: - Exercise Row
struct ExerciseRowView: View {
    let exercise: Exercise
    let workoutExercise: WorkoutExercise?
    let isCompleted: Bool
    let canModify: Bool
    let onShowDetail: () -> Void
    let onUpdateSet: (Int, Int, Double?) -> Void // (setIndex, reps, weight)
    let onToggleCompletion: () -> Void // Toggle exercise completion
    
    @State private var isExpanded = false
    @State private var showingSetDetail = false
    @State private var selectedSetIndex = 0
    @State private var showing1RMCalculator = false
    @State private var calculatedWeightPerSet: [Double?] = []
    
    var body: some View {
        VStack(spacing: 0) {
            // Main exercise row
            HStack(spacing: 12) {
                // Completion status indicator (tappable)
                Button(action: {
                    if canModify {
                        onToggleCompletion()
                    }
                }) {
                    Circle()
                        .frame(width: 24, height: 24)
                        .foregroundColor(isCompleted ? .evolvePrimary : .evolvePrimary.opacity(0.3))
                        .overlay(
                            Group {
                                if isCompleted {
                                    Image(systemName: "checkmark")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                } else {
                                    Circle()
                                        .fill(Color.white)
                                        .frame(width: 4, height: 4)
                                }
                            }
                        )
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(!canModify)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(exercise.name)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.evolveText)
                        
                        // 1RM Calculator Button (exercise-specific)
                        if canModify {
                            Button(action: {
                                showing1RMCalculator = true
                            }) {
                                Image(systemName: "function")
                                    .font(.caption)
                                    .foregroundColor(.evolvePrimary)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    
                    if let workoutExercise = workoutExercise {
                        HStack(spacing: 8) {
                            Text("\(workoutExercise.sets) sets")
                                .font(.caption)
                                .foregroundColor(.evolveMuted)
                            
                            Button(action: {
                                isExpanded.toggle()
                            }) {
                                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                    .font(.caption)
                                    .foregroundColor(.evolvePrimary)
                                }
                                .disabled(!canModify)
                        }
                    }
                }
                
                Spacer()
                
                Button(action: onShowDetail) {
                    Image(systemName: "info.circle")
                        .font(.title3)
                        .foregroundColor(.evolvePrimary)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.evolveCard)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.clear, lineWidth: 1)
            )
            .opacity(canModify ? 1.0 : 0.6)
            .fullScreenCover(isPresented: $showing1RMCalculator) {
                ZStack {
                    // Background with blur effect
                    Color.black.opacity(0.7)
                        .ignoresSafeArea(.all)
                        .onTapGesture {
                            showing1RMCalculator = false
                        }
                    
                    // Calculator popup
                    OneRMCalculatorView(
                        exerciseName: exercise.name,
                        onCalculate: { estimated1RM in
                            // Calculate weights for each set based on 1RM and weight_1rm percentage
                            updateSetWeightsBasedOn1RM(estimated1RM, workoutExercise: workoutExercise)
                            showing1RMCalculator = false
                        }
                    )
                }
                .background(ClearBackgroundView())
            }
            
            // Expanded sets detail
            if isExpanded, let workoutExercise = workoutExercise, canModify {
                VStack(spacing: 8) {
                    // Set management header
                    HStack {
                        Text("Sets")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.evolveMuted)
                        
                        Spacer()
                        
                        // Add/Remove set buttons
                        HStack(spacing: 8) {
                            Button(action: {
                                onUpdateSet(-1, 0, nil) // -1 indicates add set
                            }) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title3)
                                    .foregroundColor(.evolvePrimary)
                            }
                            
                            Button(action: {
                                onUpdateSet(-2, 0, nil) // -2 indicates remove set
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .font(.title3)
                                    .foregroundColor(.evolvePrimary)
                            }
                            .disabled(workoutExercise.sets <= 1)
                        }
                    }
                    .padding(.horizontal, 4)
                    
                    ForEach(0..<workoutExercise.sets, id: \.self) { setIndex in
                        SetRowView(
                            setNumber: setIndex + 1,
                            reps: workoutExercise.reps[setIndex],
                            weight: workoutExercise.weight[setIndex],
                            weight1rm: setIndex < workoutExercise.weight1rm.count ? workoutExercise.weight1rm[setIndex] : 80, // Pass specific weight1rm for this set
                            calculatedWeight: setIndex < calculatedWeightPerSet.count ? calculatedWeightPerSet[setIndex] : nil,
                            onUpdate: { reps, weight in
                                onUpdateSet(setIndex, reps, weight)
                            }
                        )
                        .id("\(setIndex)-\(calculatedWeightPerSet.count)-\(setIndex < calculatedWeightPerSet.count ? (calculatedWeightPerSet[setIndex] ?? 0) : 0)")
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 12)
                .background(
                    RoundedRectangle(cornerRadius: 0)
                        .fill(Color.evolveCard.opacity(0.5))
                )
            }
        }
    }
    
    private func updateSetWeightsBasedOn1RM(_ estimated1RM: Double, workoutExercise: WorkoutExercise?) {
        print("🧮 updateSetWeightsBasedOn1RM called with 1RM: \(estimated1RM)")
        
        guard let workoutExercise = workoutExercise else {
            print("❌ Failed to get workoutExercise")
            return
        }
        
        // Calculate weights for each set based on their individual weight1rm percentages
        calculatedWeightPerSet = []
        
        for setIndex in 0..<workoutExercise.sets {
            let weight1rmPercentage = setIndex < workoutExercise.weight1rm.count ? workoutExercise.weight1rm[setIndex] : 80
            
            // Calculate the target weight based on percentage of 1RM
            let targetWeight = estimated1RM * (Double(weight1rmPercentage) / 100.0)
            
            // Round to nearest 0.5
            let roundedWeight = round(targetWeight * 2) / 2
            
            calculatedWeightPerSet.append(roundedWeight)
            
            print("⚖️ Set \(setIndex + 1): \(weight1rmPercentage)% 1RM = \(roundedWeight) kg")
        }
        
        print("📊 Updated calculatedWeightPerSet: \(calculatedWeightPerSet)")
        
        // Update all sets with their calculated weights
        for setIndex in 0..<workoutExercise.sets {
            onUpdateSet(setIndex, workoutExercise.reps[setIndex], calculatedWeightPerSet[setIndex])
        }
    }
}

// MARK: - Set Row View
struct SetRowView: View {
    let setNumber: Int
    let reps: Int
    let weight: Double?
    let weight1rm: Int  // Weight as percentage of 1RM for this specific set
    let calculatedWeight: Double? // Calculated weight from 1RM
    let onUpdate: (Int, Double?) -> Void
    
    @State private var currentReps: Int
    @State private var currentWeight: Double?
    
    init(setNumber: Int, reps: Int, weight: Double?, weight1rm: Int = 80, calculatedWeight: Double? = nil, onUpdate: @escaping (Int, Double?) -> Void) {
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
        self.weight1rm = weight1rm
        self.calculatedWeight = calculatedWeight
        self.onUpdate = onUpdate
        self._currentReps = State(initialValue: reps)
        self._currentWeight = State(initialValue: weight)
    }
    
    private var placeholderText: String {
        if let calculatedWeight = calculatedWeight {
            // Use calculated weight (rounded to .5) as placeholder
            return String(format: "%.1f", calculatedWeight)
        } else {
            // Use weight1rm percentage as placeholder
            return "\(weight1rm)% 1RM"
        }
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Set number
            Text("Set \(setNumber)")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.evolveMuted)
                .frame(width: 40, alignment: .leading)
            
            // Reps controls
            HStack(spacing: 8) {
                Button(action: {
                    if currentReps > 1 {
                        currentReps -= 1
                        onUpdate(currentReps, currentWeight)
                    }
                }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title3)
                        .foregroundColor(.evolvePrimary)
                }
                
                Text("\(currentReps)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.evolveText)
                    .frame(minWidth: 30)
                    .multilineTextAlignment(.center)
                
                Button(action: {
                    currentReps += 1
                    onUpdate(currentReps, currentWeight)
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundColor(.evolvePrimary)
                }
            }
            
            Spacer()
            
            // Weight input
            HStack(spacing: 8) {
                TextField(placeholderText, value: $currentWeight, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 80)
                    .font(.caption)
                    .italic()
                    .onChange(of: currentWeight) { newWeight in
                        onUpdate(currentReps, newWeight)
                    }
                
                Text("kg")
                    .font(.caption)
                    .foregroundColor(.evolveMuted)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.evolveBackground)
        )
    }
}

// MARK: - Rest Day
struct RestDayView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "moon.zzz")
                .font(.system(size: 48))
                .foregroundColor(.purple)
            Text("Rest Day")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.evolveText)
            Text("Take this day to recover and prepare for your next workout. Light stretching or a gentle walk is perfectly fine.")
                .font(.subheadline)
                .foregroundColor(.evolveMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.purple.opacity(0.1))
        )
    }
}

// MARK: - Progress Ring
struct ProgressRingView: View {
    let progress: Double
    var body: some View {
        ZStack {
            Circle()
                .stroke(lineWidth: 4)
                .opacity(0.3)
                .foregroundColor(.evolvePrimary)
            Circle()
                .trim(from: 0.0, to: CGFloat(min(progress, 1.0)))
                .stroke(style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                .foregroundColor(.evolvePrimary)
                .rotationEffect(Angle(degrees: 270.0))
                .animation(.linear, value: progress)
            Text("\(Int(progress * 100))%")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.evolveText)
        }
        .frame(width: 44, height: 44)
    }
}

// MARK: - Exercise Detail
struct ExerciseDetailView: View {
    let exercise: Exercise
    @Environment(\.presentationMode) var presentationMode
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(exercise.name)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.evolveText)
                    if let description = exercise.description, !description.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Description")
                                .font(.headline)
                                .foregroundColor(.evolveText)
                            Text(description)
                                .font(.body)
                                .foregroundColor(.evolveMuted)
                        }
                    }
                    if let videoURL = exercise.video_url, !videoURL.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Video Guide")
                                .font(.headline)
                                .foregroundColor(.evolveText)
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.evolveBackground)
                                .frame(height: 200)
                                .overlay(
                                    VStack {
                                        Image(systemName: "play.circle")
                                            .font(.system(size: 48))
                                            .foregroundColor(.evolvePrimary)
                                        Text("Video Guide")
                                            .font(.subheadline)
                                            .foregroundColor(.evolveMuted)
                                    }
                                )
                        }
                    }
                    Spacer()
                }
                .padding()
            }
            .background(Color.evolveBackground.ignoresSafeArea())
            .navigationTitle("Exercise Details")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Done") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
}

// MARK: - Clear Background View for Transparent Modal
struct ClearBackgroundView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        DispatchQueue.main.async {
            view.superview?.superview?.backgroundColor = .clear
        }
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {}
}

// MARK: - 1RM Calculator View
struct OneRMCalculatorView: View {
    let exerciseName: String
    let onCalculate: (Double) -> Void
    
    @State private var weight: Double = 0
    @State private var reps: Int = 0
    @State private var estimated1RM: Double?
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "function")
                        .font(.title2)
                        .foregroundColor(.evolvePrimary)
                    
                    Text("1RM Calculator")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.evolveText)
                }
                
                Text(exerciseName)
                    .font(.subheadline)
                    .foregroundColor(.evolvePrimary)
                    .multilineTextAlignment(.center)
            }
            
            // Input Form
            VStack(spacing: 16) {
                // Weight and Reps inputs
                HStack(spacing: 20) {
                    // Weight Input
                    VStack(spacing: 6) {
                        Text("Weight")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.evolveMuted)
                        
                        HStack(spacing: 6) {
                            TextField("0", value: $weight, format: .number)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .frame(width: 70)
                                .multilineTextAlignment(.center)
                            
                            Text("kg")
                                .font(.caption)
                                .foregroundColor(.evolveMuted)
                        }
                    }
                    
                    // Reps Input
                    VStack(spacing: 6) {
                        Text("Reps")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.evolveMuted)
                        
                        HStack(spacing: 6) {
                            TextField("0", value: $reps, format: .number)
                                .keyboardType(.numberPad)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .frame(width: 60)
                                .multilineTextAlignment(.center)
                            
                            Text("reps")
                                .font(.caption)
                                .foregroundColor(.evolveMuted)
                        }
                    }
                }
                
                // Calculate Button
                Button(action: calculate1RM) {
                    HStack(spacing: 8) {
                        Image(systemName: "function")
                            .font(.subheadline)
                        Text("Calculate 1RM")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.evolvePrimary)
                    )
                }
                .disabled(weight <= 0 || reps <= 0)
                .opacity((weight > 0 && reps > 0) ? 1.0 : 0.6)
            }
            
            // Result Display
            if let estimated1RM = estimated1RM {
                VStack(spacing: 12) {
                    VStack(spacing: 8) {
                        Text("Estimated 1RM")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.evolveMuted)
                        
                        Text("\(Int(estimated1RM)) kg")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.evolvePrimary)
                        
                        Text("Brzycki Formula")
                            .font(.caption2)
                            .foregroundColor(.evolveMuted)
                            .italic()
                    }
                    
                    // Apply calculated weights with small arrow button
                    HStack {
                        Text("Tap to apply")
                            .font(.caption)
                            .foregroundColor(.evolveMuted)
                        
                        Button(action: {
                            onCalculate(estimated1RM)
                        }) {
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.title2)
                                .foregroundColor(.evolvePrimary)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveBackground)
                .shadow(color: .black.opacity(0.2), radius: 20, x: 0, y: 10)
        )
        .frame(maxWidth: 320)
    }
    
    private func calculate1RM() {
        // Brzycki Formula: 1RM = weight lifted / (1.0278 - 0.0278 × reps)
        if weight > 0 && reps > 0 {
            let denominator = 1.0278 - (0.0278 * Double(reps))
            if denominator > 0 {
                estimated1RM = weight / denominator
            }
        }
    }
} 