import SwiftUI

struct WorkoutView: View {
    @EnvironmentObject var workoutManager: WorkoutManager
    @State private var selectedTab = 0
    
    let plan: WorkoutPlan
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Custom Tab Bar
//                WorkoutTabBar(selectedTab: $selectedTab)
                Text("Welcome to the Wourkout view tab!")
                // Content
//                TabView(selection: $selectedTab) {
//                    WorkoutPlanView()
//                        .tag(0)
//                    
//                    ActiveWorkoutView()
//                        .tag(1)
//                    
//                    ExerciseLibraryView()
//                        .tag(2)
//                }
//                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
            .background(Color.evolvePrimary)
            .navigationTitle("Workout")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

//struct WorkoutTabBar: View {
//    @Binding var selectedTab: Int
//    
//    private let tabs = [
//        ("Plan", "calendar"),
//        ("Active", "play.circle.fill"),
//        ("Library", "book.fill")
//    ]
//    
//    var body: some View {
//        HStack(spacing: 0) {
//            ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
//                Button(action: {
//                    selectedTab = index
//                }) {
//                    VStack(spacing: 4) {
//                        Image(systemName: tab.1)
//                            .font(.title3)
//                        
//                        Text(tab.0)
//                            .font(.caption)
//                    }
//                    .foregroundColor(selectedTab == index ? .evolvePrimary : .secondary)
//                    .frame(maxWidth: .infinity)
//                    .padding(.vertical, 12)
//                }
//            }
//        }
//        .background(
//            RoundedRectangle(cornerRadius: 12)
//                .fill(Color.evolveCard)
//        )
//        .padding(.horizontal)
//    }
//}
//
//struct WorkoutPlanView: View {
//    var body: some View {
//        ScrollView {
//            VStack(spacing: 16) {
//                // Week Overview
//                WeekOverviewCard()
//                
//                // Today's Workout Detail
//                TodaysWorkoutDetail()
//                
//                // Upcoming Workouts
//                UpcomingWorkoutsSection()
//            }
//            .padding()
//        }
//    }
//}
//
//struct WeekOverviewCard: View {
//    var body: some View {
//        VStack(alignment: .leading, spacing: 16) {
//            Text("This Week")
//                .font(.headline)
//                .fontWeight(.semibold)
//                .foregroundColor(.white)
//            
//            HStack {
//                ForEach(0..<7) { day in
//                    WorkoutDayIndicator(
//                        day: Calendar.current.shortWeekdaySymbols[day],
//                        isToday: day == 1,
//                        hasWorkout: [0, 2, 4, 6].contains(day),
//                        isCompleted: day < 1
//                    )
//                }
//            }
//        }
//        .padding()
//        .background(
//            RoundedRectangle(cornerRadius: 16)
//                .fill(Color.evolveCard)
//        )
//    }
//}
//
//struct WorkoutDayIndicator: View {
//    let day: String
//    let isToday: Bool
//    let hasWorkout: Bool
//    let isCompleted: Bool
//    
//    var body: some View {
//        VStack(spacing: 8) {
//            Text(day)
//                .font(.caption2)
//                .foregroundColor(.secondary)
//            
//            Circle()
//                .fill(backgroundColor)
//                .frame(width: 32, height: 32)
//                .overlay(
//                    Group {
//                        if isCompleted {
//                            Image(systemName: "checkmark")
//                                .font(.caption)
//                                .foregroundColor(.white)
//                        } else if hasWorkout {
//                            Circle()
//                                .fill(Color.white)
//                                .frame(width: 8, height: 8)
//                        }
//                    }
//                )
//                .overlay(
//                    Circle()
//                        .stroke(isToday ? Color.evolvePrimary : Color.clear, lineWidth: 2)
//                )
//        }
//        .frame(maxWidth: .infinity)
//    }
//    
//    private var backgroundColor: Color {
//        if isCompleted {
//            return .green
//        } else if hasWorkout {
//            return isToday ? .evolvePrimary : .gray.opacity(0.3)
//        } else {
//            return .clear
//        }
//    }
//}
//
//struct TodaysWorkoutDetail: View {
//    var body: some View {
//        VStack(alignment: .leading, spacing: 16) {
//            HStack {
//                Text("Today's Workout")
//                    .font(.headline)
//                    .fontWeight(.semibold)
//                    .foregroundColor(.white)
//                
//                Spacer()
//                
//                Button("Start Workout") {
//                    // Start workout action
//                }
//                .buttonStyle(PrimaryButtonStyle())
//            }
//            
//            WorkoutInfoRow(title: "Upper Body Strength", subtitle: "45 minutes")
//            WorkoutInfoRow(title: "6 exercises", subtitle: "3 sets each")
//            WorkoutInfoRow(title: "Focus", subtitle: "Chest, Shoulders, Triceps")
//            
//            // Exercise List Preview
//            VStack(spacing: 8) {
//                ExercisePreviewRow(name: "Bench Press", sets: "3x8-10", weight: "185 lbs")
//                ExercisePreviewRow(name: "Shoulder Press", sets: "3x10-12", weight: "45 lbs")
//                ExercisePreviewRow(name: "Push-ups", sets: "3x12-15", weight: "Bodyweight")
//            }
//        }
//        .padding()
//        .background(
//            RoundedRectangle(cornerRadius: 16)
//                .fill(Color.evolveCard)
//        )
//    }
//}
//
//struct WorkoutInfoRow: View {
//    let title: String
//    let subtitle: String
//    
//    var body: some View {
//        HStack {
//            Text(title)
//                .font(.subheadline)
//                .foregroundColor(.white)
//            
//            Spacer()
//            
//            Text(subtitle)
//                .font(.subheadline)
//                .foregroundColor(.secondary)
//        }
//    }
//}
//
//struct ExercisePreviewRow: View {
//    let name: String
//    let sets: String
//    let weight: String
//    
//    var body: some View {
//        HStack {
//            Text(name)
//                .font(.subheadline)
//                .foregroundColor(.white)
//            
//            Spacer()
//            
//            Text(sets)
//                .font(.caption)
//                .foregroundColor(.evolvePrimary)
//            
//            Text("•")
//                .foregroundColor(.secondary)
//            
//            Text(weight)
//                .font(.caption)
//                .foregroundColor(.secondary)
//        }
//        .padding(.vertical, 4)
//    }
//}
//
//struct UpcomingWorkoutsSection: View {
//    var body: some View {
//        VStack(alignment: .leading, spacing: 12) {
//            Text("Upcoming Workouts")
//                .font(.headline)
//                .fontWeight(.semibold)
//                .foregroundColor(.white)
//            
//            VStack(spacing: 8) {
//                UpcomingWorkoutRow(day: "Tomorrow", workout: "Lower Body Power", duration: "50 min")
//                UpcomingWorkoutRow(day: "Thursday", workout: "Cardio & Core", duration: "30 min")
//                UpcomingWorkoutRow(day: "Saturday", workout: "Full Body Circuit", duration: "40 min")
//            }
//        }
//        .padding()
//        .background(
//            RoundedRectangle(cornerRadius: 16)
//                .fill(Color.evolveCard)
//        )
//    }
//}
//
//struct UpcomingWorkoutRow: View {
//    let day: String
//    let workout: String
//    let duration: String
//    
//    var body: some View {
//        HStack {
//            VStack(alignment: .leading, spacing: 2) {
//                Text(day)
//                    .font(.caption)
//                    .foregroundColor(.evolvePrimary)
//                
//                Text(workout)
//                    .font(.subheadline)
//                    .foregroundColor(.white)
//            }
//            
//            Spacer()
//            
//            Text(duration)
//                .font(.caption)
//                .foregroundColor(.secondary)
//        }
//        .padding(.vertical, 4)
//    }
//}
//
//struct ActiveWorkoutView: View {
//    var body: some View {
//        VStack {
//            Spacer()
//            
//            Image(systemName: "play.circle")
//                .font(.system(size: 64))
//                .foregroundColor(.evolvePrimary)
//            
//            Text("No Active Workout")
//                .font(.title2)
//                .fontWeight(.semibold)
//                .foregroundColor(.white)
//                .padding(.top)
//            
//            Text("Start a workout to see your progress here")
//                .font(.subheadline)
//                .foregroundColor(.secondary)
//                .multilineTextAlignment(.center)
//                .padding(.horizontal)
//            
//            Button("Start Today's Workout") {
//                // Start workout action
//            }
//            .buttonStyle(PrimaryButtonStyle())
//            .padding(.top)
//            
//            Spacer()
//        }
//        .padding()
//    }
//}
//
//struct ExerciseLibraryView: View {
//    @State private var searchText = ""
//    
//    private let categories = [
//        "All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio"
//    ]
//    
//    @State private var selectedCategory = "All"
//    
//    var body: some View {
//        VStack(spacing: 0) {
//            // Search Bar
//            SearchBar(text: $searchText)
//                .padding()
//            
//            // Category Filter
//            ScrollView(.horizontal, showsIndicators: false) {
//                HStack(spacing: 12) {
//                    ForEach(categories, id: \.self) { category in
//                        CategoryChip(
//                            title: category,
//                            isSelected: selectedCategory == category
//                        ) {
//                            selectedCategory = category
//                        }
//                    }
//                }
//                .padding(.horizontal)
//            }
//            
//            // Exercise List
//            ScrollView {
//                LazyVStack(spacing: 12) {
//                    ForEach(sampleExercises, id: \.name) { exercise in
//                        ExerciseLibraryRow(exercise: exercise)
//                    }
//                }
//                .padding()
//            }
//        }
//    }
//    
//    private let sampleExercises = [
//        Exercise(name: "Bench Press", category: "Chest", difficulty: "Intermediate", equipment: "Barbell"),
//        Exercise(name: "Squats", category: "Legs", difficulty: "Beginner", equipment: "Barbell"),
//        Exercise(name: "Pull-ups", category: "Back", difficulty: "Advanced", equipment: "Pull-up Bar"),
//        Exercise(name: "Push-ups", category: "Chest", difficulty: "Beginner", equipment: "Bodyweight")
//    ]
//}
//
//struct SearchBar: View {
//    @Binding var text: String
//    
//    var body: some View {
//        HStack {
//            Image(systemName: "magnifyingglass")
//                .foregroundColor(.secondary)
//            
//            TextField("Search exercises...", text: $text)
//                .textFieldStyle(PlainTextFieldStyle())
//                .foregroundColor(.white)
//        }
//        .padding(12)
//        .background(
//            RoundedRectangle(cornerRadius: 10)
//                .fill(Color.evolveCard)
//        )
//    }
//}
//
//struct CategoryChip: View {
//    let title: String
//    let isSelected: Bool
//    let action: () -> Void
//    
//    var body: some View {
//        Button(action: action) {
//            Text(title)
//                .font(.subheadline)
//                .fontWeight(.medium)
//                .foregroundColor(isSelected ? .black : .white)
//                .padding(.horizontal, 16)
//                .padding(.vertical, 8)
//                .background(
//                    RoundedRectangle(cornerRadius: 20)
//                        .fill(isSelected ? Color.evolvePrimary : Color.evolveCard)
//                )
//        }
//        .buttonStyle(PlainButtonStyle())
//    }
//}
//
//struct ExerciseLibraryRow: View {
//    let exercise: Exercise
//    
//    var body: some View {
//        HStack {
//            VStack(alignment: .leading, spacing: 4) {
//                Text(exercise.name)
//                    .font(.headline)
//                    .foregroundColor(.white)
//                
//                HStack {
//                    Text(exercise.category)
//                        .font(.caption)
//                        .foregroundColor(.evolvePrimary)
//                    
//                    Text("•")
//                        .foregroundColor(.secondary)
//                    
//                    Text(exercise.difficulty)
//                        .font(.caption)
//                        .foregroundColor(.secondary)
//                    
//                    Text("•")
//                        .foregroundColor(.secondary)
//                    
//                    Text(exercise.equipment)
//                        .font(.caption)
//                        .foregroundColor(.secondary)
//                }
//            }
//            
//            Spacer()
//            
//            Button(action: {}) {
//                Image(systemName: "play.circle.fill")
//                    .font(.title2)
//                    .foregroundColor(.evolvePrimary)
//            }
//        }
//        .padding()
//        .background(
//            RoundedRectangle(cornerRadius: 12)
//                .fill(Color.evolveCard)
//        )
//    }
//}

//#Preview {
//    WorkoutView()
//        .environmentObject(WorkoutManager())
//}

