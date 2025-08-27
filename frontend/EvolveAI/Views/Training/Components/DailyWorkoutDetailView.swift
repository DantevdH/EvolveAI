import SwiftUI

struct DailyWorkoutDetailView: View {
    @ObservedObject var viewModel: TrainingViewModel
    @ObservedObject var userManager: UserManager
    @ObservedObject var workoutManager: WorkoutManager
    let currentWeek: Int
    
    var body: some View {
        VStack(spacing: 0) {
            if let workout = viewModel.selectedDayWorkout {
                VStack(spacing: 16) {
                    // Day header
                    HStack {
                        Text(workout.dayOfWeek)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.evolveText)
                        
                        Spacer()
                        
                        // Show past week indicator
                        if !canModifyWorkout && !viewModel.isRestDay(workout) {
                            HStack(spacing: 4) {
                                Image(systemName: "lock.fill")
                                    .font(.caption)
                                Text("Past Week")
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(.evolveMuted)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.evolveMuted.opacity(0.2))
                            )
                        }
                    }
                    
                    // Content
                    if viewModel.isRestDay(workout) {
                        RestDayView()
                    } else {
                        VStack(spacing: 12) {
                            let exercises = viewModel.getExercisesForWorkout(workout)
                            ForEach(exercises, id: \.id) { exercise in
                                let workoutExercise = viewModel.getWorkoutExerciseDetails(for: exercise.id, in: workout)
                                ExerciseRowView(
                                    exercise: exercise,
                                    workoutExercise: workoutExercise,
                                    isCompleted: viewModel.isExerciseCompleted(exercise.id),
                                    canModify: canModifyWorkout,
                                    onShowDetail: {
                                        viewModel.showExerciseDetail(exercise)
                                    },
                                    onUpdateSet: { setIndex, reps, weight in
                                        viewModel.updateSetDetails(
                                            exerciseId: exercise.id,
                                            setIndex: setIndex,
                                            reps: reps,
                                            weight: weight
                                        )
                                    },
                                    onToggleCompletion: {
                                        viewModel.toggleExerciseCompletion(exercise.id)
                                    }
                                )
                            }
                            
                            // Workout completion status (automatic, no button)
                            if !viewModel.isRestDay(workout) {
                                HStack {
                                    if viewModel.isWorkoutCompleted(workout.id) {
                                        HStack(spacing: 8) {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.green)
                                            Text("Workout Complete")
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(.green)
                                        }
                                    } else {
                                        HStack(spacing: 8) {
                                            Image(systemName: "circle")
                                                .foregroundColor(.evolveMuted)
                                            Text("Workout Incomplete")
                                                .font(.subheadline)
                                                .foregroundColor(.evolveMuted)
                                        }
                                    }
                                    Spacer()
                                }
                                .padding(.top, 8)
                            }
                        }
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.evolveCard)
                )
                .padding(.horizontal)
                .padding(.top, 8)
            }
        }
    }
    
    private var canModifyWorkout: Bool {
        viewModel.currentWeekNumber >= currentWeek
    }
} 