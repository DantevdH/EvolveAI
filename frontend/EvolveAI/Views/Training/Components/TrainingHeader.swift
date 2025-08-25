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
                
                VStack(spacing: 8) {
                    ProgressRingView(progress: weekProgress)
                    
                    // Weight unit indicator (kg only)
                    HStack(spacing: 4) {
                        Image(systemName: "scalemass")
                            .font(.caption)
                            .foregroundColor(.evolveMuted)
                        Text("KG")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.evolveMuted)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.evolveMuted.opacity(0.2))
                    )
                }
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
        
        // Get daily workouts for this week
        let weekDailyWorkouts = viewModel.getDailyWorkoutsForWeek(week)
        
        return weekDailyWorkouts.filter { workout in
            !viewModel.isRestDay(workout) && viewModel.isWorkoutCompleted(workout.id)
        }.count
    }
    
    private var totalWorkoutsThisWeek: Int {
        guard let week = viewModel.currentWeek else { return 0 }
        
        // Get daily workouts for this week
        let weekDailyWorkouts = viewModel.getDailyWorkoutsForWeek(week)
        
        return weekDailyWorkouts.filter { !viewModel.isRestDay($0) }.count
    }
}