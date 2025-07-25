// MARK: - Subviews
import SwiftUI

struct TrainingHeaderView: View {
    let workoutPlan: WorkoutPlan
    @ObservedObject var viewModel: TrainingViewModel
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text(workoutPlan.title)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.evolveText)
                        .minimumScaleFactor(0.6) // Scale down to 60% if needed
                        .lineLimit(1) // Keep on single line but scale instead of truncate
                    
                    Text(workoutPlan.summary)
                        .font(.subheadline)
                        .italic() // Make description italic
                        .foregroundColor(.evolveMuted)
                        .lineLimit(2)
                }
                
                Spacer()
                
                ProgressRingView(progress: weekProgress)
            }
            
            // Week progress summary
            HStack {
                Text("Week \(viewModel.currentWeekNumber) of \(viewModel.totalWeeks)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.evolveMuted)
                
                Spacer()
                
                Text("\(completedWorkoutsThisWeek)/\(totalWorkoutsThisWeek) workouts")
                    .font(.subheadline)
                    .foregroundColor(.evolveMuted)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
        )
        .padding(.horizontal)
        .padding(.top)
    }
    
    private var weekProgress: Double {
        guard totalWorkoutsThisWeek > 0 else { return 0 }
        return Double(completedWorkoutsThisWeek) / Double(totalWorkoutsThisWeek)
    }
    
    private var completedWorkoutsThisWeek: Int {
        guard let week = viewModel.currentWeek else { return 0 }
        return week.daily_workouts.filter { workout in
            !workout.isRestDay && viewModel.isWorkoutCompleted(workout.id)
        }.count
    }
    
    private var totalWorkoutsThisWeek: Int {
        guard let week = viewModel.currentWeek else { return 0 }
        return week.daily_workouts.filter { !$0.isRestDay }.count
    }
}