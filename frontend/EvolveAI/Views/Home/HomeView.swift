import SwiftUI

struct HomeView: View {
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var nutritionManager: NutritionManager
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.evolveBackground.ignoresSafeArea()
                VStack(spacing: 0) {
                    if workoutManager.isLoading {
                        ProgressView("Loading your data...")
                            .foregroundColor(.evolveText)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let plan = workoutManager.workoutPlan {
                        HomeContentView(plan: plan)
                    } else {
                        VStack(spacing: 20) {
                            Image(systemName: "house")
                                .font(.system(size: 60))
                                .foregroundColor(.evolvePrimary)
                            Text("Welcome to EvolveAI!")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.evolveText)
                            Text("Let's get started by creating your first workout plan.")
                                .multilineTextAlignment(.center)
                                .foregroundColor(.evolveMuted)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
            .navigationTitle("")
            .navigationBarHidden(true)
        }
    }
}

struct HomeContentView: View {
    let plan: WorkoutPlan
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var nutritionManager: NutritionManager
    
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 24) {
                HomeHeader()
                MotivationalCarousel()
                QuickActionsView()
                QuickStatsView()
                TodaysWorkoutCard(plan: plan)
                ProgressOverviewCard()
                NutritionSummaryCard()
                AIInsightsCard()
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 8)
        }
        .background(Color.clear)
    }
}

struct HomeHeader: View {
    @EnvironmentObject var userManager: UserManager
    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Good \(timeOfDay)")
                        .font(.title2)
                        .foregroundColor(.evolveText)
                    Image(systemName: timeOfDayIcon)
                        .foregroundColor(.evolvePrimary)
                }
                Text("Ready to Evolve?")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            Spacer()
            ZStack {
                Circle()
                    .fill(Color.evolveCard)
                    .frame(width: 54, height: 54)
                    .shadow(color: .evolvePrimary.opacity(0.08), radius: 8, x: 0, y: 4)
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 32))
                    .foregroundColor(.evolvePrimary)
            }
        }
        .padding(.horizontal)
    }
    private var timeOfDay: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Morning"
        case 12..<17: return "Afternoon"
        case 17..<22: return "Evening"
        default: return "Night"
        }
    }
    private var timeOfDayIcon: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "sun.max.fill"
        case 12..<17: return "cloud.sun.fill"
        case 17..<22: return "moon.stars.fill"
        default: return "moon.zzz.fill"
        }
    }
}

struct MotivationalCarousel: View {
    let quotes = [
        "Every rep counts. Keep pushing!",
        "Progress, not perfection.",
        "Your only limit is you.",
        "AI is here to help you evolve!",
        "Small steps, big results."
    ]
    @State private var current = 0
    var body: some View {
        TabView(selection: $current) {
            ForEach(0..<quotes.count, id: \.self) { i in
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.evolvePrimary)
                    Text(quotes[i])
                        .font(.headline)
                        .foregroundColor(.evolveText)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 18)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.evolveCard)
                        .shadow(color: .evolvePrimary.opacity(0.08), radius: 8, x: 0, y: 4)
                )
                .tag(i)
            }
        }
        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
        .frame(height: 60)
        .padding(.horizontal)
    }
}

struct QuickActionsView: View {
    var body: some View {
        HStack(spacing: 24) {
            QuickActionButton(icon: "bolt.fill", label: "Start Workout", color: .evolvePrimary)
            QuickActionButton(icon: "leaf.fill", label: "Log Food", color: .evolveTertiary)
            QuickActionButton(icon: "message.fill", label: "Ask AI", color: .evolveSecondary)
        }
        .padding(.horizontal)
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color
    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.18))
                    .frame(width: 48, height: 48)
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(color)
            }
            Text(label)
                .font(.caption)
                .foregroundColor(.evolveText)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            // Add haptic or animation here
        }
    }
}

struct QuickStatsView: View {
    var body: some View {
        HStack(spacing: 16) {
            StatCard(title: "Streak", value: "7", subtitle: "days", color: .evolvePrimary, icon: "flame.fill")
            StatCard(title: "This Week", value: "4", subtitle: "workouts", color: .evolveTertiary, icon: "calendar")
            StatCard(title: "Goal", value: "75%", subtitle: "complete", color: .evolveSecondary, icon: "target")
        }
        .padding(.horizontal)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color
    let icon: String
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.caption)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.evolveText)
            }
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.evolveCard)
                .shadow(color: color.opacity(0.08), radius: 8, x: 0, y: 4)
        )
    }
}

struct TodaysWorkoutCard: View {
    let plan: WorkoutPlan
    @EnvironmentObject var workoutManager: WorkoutManager
    
    var todayWorkout: DailyWorkout? {
        guard let completePlan = workoutManager.completeWorkoutPlan else { return nil }
        
        let today = Calendar.current.component(.weekday, from: Date())
        let dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        let todayName = dayNames[today - 1]
        
        // Find today's workout by matching the day name
        return completePlan.dailyWorkouts.first(where: { $0.dayOfWeek == todayName })
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            if let workout = todayWorkout, !isRestDay(workout) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Today's Workout")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    Spacer()
                    let exercises = getExercisesForWorkout(workout)
                    let completed = exercises.filter { isExerciseCompleted($0.id) }.count
                    let total = max(exercises.count, 1)
                    ZStack {
                        ProgressRing(progress: Double(completed) / Double(total), color: .evolvePrimary)
                            .frame(width: 36, height: 36)
                        Text("\(Int((Double(completed) / Double(total)) * 100))%")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.evolvePrimary)
                    }
                    Button(action: {
                        // Start workout action
                    }) {
                        Image(systemName: "play.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 18, weight: .bold))
                    }
                    .frame(width: 40, height: 40)
                    .background(Circle().fill(Color.evolvePrimary))
                    .shadow(color: Color.evolvePrimary.opacity(0.18), radius: 4, x: 0, y: 2)
                }
                VStack(alignment: .leading, spacing: 4) {
                    let exercises = getExercisesForWorkout(workout)
                    Text("\(exercises.count) exercises")
                        .font(.subheadline)
                        .foregroundColor(.white)
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        let exercises = getExercisesForWorkout(workout)
                        ForEach(Array(exercises.prefix(5)), id: \.id) { exercise in
                            VStack(spacing: 4) {
                                Image(systemName: "figure.strengthtraining.traditional")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 24, height: 24)
                                    .foregroundColor(isExerciseCompleted(exercise.id) ? .evolvePrimary : .evolveMuted)
                                Text(exercise.name)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
            } else {
                VStack(alignment: .center, spacing: 12) {
                    Spacer(minLength: 0)
                    HStack {
                        Spacer()
                        Image(systemName: "moon.zzz.fill")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 48, height: 48)
                            .foregroundColor(.evolveSecondary)
                            .padding(.top, 8)
                        Spacer()
                    }
                    Text("Rest Day")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.evolveSecondary)
                    Text("Recharge and get ready for tomorrow 💫")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                    Text("Tip: Good sleep boosts muscle recovery and performance.")
                        .font(.caption)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color.evolveCard)
                .shadow(color: .evolvePrimary.opacity(0.08), radius: 8, x: 0, y: 4)
        )
    }
    
    // Helper methods to work with the flat structure
    private func isRestDay(_ workout: DailyWorkout) -> Bool {
        guard let completePlan = workoutManager.completeWorkoutPlan else { return true }
        let workoutExercises = completePlan.workoutExercises.filter { $0.dailyWorkoutId == workout.id }
        return workoutExercises.isEmpty
    }
    
    private func getExercisesForWorkout(_ workout: DailyWorkout) -> [Exercise] {
        guard let completePlan = workoutManager.completeWorkoutPlan else { return [] }
        let workoutExercises = completePlan.workoutExercises.filter { $0.dailyWorkoutId == workout.id }
        return workoutExercises.compactMap { workoutExercise in
            completePlan.exercises.first { $0.id == workoutExercise.exerciseId }
        }
    }
    
    private func isExerciseCompleted(_ exerciseId: Int) -> Bool {
        // For now, return false since we don't have completion tracking in this view
        // In a real app, this would check against the completion status
        return false
    }
}

struct ExercisePreviewDot: View {
    let isActive: Bool
    var body: some View {
        Circle()
            .fill(isActive ? Color.evolvePrimary : Color.gray.opacity(0.3))
            .frame(width: 12, height: 12)
            .overlay(
                Circle()
                    .stroke(Color.white.opacity(isActive ? 0.7 : 0.2), lineWidth: 2)
            )
            .shadow(color: isActive ? .evolvePrimary.opacity(0.2) : .clear, radius: 4, x: 0, y: 2)
    }
}

struct ProgressRing: View {
    var progress: Double // 0.0 ... 1.0
    var color: Color
    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.18), lineWidth: 6)
            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

struct ProgressOverviewCard: View {
    @State private var animate = false
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Progress Overview")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Spacer()
                Button("View All") {
                    // View all progress action
                }
                .font(.subheadline)
                .foregroundColor(.evolvePrimary)
            }
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(0..<7) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.evolvePrimary.opacity(animate ? 0.7 : 0.3))
                        .frame(width: 24, height: animate ? CGFloat.random(in: 30...60) : 20)
                }
            }
            .frame(height: 60)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
                .shadow(color: .evolvePrimary.opacity(0.08), radius: 8, x: 0, y: 4)
        )
        .onAppear { animate = true }
    }
}

struct NutritionSummaryCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Nutrition Today")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Spacer()
                Text("1,847 / 2,200 cal")
                    .font(.subheadline)
                    .foregroundColor(.evolvePrimary)
            }
            HStack(spacing: 16) {
                MacroBar(title: "Protein", current: 120, target: 150, color: .red)
                MacroBar(title: "Carbs", current: 180, target: 220, color: .orange)
                MacroBar(title: "Fat", current: 65, target: 80, color: .yellow)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
                .shadow(color: .evolvePrimary.opacity(0.08), radius: 8, x: 0, y: 4)
        )
    }
}

struct MacroBar: View {
    let title: String
    let current: Int
    let target: Int
    let color: Color
    var progress: Double {
        Double(current) / Double(target)
    }
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.white)
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 10, height: 44)
                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: 10, height: 44 * progress)
            }
            Text("\(current)g")
                .font(.caption2)
                .foregroundColor(.white)
        }
    }
}

struct AIInsightsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(.evolvePrimary)
                Text("AI Insights")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Spacer()
            }
            Text("Great consistency this week! Your squat strength has improved by 8%. Consider adding more protein to support your muscle growth goals.")
                .font(.subheadline)
                .foregroundColor(.white)
                .lineLimit(nil)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
                .shadow(color: .evolvePrimary.opacity(0.08), radius: 8, x: 0, y: 4)
        )
    }
}

// #Preview("Home - With Plan") {
//     let userManager = UserManager()
//     let workoutManager = WorkoutManager()
//     workoutManager.workoutPlan = mockWorkoutPlan
    
//     return HomeView()
//         .environmentObject(userManager)
//         .environmentObject(workoutManager)
//         .environmentObject(NutritionManager())
// }

// #Preview("Home - No Plan") {
//     let userManager = UserManager()
//     let workoutManager = WorkoutManager()
    
//     return HomeView()
//         .environmentObject(userManager)
//         .environmentObject(workoutManager)
//         .environmentObject(NutritionManager())
// }

// #if DEBUG
// struct HomeView_SundayComparisonPreview: PreviewProvider {
//     static var sundayWorkout: DailyWorkout {
//         DailyWorkout(
//             id: 1,
//             weeklyScheduleId: 1,
//             dayOfWeek: "Sunday",
//             createdAt: ISO8601DateFormatter().string(from: Date()),
//             updatedAt: ISO8601DateFormatter().string(from: Date())
//         )
//     }
//     static var sundayRest: DailyWorkout {
//         DailyWorkout(
//             id: 2,
//             weeklyScheduleId: 1,
//             dayOfWeek: "Sunday",
//             createdAt: ISO8601DateFormatter().string(from: Date()),
//             updatedAt: ISO8601DateFormatter().string(from: Date())
//         )
//     }
//     static var workoutPlan: WorkoutPlan {
//         WorkoutPlan(
//             id: 1,
//             userProfileId: 1,
//             title: "Test Plan",
//             summary: "",
//             createdAt: ISO8601DateFormatter().string(from: Date()),
//             updatedAt: ISO8601DateFormatter().string(from: Date())
//         )
//     }
//     static var restPlan: WorkoutPlan {
//         WorkoutPlan(
//             id: 1,
//             userProfileId: 1,
//             title: "Test Plan",
//             summary: "",
//             createdAt: ISO8601DateFormatter().string(from: Date()),
//             updatedAt: ISO8601DateFormatter().string(from: Date())
//         )
//     }
//     static var previews: some View {
//         Group {
//             HomeView()
//                 .environmentObject(UserManager())
//                 .environmentObject({
//                     let wm = WorkoutManager()
//                     wm.workoutPlan = workoutPlan
//                     return wm
//                 }())
//                 .environmentObject(NutritionManager())
//                 .previewDisplayName("Sunday Workout")
//                 .background(Color.evolveBackground)
//                 .previewLayout(.sizeThatFits)
//             HomeView()
//                 .environmentObject(UserManager())
//                 .environmentObject({
//                     let wm = WorkoutManager()
//                     wm.workoutPlan = restPlan
//                     return wm
//                 }())
//                 .environmentObject(NutritionManager())
//                 .previewDisplayName("Sunday Rest")
//                 .background(Color.evolveBackground)
//                 .previewLayout(.sizeThatFits)
//         }
//     }
// }
// #endif
