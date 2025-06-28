import SwiftUI

struct WelcomeStep: View {
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Image(systemName: "brain.head.profile")
                .font(.system(size: 80))
                .foregroundColor(.evolveBlue)
            
            Text("Welcome to")
                .font(.title2)
                .foregroundColor(.secondary)
            
            Text("EvolveAI")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Your Personalized AI Fitness & Nutrition Coach")
                .font(.headline)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            
            VStack(alignment: .leading, spacing: 12) {
                FeatureRow(icon: "figure.strengthtraining.functional", text: "AI-Powered Training Plans")
                FeatureRow(icon: "leaf.fill", text: "Personalized Nutrition Coaching")
                FeatureRow(icon: "chart.line.uptrend.xyaxis", text: "Real-Time Progress Tracking")
                FeatureRow(icon: "brain", text: "Adaptive AI Assistant")
            }
            .padding()
            
            Spacer()
        }
        .padding()
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.evolveBlue)
                .frame(width: 24)
            
            Text(text)
                .foregroundColor(.white)
            
            Spacer()
        }
    }
}

struct GoalsStep: View {
    @Binding var userProfile: UserProfile
    
    private let goals = [
        ("Marathon Training", "figure.run", "Run a marathon in under 4 hours"),
        ("Strength Building", "figure.strengthtraining.functional", "Build muscle and increase lifts"),
        ("Event Training", "figure.mixed.cardio", "Train for Hyrox or triathlon"),
        ("General Fitness", "heart.fill", "Overall health and wellness"),
        ("Weight Loss", "scalemass.fill", "Lose weight and tone up"),
        ("Athletic Performance", "trophy.fill", "Improve sports performance")
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("What's Your Goal?")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                
                Text("Select your primary fitness objective")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(goals, id: \.0) { goal in
                        GoalCard(
                            title: goal.0,
                            icon: goal.1,
                            description: goal.2,
                            // FIX: Changed 'goal' to 'primaryGoal'
                            isSelected: userProfile.primaryGoal == goal.0
                        ) {
                            // FIX: Changed 'goal' to 'primaryGoal'
                            userProfile.primaryGoal = goal.0
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

struct GoalCard: View {
    let title: String
    let icon: String
    let description: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(isSelected ? .black : .evolveBlue)
                
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(isSelected ? .black : .white)
                
                Text(description)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundColor(isSelected ? .black.opacity(0.7) : .secondary)
            }
            .padding(8)
            .frame(height: 140)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? Color.evolveBlue : Color.evolveCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isSelected ? Color.clear : Color.evolveBlue.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ExperienceStep: View {
    @Binding var userProfile: UserProfile
    
    private let levels = [
        ("Beginner", "Just starting my fitness journey"),
        ("Intermediate", "I workout regularly with some experience"),
        ("Advanced", "I'm experienced with training and nutrition")
    ]
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("Experience Level")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Help us tailor your program")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            VStack(spacing: 16) {
                ForEach(levels, id: \.0) { level in
                    ExperienceCard(
                        title: level.0,
                        description: level.1,
                        isSelected: userProfile.experienceLevel == level.0
                    ) {
                        userProfile.experienceLevel = level.0
                    }
                }
            }
            .padding(.horizontal)
            
            Spacer()
        }
    }
}

struct ExperienceCard: View {
    let title: String
    let description: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(isSelected ? .black : .white)
                    
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(isSelected ? .black.opacity(0.7) : .secondary)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .black : .evolveBlue)
                    .font(.title2)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.evolveBlue : Color.evolveCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.clear : Color.evolveBlue.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ScheduleStep: View {
    @Binding var userProfile: UserProfile
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("Training Schedule")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("How often can you train?")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            VStack(spacing: 20) {
                ScheduleSelector(
                    title: "Days per week",
                    value: $userProfile.daysPerWeek,
                    range: 1...7
                )
                
                ScheduleSelector(
                    title: "Minutes per session",
                    value: $userProfile.minutesPerSession,
                    range: 15...120,
                    step: 15
                )
            }
            .padding(.horizontal)
            
            Spacer()
        }
    }
}

struct ScheduleSelector: View {
    let title: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let step: Int
    
    init(title: String, value: Binding<Int>, range: ClosedRange<Int>, step: Int = 1) {
        self.title = title
        self._value = value
        self.range = range
        self.step = step
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
                
                Spacer()
                
                Text("\(value)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.evolveBlue)
            }
            
            Slider(
                value: Binding(
                    get: { Double(value) },
                    set: { value = Int($0) }
                ),
                in: Double(range.lowerBound)...Double(range.upperBound),
                step: Double(step)
            )
            .accentColor(.evolveBlue)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.evolveCard)
        )
    }
}

struct EquipmentStep: View {
    @Binding var userProfile: UserProfile
    
    private let equipmentOptions = [
        ("Full Gym", "figure.strengthtraining.functional"),
        ("Home Gym", "house.fill"),
        ("Dumbbells Only", "dumbbell.fill"),
        ("Bodyweight Only", "figure.run")
    ]
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("Available Equipment")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("What do you have access to?")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(equipmentOptions, id: \.0) { equipment in
                    EquipmentCard(
                        title: equipment.0,
                        icon: equipment.1,
                        isSelected: userProfile.equipment == equipment.0
                    ) {
                        userProfile.equipment = equipment.0
                    }
                }
            }
            .padding(.horizontal)
            
            Spacer()
        }
    }
}

struct EquipmentCard: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(isSelected ? .black : .evolveBlue)
                
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(isSelected ? .black : .white)
            }
            .frame(height: 100)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? Color.evolveBlue : Color.evolveCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isSelected ? Color.clear : Color.evolveBlue.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct PersonalInfoStep: View {
    @Binding var userProfile: UserProfile
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Personal Information")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                
                Text("Help us personalize your experience")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                VStack(spacing: 16) {
                    InfoField(title: "Age", value: $userProfile.age)
                    InfoFieldDouble(title: "Weight", value: $userProfile.weight, suffix: "lbs")
                    InfoFieldDouble(title: "Height", value: $userProfile.height, suffix: "inches")
                    
                    GenderSelector(selection: $userProfile.gender)
                }
                .padding(.horizontal)
            }
        }
    }
}

struct InfoField: View {
    let title: String
    @Binding var value: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)
            
            HStack {
                TextField("Enter \(title.lowercased())", value: $value, format: .number)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
                
                Text("years")
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct InfoFieldDouble: View {
    let title: String
    @Binding var value: Double
    let suffix: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)
            
            HStack {
                TextField("Enter \(title.lowercased())", value: $value, format: .number)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.decimalPad)
                
                Text(suffix)
                    .foregroundColor(.secondary)
            }
        }
    }
}


struct GenderSelector: View {
    @Binding var selection: String
    private let options = ["Male", "Female", "Other"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gender")
                .font(.headline)
                .foregroundColor(.white)
            
            HStack(spacing: 12) {
                ForEach(options, id: \.self) { option in
                    if selection == option {
                        Button(option) {
                            selection = option
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    } else {
                        Button(option) {
                            selection = option
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                }
            }
        }
    }
}
