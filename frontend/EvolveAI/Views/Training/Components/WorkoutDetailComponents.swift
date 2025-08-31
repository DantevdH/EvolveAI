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
                        
                        Spacer()
                        
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
    @State private var selectedTab: ExerciseTab = .general
    
    enum ExerciseTab: String, CaseIterable {
        case general = "General Info"
        case instructions = "Instructions"
        case history = "History"
        
        var icon: String {
            switch self {
            case .general: return "info.circle.fill"
            case .instructions: return "list.bullet"
            case .history: return "chart.line.uptrend.xyaxis"
            }
        }
    }
    
    var body: some View {
        ZStack {
            // Background with blur effect
            Color.black.opacity(0.7)
                .ignoresSafeArea(.all)
                .onTapGesture {
                    presentationMode.wrappedValue.dismiss()
                }
            
            // Exercise detail popup
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 24) {
                    HStack {
                        Text(exercise.name)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Button(action: {
                            presentationMode.wrappedValue.dismiss()
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundColor(.evolveMuted)
                        }
                    }
                }
                
                // Add extra vertical spacing
                Spacer()
                    .frame(height: 20)
                
                // Tab Switcher
                TabSwitcherView(selectedTab: $selectedTab)
                
                // Tab Content
                TabView(selection: $selectedTab) {
                    GeneralInfoTab(exercise: exercise)
                        .tag(ExerciseTab.general)
                    
                    InstructionsTab(exercise: exercise)
                        .tag(ExerciseTab.instructions)
                    
                    HistoryTab(exercise: exercise)
                        .tag(ExerciseTab.history)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.evolveBackground)
                    .shadow(color: .black.opacity(0.3), radius: 25, x: 0, y: 15)
            )
            .frame(maxWidth: 380, maxHeight: 600)
        }
        .background(ClearBackgroundView())
    }
}

// MARK: - Tab Switcher
struct TabSwitcherView: View {
    @Binding var selectedTab: ExerciseDetailView.ExerciseTab
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(ExerciseDetailView.ExerciseTab.allCases, id: \.self) { tab in
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        selectedTab = tab
                    }
                }) {
                    VStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(selectedTab == tab ? .evolvePrimary : .evolveMuted)
                        
                        Text(tab.rawValue)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(selectedTab == tab ? .evolvePrimary : .evolveMuted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.clear)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.evolveCard)
        )
        .padding(.horizontal, 4)
    }
    
    @Namespace private var namespace
}

// MARK: - General Info Tab
struct GeneralInfoTab: View {
    let exercise: Exercise
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Exercise Details Section
                VStack(spacing: 16) {
                    // Target Area and Difficulty
                    HStack(spacing: 16) {
                        if let targetArea = exercise.target_area {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Target Area")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.evolveMuted)
                                Text(targetArea)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.evolvePrimary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(Color.evolvePrimary.opacity(0.1))
                                    )
                            }
                        }
                        
                        if let difficulty = exercise.difficulty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Difficulty")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.evolveMuted)
                                Text(difficulty)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(difficultyColor(difficulty))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(difficultyColor(difficulty).opacity(0.1))
                                    )
                            }
                        }
                        
                        Spacer()
                    }
                    
                    // Equipment and Tier
                    HStack(spacing: 16) {
                        if let equipment = exercise.equipment {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Equipment")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.evolveMuted)
                                Text(equipment)
                                    .font(.subheadline)
                                    .foregroundColor(.evolveText)
                            }
                        }
                        
                        if let tier = exercise.exercise_tier {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Exercise Tier")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.evolveMuted)
                                Text(tier.capitalized)
                                    .font(.subheadline)
                                    .foregroundColor(.evolveText)
                            }
                        }
                        
                        Spacer()
                    }
                }
                
                                // Muscles Worked
                if let mainMuscles = exercise.main_muscles, !mainMuscles.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Image(systemName: "figure.strengthtraining.traditional")
                                .font(.subheadline)
                                .foregroundColor(.evolvePrimary)
                            
                            Text("Muscles Worked")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(.evolveText)
                        }
                        
                        VStack(spacing: 16) {
                            // Primary Muscles
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    // Image(systemName: "star.fill")
                                    //     .font(.caption)
                                    //     .foregroundColor(.yellow)
                                    Text("Primary Muscles")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.evolveText)
                                }
                                
                                LazyVStack(alignment: .leading, spacing: 6) {
                                    ForEach(mainMuscles, id: \.self) { muscle in
                                        Text(muscle)
                                            .font(.caption)
                                            .fontWeight(.medium)
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .fill(Color.evolvePrimary)
                                            )
                                    }
                                }
                            }
                            
                            // Secondary Muscles
                            if let secondaryMuscles = exercise.secondary_muscles, !secondaryMuscles.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                    
                                        Text("Secondary Muscles")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.evolveText)
                                    }
                                    
                                    LazyVStack(alignment: .leading, spacing: 6) {
                                        ForEach(secondaryMuscles, id: \.self) { muscle in
                                            Text(muscle)
                                                .font(.caption)
                                                .fontWeight(.medium)
                                                .foregroundColor(.white)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .fill(Color.evolvePrimary.opacity(0.2))
                                                )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.evolveCard)
                    )
                }
                

            }
            .padding(.horizontal, 4)
            .padding(.top, 20)
        }
    }
    
    // Helper function for difficulty colors
    private func difficultyColor(_ difficulty: String) -> Color {
        switch difficulty.lowercased() {
        case "beginner":
            return .green
        case "intermediate":
            return .orange
        case "advanced":
            return .red
        default:
            return .evolvePrimary
        }
    }
}

// MARK: - Instructions Tab
struct InstructionsTab: View {
    let exercise: Exercise
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Exercise Instructions
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "list.bullet")
                            .font(.subheadline)
                            .foregroundColor(.evolvePrimary)
                        
                        Text("Step-by-Step Instructions")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("1. Start in a standing position with feet shoulder-width apart")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                        
                        Text("2. Hold the weight at chest level with both hands")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                        
                        Text("3. Lower your body by bending at the knees and hips")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                        
                        Text("4. Keep your back straight and chest up throughout the movement")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                        
                        Text("5. Return to the starting position by pushing through your heels")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                    }
                    .padding(.leading, 8)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
                
                // Video Guide
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "play.circle.fill")
                            .font(.subheadline)
                            .foregroundColor(.evolvePrimary)
                        
                        Text("Video Demonstration")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                    }
                    
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveBackground)
                        .frame(height: 200)
                        .overlay(
                            VStack(spacing: 12) {
                                Image(systemName: "play.circle")
                                    .font(.system(size: 48))
                                    .foregroundColor(.evolvePrimary)
                                Text("Exercise Demonstration")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.evolveMuted)
                                Text("Tap to play video guide")
                                    .font(.caption)
                                    .foregroundColor(.evolveMuted.opacity(0.8))
                            }
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.evolvePrimary.opacity(0.3), lineWidth: 1)
                        )
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
                
                // Tips Section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "lightbulb.fill")
                            .font(.subheadline)
                            .foregroundColor(.yellow)
                        
                        Text("Pro Tips")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("• Keep your core engaged throughout the movement")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                        
                        Text("• Breathe steadily - exhale on the way up")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                        
                        Text("• Focus on form over weight initially")
                            .font(.subheadline)
                            .foregroundColor(.evolveText)
                    }
                    .padding(.leading, 8)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
            }
            .padding(.horizontal, 4)
            .padding(.top, 20)
        }
    }
}

// MARK: - History Tab
struct HistoryTab: View {
    let exercise: Exercise
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Progress Chart Placeholder
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.subheadline)
                            .foregroundColor(.evolvePrimary)
                        
                        Text("Progress Over Time")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                    }
                    
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveBackground)
                        .frame(height: 180)
                        .overlay(
                            VStack(spacing: 12) {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .font(.system(size: 48))
                                    .foregroundColor(.evolvePrimary)
                                Text("Progress Chart")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.evolveMuted)
                                Text("Your performance data will appear here")
                                    .font(.caption)
                                    .foregroundColor(.evolveMuted.opacity(0.8))
                            }
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.evolvePrimary.opacity(0.3), lineWidth: 1)
                        )
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
                
                // Recent Workouts
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.subheadline)
                            .foregroundColor(.evolvePrimary)
                        
                        Text("Recent Workouts")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                    }
                    
                    VStack(spacing: 12) {
                        // Placeholder workout entries
                        ForEach(1...3, id: \.self) { index in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Workout \(index)")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.evolveText)
                                    Text("\(3 - index) days ago")
                                        .font(.caption)
                                        .foregroundColor(.evolveMuted)
                                }
                                
                                Spacer()
                                
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text("3 sets × 12 reps")
                                        .font(.subheadline)
                                        .foregroundColor(.evolveText)
                                    Text("45 kg")
                                        .font(.caption)
                                        .foregroundColor(.evolvePrimary)
                                }
                            }
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.evolveBackground)
                            )
                        }
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
                
                // Personal Records
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "trophy.fill")
                            .font(.subheadline)
                            .foregroundColor(.yellow)
                        
                        Text("Personal Records")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                    }
                    
                    HStack(spacing: 20) {
                        VStack(spacing: 8) {
                            Text("1RM")
                                .font(.caption)
                                .foregroundColor(.evolveMuted)
                            Text("60 kg")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.evolvePrimary)
                        }
                        
                        VStack(spacing: 8) {
                            Text("Max Reps")
                                .font(.caption)
                                .foregroundColor(.evolveMuted)
                            Text("15")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.evolvePrimary)
                        }
                        
                        VStack(spacing: 8) {
                            Text("Max Weight")
                                .font(.caption)
                                .foregroundColor(.evolveMuted)
                            Text("55 kg")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.evolvePrimary)
                        }
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
            }
            .padding(.horizontal, 4)
            .padding(.top, 20)
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