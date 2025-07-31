import SwiftUI

// MARK: - Exercise Row
struct ExerciseRowView: View {
    let exercise: Exercise
    let workoutExercise: WorkoutExercise?
    let isCompleted: Bool
    let canModify: Bool
    let onToggleCompletion: () -> Void
    let onShowDetail: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggleCompletion) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(isCompleted ? .green : .evolveMuted)
            }
            .disabled(!canModify)
            VStack(alignment: .leading, spacing: 4) {
                Text(exercise.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.evolveText)
                if let workoutExercise = workoutExercise {
                    Text("\(workoutExercise.sets) sets × \(workoutExercise.reps) reps")
                        .font(.caption)
                        .foregroundColor(.evolveMuted)
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
                .fill(isCompleted ? Color.green.opacity(0.1) : Color.evolveCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCompleted ? Color.green.opacity(0.3) : Color.clear, lineWidth: 1)
        )
        .opacity(canModify ? 1.0 : 0.6)
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