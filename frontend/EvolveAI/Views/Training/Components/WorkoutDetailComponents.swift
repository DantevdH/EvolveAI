import SwiftUI

// MARK: - Exercise Row
struct ExerciseRowView: View {
    let exercise: Exercise
    let workoutExercise: WorkoutExercise?
    let isCompleted: Bool
    let canModify: Bool
    let onShowDetail: () -> Void
    let onUpdateSet: (Int, Int, Double?) -> Void // (setIndex, reps, weight)
    
    @State private var isExpanded = false
    @State private var showingSetDetail = false
    @State private var selectedSetIndex = 0
    
    var body: some View {
        VStack(spacing: 0) {
            // Main exercise row
            HStack(spacing: 12) {
                // Completion status indicator (same style as "This Week")
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
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(exercise.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.evolveText)
                    
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
                            onUpdate: { reps, weight in
                                onUpdateSet(setIndex, reps, weight)
                            }
                        )
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
}

// MARK: - Set Row View
struct SetRowView: View {
    let setNumber: Int
    let reps: Int
    let weight: Double?
    let onUpdate: (Int, Double?) -> Void
    
    @State private var currentReps: Int
    @State private var currentWeight: Double?
    
    init(setNumber: Int, reps: Int, weight: Double?, onUpdate: @escaping (Int, Double?) -> Void) {
        self.setNumber = setNumber
        self.reps = reps
        self.weight = weight
        self.onUpdate = onUpdate
        self._currentReps = State(initialValue: reps)
        self._currentWeight = State(initialValue: weight)
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
                TextField("0", value: $currentWeight, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 60)
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