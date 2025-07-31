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
                                    onToggleCompletion: {
                                        viewModel.toggleExerciseCompletion(
                                            exerciseId: exercise.id,
                                            userManager: userManager,
                                            workoutManager: workoutManager
                                        )
                                    },
                                    onShowDetail: {
                                        viewModel.showExerciseDetail(exercise)
                                    }
                                )
                            }
                            
                            // Complete Workout Button - moved below exercise cards
                            if canModifyWorkout {
                                Button(action: {
                                    viewModel.markWorkoutComplete(workout, userManager: userManager, workoutManager: workoutManager)
                                }) {
                                    HStack(spacing: 8) {
                                        
                                        Text(viewModel.isWorkoutCompleted(workout.id) ? "Mark Incomplete" : "Complete Workout")
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                }
                                .buttonStyle(PrimaryButtonStyle())
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