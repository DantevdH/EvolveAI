import SwiftUI

struct WeekNavigationView: View {
    let workoutPlan: WorkoutPlan
    @ObservedObject var viewModel: TrainingViewModel
    @ObservedObject var workoutManager: WorkoutManager
    @ObservedObject var userManager: UserManager
    
    // New: Track the selected week in the UI
    @State private var currentWeekSelected: Int = 1
    
    var body: some View {
        HStack {
            Button(action: {
                print("[DEBUG] Left button tapped. canGoToPreviousWeek: \(canGoToPreviousWeek), currentWeekSelected: \(currentWeekSelected)")
                if canGoToPreviousWeek {
                    currentWeekSelected -= 1
                    viewModel.setCurrentWeekSelected(currentWeekSelected)
                }
            }) {
                Image(systemName: "chevron.left")
                    .font(.title3)
                    .foregroundColor(canGoToPreviousWeek ? .evolvePrimary : .evolveMuted)
            }
            .disabled(!canGoToPreviousWeek)
            
            Spacer()
            
            Text("Week \(currentWeekSelected)")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.evolveText)
            
            Spacer()
            
            Button(action: {
                print("[DEBUG] Right button tapped. canGoToNextWeek: \(canGoToNextWeek), currentWeekSelected: \(currentWeekSelected)")
                if canGoToNextWeek {
                    currentWeekSelected += 1
                    viewModel.setCurrentWeekSelected(currentWeekSelected)
                }
            }) {
                Image(systemName: "chevron.right")
                    .font(.title3)
                    .foregroundColor(canGoToNextWeek ? .evolvePrimary : .evolveMuted)
            }
            .disabled(!canGoToNextWeek)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.evolveCard)
        )
        .padding(.horizontal)
        .padding(.top, 8)
        .onAppear {
            // Set initial selected week to the real current week from the plan
            currentWeekSelected = TrainingViewModel.calculateCurrentWeek(from: workoutPlan)
            viewModel.setCurrentWeekSelected(currentWeekSelected)
        }
    }
    
    private var canGoToPreviousWeek: Bool {
        currentWeekSelected > 1
    }
    
    private var canGoToNextWeek: Bool {
        currentWeekSelected < (workoutPlan.weekly_schedules.count)
    }
}