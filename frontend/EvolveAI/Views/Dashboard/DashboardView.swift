import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var nutritionManager: NutritionManager
    
    var body: some View {
        NavigationView {
            
            ZStack{
                ScrollView {
                    VStack(spacing: 20) {
                        // Header
                        DashboardHeader()
                        
                        // Quick Stats
                        QuickStatsView()
                        
                        // Today's Workout
                        TodaysWorkoutCard()
                        
                        // Progress Overview
                        ProgressOverviewCard()
                        
                        // Nutrition Summary
                        NutritionSummaryCard()
                        
                        // AI Insights
                        AIInsightsCard()
                    }
                    .padding()
                }
                .background(Color.evolveBackground)
                .navigationBarHidden(true)
            }
        }
    }
}

struct DashboardHeader: View {
    @EnvironmentObject var userManager: UserManager
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Good \(timeOfDay)")
                    .font(.title2)
                    .foregroundColor(.secondary)
                
                Text("Ready to Evolve?")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            
            Spacer()
            
            Button(action: {}) {
                Image(systemName: "person.crop.circle.fill")
                    .font(.title)
                    .foregroundColor(.evolvePrimary)
            }
        }
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
}

struct QuickStatsView: View {
    var body: some View {
        HStack(spacing: 16) {
            StatCard(title: "Streak", value: "7", subtitle: "days", color: .evolvePrimary)
            StatCard(title: "This Week", value: "4", subtitle: "workouts", color: .green)
            StatCard(title: "Goal", value: "75%", subtitle: "complete", color: .orange)
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.evolveCard)
        )
    }
}

struct TodaysWorkoutCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Today's Workout")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                Spacer()
                
                Button("Start") {
                    // Start workout action
                }
                .buttonStyle(PrimaryButtonStyle())
            }
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Upper Body Strength")
                        .font(.title3)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                    
                    Text("45 min • 6 exercises")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "figure.strengthtraining.functional")
                    .font(.system(size: 32))
                    .foregroundColor(.evolvePrimary)
            }
            
            // Exercise Preview
            HStack {
                ForEach(0..<3) { index in
                    ExercisePreviewDot(isActive: index == 0)
                    if index < 2 {
                        Spacer()
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
        )
    }
}

struct ExercisePreviewDot: View {
    let isActive: Bool
    
    var body: some View {
        Circle()
            .fill(isActive ? Color.evolvePrimary : Color.gray.opacity(0.3))
            .frame(width: 8, height: 8)
    }
}

struct ProgressOverviewCard: View {
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
            
            // Simple progress chart placeholder
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(0..<7) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.evolvePrimary.opacity(0.7))
                        .frame(width: 24, height: CGFloat.random(in: 20...60))
                }
            }
            .frame(height: 60)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
        )
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
            
            // Macro breakdown
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
                .foregroundColor(.secondary)
            
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 8, height: 40)
                
                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: 8, height: 40 * progress)
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
                .foregroundColor(.secondary)
                .lineLimit(nil)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.evolveCard)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.evolvePrimary.opacity(0.3), lineWidth: 1)
                )
        )
    }
}

#Preview {
    DashboardView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .environmentObject(NutritionManager())
}
