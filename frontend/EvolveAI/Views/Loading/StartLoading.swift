import SwiftUI

struct StartLoadingView: View {
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    
    @State private var gradientRotation: Double = 0
    @State private var pulseScale: CGFloat = 1.0
    @State private var scanLineOffset: CGFloat = -200
    @State private var particleOpacity: Double = 0.8
    
    var body: some View {
        ZStack {
            // Animated background gradient
            LinearGradient(
                colors: [
                    Color.black,
                    Color.evolvePrimary.opacity(0.3),
                    Color.black,
                    Color.evolvePrimary.opacity(0.1),
                    Color.black
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .rotationEffect(.degrees(gradientRotation))
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    gradientRotation = 360
                }
            }
            
            // Particle effects
            ForEach(0..<20, id: \.self) { index in
                Circle()
                    .fill(Color.evolvePrimary.opacity(0.3))
                    .frame(width: CGFloat.random(in: 2...6))
                    .position(
                        x: CGFloat.random(in: 0...UIScreen.main.bounds.width),
                        y: CGFloat.random(in: 0...UIScreen.main.bounds.height)
                    )
                    .opacity(particleOpacity)
                    .animation(
                        .easeInOut(duration: Double.random(in: 2...4))
                        .repeatForever(autoreverses: true),
                        value: particleOpacity
                    )
            }
            
            // Main content
            VStack(spacing: 50) {
                // AI Logo and Title
                VStack(spacing: 24) {
                    // Animated AI brain icon
                    ZStack {
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [Color.evolvePrimary.opacity(0.8), Color.clear],
                                    center: .center,
                                    startRadius: 0,
                                    endRadius: 80
                                )
                            )
                            .frame(width: 160, height: 160)
                            .scaleEffect(pulseScale)
                            .onAppear {
                                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                                    pulseScale = 1.2
                                }
                            }
                        
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 60, weight: .light))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.evolvePrimary, Color.white],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    
                    VStack(spacing: 8) {
                        Text("EVOLVE")
                            .font(.system(size: 36, weight: .black, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.evolvePrimary, Color.white],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                        
                        Text("AI FITNESS")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(.evolveMuted)
                            .tracking(4)
                    }
                    
                    Text("Analyzing your fitness profile...")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.evolveMuted)
                        .multilineTextAlignment(.center)
                }
                
                // Futuristic loading steps
                VStack(spacing: 16) {
                    // Step 1: User Profile
                    FuturisticLoadingStepView(
                        icon: "person.circle.fill",
                        title: "PROFILE ANALYSIS",
                        subtitle: "John Doe",
                        description: "Scanning biometric data",
                        isCompleted: userManager.userProfile != nil,
                        isActive: userManager.isLoading && userManager.userProfile == nil,
                        stepNumber: 1
                    )
                    
                    // Step 2: Coach Selection
                    FuturisticLoadingStepView(
                        icon: "person.3.fill",
                        title: "AI COACH MATCHING",
                        subtitle: workoutManager.selectedCoach?.name ?? "Analyzing...",
                        description: "Finding optimal coach",
                        isCompleted: workoutManager.selectedCoach != nil,
                        isActive: workoutManager.isCoachesLoading,
                        stepNumber: 2
                    )
                    
                    // Step 3: Plan Generation
                    FuturisticLoadingStepView(
                        icon: "dumbbell.fill",
                        title: "PLAN GENERATION",
                        subtitle: userManager.userProfile?.primaryGoal ?? "Processing...",
                        description: "Creating personalized routine",
                        isCompleted: workoutManager.workoutPlan != nil,
                        isActive: workoutManager.isLoading && workoutManager.selectedCoach != nil,
                        stepNumber: 3
                    )
                }
                .padding(.horizontal, 30)
                
                // Scanning line effect
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [Color.clear, Color.evolvePrimary.opacity(0.8), Color.clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 2)
                    .offset(x: scanLineOffset)
                    .onAppear {
                        withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                            scanLineOffset = UIScreen.main.bounds.width + 200
                        }
                    }
                
                // Progress indicator
                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        ForEach(0..<3, id: \.self) { index in
                            Circle()
                                .fill(Color.evolvePrimary.opacity(0.3))
                                .frame(width: 8, height: 8)
                                .scaleEffect(getProgressDotScale(for: index))
                                .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: getProgressDotScale(for: index))
                        }
                    }
                    
                    Text("AI OPTIMIZATION IN PROGRESS")
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundColor(.evolveMuted)
                        .tracking(2)
                }
            }
            .padding()
        }
    }
    
    private func getProgressDotScale(for index: Int) -> CGFloat {
        let progress = getOverallProgress()
        if Double(index) < progress {
            return 1.2
        } else {
            return 0.8
        }
    }
    
    private func getOverallProgress() -> Double {
        var completed = 0
        if userManager.userProfile != nil { completed += 1 }
        if workoutManager.selectedCoach != nil { completed += 1 }
        if workoutManager.workoutPlan != nil { completed += 1 }
        return Double(completed) / 3.0
    }
}

struct FuturisticLoadingStepView: View {
    let icon: String
    let title: String
    let subtitle: String
    let description: String
    let isCompleted: Bool
    let isActive: Bool
    let stepNumber: Int
    
    @State private var isAnimating = false
    @State private var glowOpacity: Double = 0.5
    
    var body: some View {
        HStack(spacing: 20) {
            // Step number and icon
            ZStack {
                // Glowing background
                Circle()
                    .fill(
                        RadialGradient(
                            colors: isCompleted ? 
                                [Color.green.opacity(0.3), Color.clear] :
                                isActive ? 
                                    [Color.evolvePrimary.opacity(0.3), Color.clear] :
                                    [Color.gray.opacity(0.1), Color.clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 40
                        )
                    )
                    .frame(width: 80, height: 80)
                    .scaleEffect(isAnimating ? 1.1 : 1.0)
                    .opacity(glowOpacity)
                    .onAppear {
                        if isActive {
                            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                                glowOpacity = 1.0
                            }
                        }
                    }
                
                // Icon
                Image(systemName: icon)
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(
                        LinearGradient(
                            colors: getIconColors(),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .scaleEffect(isAnimating ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(.evolveText)
                    .tracking(1)
                
                Text(subtitle)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(getSubtitleColor())
                
                Text(description)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.evolveMuted)
            }
            
            Spacer()
            
            // Status indicator
            ZStack {
                Circle()
                    .stroke(Color.evolveMuted.opacity(0.3), lineWidth: 2)
                    .frame(width: 40, height: 40)
                
                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.green)
                        .transition(.scale.combined(with: .opacity))
                } else if isActive {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .evolvePrimary))
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "clock")
                        .font(.system(size: 16))
                        .foregroundColor(.evolveMuted)
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.evolveCard.opacity(0.8))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            LinearGradient(
                                colors: getBorderColors(),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
                .shadow(color: getShadowColor(), radius: 10, x: 0, y: 5)
        )
        .onAppear {
            if isActive {
                isAnimating = true
            }
        }
        .onChange(of: isActive) { newValue in
            isAnimating = newValue
        }
    }
    
    private func getIconColors() -> [Color] {
        if isCompleted {
            return [Color.green, Color.green.opacity(0.7)]
        } else if isActive {
            return [Color.evolvePrimary, Color.white]
        } else {
            return [Color.gray, Color.gray.opacity(0.7)]
        }
    }
    
    private func getSubtitleColor() -> Color {
        if isCompleted {
            return .green
        } else if isActive {
            return .evolvePrimary
        } else {
            return .evolveMuted
        }
    }
    
    private func getBorderColors() -> [Color] {
        if isCompleted {
            return [Color.green.opacity(0.8), Color.clear]
        } else if isActive {
            return [Color.evolvePrimary.opacity(0.8), Color.clear]
        } else {
            return [Color.gray.opacity(0.3), Color.clear]
        }
    }
    
    private func getShadowColor() -> Color {
        if isCompleted {
            return Color.green.opacity(0.3)
        } else if isActive {
            return Color.evolvePrimary.opacity(0.3)
        } else {
            return Color.black.opacity(0.1)
        }
    }
}

// MARK: - Previews

#Preview("StartLoadingView - Initial State") {
    StartLoadingView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .preferredColorScheme(.dark)
}

#Preview("FuturisticLoadingStepView - Waiting") {
    FuturisticLoadingStepView(
        icon: "person.circle.fill",
        title: "PROFILE ANALYSIS",
        subtitle: "John Doe",
        description: "Scanning biometric data",
        isCompleted: false,
        isActive: false,
        stepNumber: 1
    )
    .padding()
    .background(Color.black)
    .preferredColorScheme(.dark)
}

#Preview("FuturisticLoadingStepView - Active") {
    FuturisticLoadingStepView(
        icon: "person.3.fill",
        title: "AI COACH MATCHING",
        subtitle: "Analyzing...",
        description: "Finding optimal coach",
        isCompleted: false,
        isActive: true,
        stepNumber: 2
    )
    .padding()
    .background(Color.black)
    .preferredColorScheme(.dark)
}

#Preview("FuturisticLoadingStepView - Completed") {
    FuturisticLoadingStepView(
        icon: "dumbbell.fill",
        title: "PLAN GENERATION",
        subtitle: "Increase Strength",
        description: "Creating personalized routine",
        isCompleted: true,
        isActive: false,
        stepNumber: 3
    )
    .padding()
    .background(Color.black)
    .preferredColorScheme(.dark)
}

#Preview("All Steps Together") {
    VStack(spacing: 16) {
        FuturisticLoadingStepView(
            icon: "person.circle.fill",
            title: "PROFILE ANALYSIS",
            subtitle: "John Doe",
            description: "Scanning biometric data",
            isCompleted: true,
            isActive: false,
            stepNumber: 1
        )
        
        FuturisticLoadingStepView(
            icon: "person.3.fill",
            title: "AI COACH MATCHING",
            subtitle: "Coach Sarah",
            description: "Finding optimal coach",
            isCompleted: true,
            isActive: false,
            stepNumber: 2
        )
        
        FuturisticLoadingStepView(
            icon: "dumbbell.fill",
            title: "PLAN GENERATION",
            subtitle: "Increase Strength",
            description: "Creating personalized routine",
            isCompleted: false,
            isActive: true,
            stepNumber: 3
        )
    }
    .padding()
    .background(Color.black)
    .preferredColorScheme(.dark)
}