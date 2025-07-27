import SwiftUI



// MARK: - Week Navigation and Overview
struct WeekNavigationAndOverview: View {
    let workoutPlan: WorkoutPlan
    let currentWeek: Int
    @ObservedObject var viewModel: TrainingViewModel
    @ObservedObject var workoutManager: WorkoutManager
    @ObservedObject var userManager: UserManager
    
    private let dayAbbreviations = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    var body: some View {
        VStack(spacing: 16) {
            // Week Navigation Section
            HStack {
                Button(action: {
                    if canGoToPreviousWeek {
                        viewModel.previousWeek()
                    }
                }) {
                    Image(systemName: "chevron.left")
                        .font(.title3)
                        .foregroundColor(canGoToPreviousWeek ? .evolvePrimary : .evolveMuted)
                }
                .disabled(!canGoToPreviousWeek)
                Spacer()
                Text("Week \(viewModel.currentWeekSelected)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.evolveText)
                Spacer()
                Button(action: {
                    if canGoToNextWeek {
                        viewModel.nextWeek()
                    }
                }) {
                    Image(systemName: "chevron.right")
                        .font(.title3)
                        .foregroundColor(canGoToNextWeek ? .evolvePrimary : .evolveMuted)
                }
                .disabled(!canGoToNextWeek)
            }
            // Weekly Overview Section
            WeeklyOverviewView(viewModel: viewModel, currentWeek: currentWeek)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.evolveCard)
        )
        .padding(.horizontal)
        .padding(.top, 8)
    }
    private var canGoToPreviousWeek: Bool { viewModel.currentWeekSelected > 1 }
    private var canGoToNextWeek: Bool { viewModel.currentWeekSelected < viewModel.totalWeeks }
}

// MARK: - Weekly Overview
struct WeeklyOverviewView: View {
    @ObservedObject var viewModel: TrainingViewModel
    let currentWeek: Int
    private let dayAbbreviations = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("This Week")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.evolveText)
                Spacer()
            }
            HStack(spacing: 8) {
                ForEach(0..<7, id: \.self) { dayIndex in
                    if let week = viewModel.currentWeek,
                       dayIndex < week.daily_workouts.count {
                        DayIndicatorView(
                            dayAbbreviation: dayAbbreviations[dayIndex],
                            workout: week.daily_workouts[dayIndex],
                            isSelected: dayIndex == viewModel.selectedDayIndex,
                            isCompleted: viewModel.isWorkoutCompleted(week.daily_workouts[dayIndex].id),
                            isCurrentWeek: isCurrentWeek,
                            canModify: canModifyWeek
                        ) {
                            viewModel.selectDay(dayIndex)
                        }
                    }
                }
            }
        }
    }
    private var isCurrentWeek: Bool {
        return viewModel.currentWeekSelected == currentWeek
    }
    private var canModifyWeek: Bool {
        return viewModel.currentWeekSelected >= currentWeek
    }
}

// MARK: - Day Indicator
struct DayIndicatorView: View {
    let dayAbbreviation: String
    let workout: DailyWorkout
    let isSelected: Bool
    let isCompleted: Bool
    let isCurrentWeek: Bool
    let canModify: Bool
    let onTap: () -> Void
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text(dayAbbreviation)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isSelected ? .white : .evolveText)
                Circle()
                    .frame(width: 32, height: 32)
                    .foregroundColor(backgroundColor)
                    .overlay(
                        Group {
                            if workout.isRestDay {
                                Image(systemName: "moon.fill")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white)
                            } else if isCompleted {
                                Image(systemName: "checkmark")
                                    .font(.caption)
                                    .foregroundColor(.white)
                            } else {
                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 6, height: 6)
                            }
                        }
                    )
                    .opacity(canModify ? 1.0 : 0.6)
            }
        }
    }
    private var backgroundColor: Color {
        if isSelected {
            return .evolvePrimary
        } else if workout.isRestDay {
            return .purple.opacity(0.6)
        } else if isCompleted {
            return .green
        } else {
            return .evolvePrimary.opacity(0.3)
        }
    }
} 