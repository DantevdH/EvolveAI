import SwiftUI
import Combine

struct WorkoutView: View {
    @StateObject private var viewModel: TrainingViewModel
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    
    // Store the passed workout plan for direct usage
    private let initialWorkoutPlan: WorkoutPlan?
    
    init(workoutPlan: WorkoutPlan? = nil) {
        self.initialWorkoutPlan = workoutPlan
        self._viewModel = StateObject(wrappedValue: TrainingViewModel(workoutPlan: workoutPlan))
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Use the initial workout plan if available, otherwise use workoutManager's plan
                if let workoutPlan = currentWorkoutPlan {
                    let currentWeek = TrainingViewModel.calculateCurrentWeek(from: workoutPlan)
                    let totalWeeks = workoutManager.completeWorkoutPlan?.weeklySchedules.count ?? 0
                    
                    if currentWeek > totalWeeks && totalWeeks > 0 {
                        PlanCompleteView(
                            workoutPlan: workoutPlan,
                            totalWeeks: totalWeeks,
                            onCreateNewPlan: {
                                // TODO: Implement navigation to create new plan
                                print("[DEBUG] Create New Plan tapped")
                            }
                        )
                    } else {
                        TrainingContentView(
                            workoutPlan: workoutPlan,
                            viewModel: viewModel,
                            userManager: userManager,
                            workoutManager: workoutManager
                        )
                        .onAppear {
                            viewModel.updateWorkoutPlan(workoutPlan)
                            // Load complete workout plan if available
                            if let completePlan = workoutManager.completeWorkoutPlan {
                                viewModel.updateCompleteWorkoutPlan(completePlan)
                            }
                            viewModel.loadFromServerData()
                        }
                        .onChange(of: workoutManager.workoutPlan) { newPlan in
                            if let plan = newPlan {
                                viewModel.updateWorkoutPlan(plan)
                            }
                        }
                        .onChange(of: workoutManager.completeWorkoutPlan) { completePlan in
                            if let plan = completePlan {
                                viewModel.updateCompleteWorkoutPlan(plan)
                            }
                        }
                    }
                } else if workoutManager.isLoading {
                    ProgressView("Loading workout plan...")
                        .foregroundColor(.evolveText)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "dumbbell")
                            .font(.system(size: 60))
                            .foregroundColor(.evolvePrimary)
                        
                        Text("No Workout Plan Found")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolveText)
                        
                        Text("Create a workout plan to get started with your fitness journey.")
                            .multilineTextAlignment(.center)
                            .foregroundColor(.evolveMuted)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(Color.evolveBackground.ignoresSafeArea())
            .navigationTitle("Training")
            .navigationBarHidden(true)
        }
    }
    
    // Computed property to get the current workout plan
    private var currentWorkoutPlan: WorkoutPlan? {
        #if DEBUG
                // In Xcode Previews, use the initial plan if provided
                if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1", let initialPlan = initialWorkoutPlan {
                    return initialPlan
                }
        #endif
                // In the real app, always use the manager's plan
                return workoutManager.workoutPlan
            }
}

struct PlanCompleteView: View {
    let workoutPlan: WorkoutPlan
    let totalWeeks: Int
    let onCreateNewPlan: () -> Void
    
    var totalWorkouts: Int {
        // Calculate total workouts from the complete workout plan
        // For now, we'll use a placeholder
        0 // TODO: Calculate from completeWorkoutPlan
    }
    
    var completedWorkouts: Int {
        // Calculate completed workouts
        // For now, we'll use a placeholder
        0 // TODO: Calculate from progress tracking
    }
    
    var planTitle: String {
        // Remove any '(Started X weeks ago)' from the title
        if let range = workoutPlan.title.range(of: "(Started") {
            return String(workoutPlan.title[..<range.lowerBound]).trimmingCharacters(in: .whitespaces)
        }
        return workoutPlan.title
    }
    
    var completedPercentage: Int {
        guard totalWorkouts > 0 else { return 0 }
        return Int(round(Double(completedWorkouts) / Double(totalWorkouts) * 100))
    }
    var completedColor: Color {
        switch completedPercentage {
        case ..<30:
            return .red
        case 30..<70:
            return .orange
        default:
            return .green
        }
    }
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            VStack(spacing: 12) {
                Image(systemName: "checkmark.seal.fill")
                    .resizable()
                    .frame(width: 60, height: 60)
                    .foregroundColor(.evolvePrimary)
                Text("Plan Complete!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.evolvePrimary)
                Text("Congratulations on finishing your training plan!")
                    .font(.title3)
                    .foregroundColor(.evolveText)
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, 16)
            VStack(spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Plan")
                            .font(.caption)
                            .foregroundColor(.evolveMuted)
                        Text(planTitle)
                            .font(.headline)
                            .foregroundColor(.evolveText)
                    }
                    Spacer()
                }
                HStack(spacing: 24) {
                    VStack {
                        Text("Total Weeks")
                            .font(.caption)
                            .foregroundColor(.evolveMuted)
                        Text("\(totalWeeks)")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolvePrimary)
                    }
                    VStack {
                        Text("Total Workouts")
                            .font(.caption)
                            .foregroundColor(.evolveMuted)
                        Text("\(totalWorkouts)")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.evolvePrimary)
                    }
                    VStack {
                        Text("Completed")
                            .font(.caption)
                            .foregroundColor(.evolveMuted)
                        Text("\(completedPercentage)%")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(completedColor)
                    }
                }
            }
            .padding()
            .background(RoundedRectangle(cornerRadius: 16).fill(Color.evolveCard))
            .padding(.horizontal)
            Spacer()
            Button(action: onCreateNewPlan) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Create New Plan")
                        .fontWeight(.semibold)
                }
                .padding()
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.horizontal)
            Spacer()
        }
        .background(Color.evolveBackground.ignoresSafeArea())
    }
}

struct TrainingContentView: View {
    let workoutPlan: WorkoutPlan
    @ObservedObject var viewModel: TrainingViewModel
    @ObservedObject var userManager: UserManager
    @ObservedObject var workoutManager: WorkoutManager
    
    var body: some View {
        let currentWeek = TrainingViewModel.calculateCurrentWeek(from: workoutPlan)
        let totalWeeks = workoutManager.completeWorkoutPlan?.weeklySchedules.count ?? 0
        
        if currentWeek > totalWeeks && totalWeeks > 0 {
            VStack {
                Spacer()
                Text("Plan Complete!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.evolvePrimary)
                Spacer()
            }
            .background(Color.evolveBackground.ignoresSafeArea())
            .onAppear {
                print("[DEBUG] Showing Plan Complete view (currentWeek=\(currentWeek), totalWeeks=\(totalWeeks))")
            }
        } else {
            ScrollView {
                VStack(spacing: 0) {
                    TrainingHeaderView(workoutPlan: workoutPlan, viewModel: viewModel)
                    
                    WeekNavigationAndOverview(
                        workoutPlan: workoutPlan,
                        currentWeek: currentWeek,
                        viewModel: viewModel,
                        workoutManager: workoutManager,
                        userManager: userManager
                    )
                    
                    DailyWorkoutDetailView(
                        viewModel: viewModel, 
                        userManager: userManager,
                        workoutManager: workoutManager,
                        currentWeek: currentWeek
                    )
                    
                    // Bottom spacing for scroll comfort
                    Color.clear.frame(height: 20)
                }
            }
            .background(Color.evolveBackground.ignoresSafeArea())
            .fullScreenCover(isPresented: $viewModel.isShowingExerciseDetail) {
                if let exercise = viewModel.selectedExercise {
                    ExerciseDetailView(exercise: exercise)
                }
            }
            .onAppear {
                print("[DEBUG] TrainingContentView: currentWeek=\(currentWeek), totalWeeks=\(totalWeeks)")
            }
        }
    }
} 

// MARK: - Preview

#Preview("Fresh Start") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    
    return WorkoutView(workoutPlan: mockWorkoutPlan)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
}

#Preview("Complete Workout Plan") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    
    // Set the complete workout plan
    workoutManager.completeWorkoutPlan = mockCompleteWorkoutPlan
    
    return WorkoutView(workoutPlan: mockWorkoutPlan)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
}

