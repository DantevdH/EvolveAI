import SwiftUI

struct StartLoadingView: View {
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var appViewModel: AppViewModel
    
    @State private var gradientRotation: Double = 0
    @State private var pulseScale: CGFloat = 1.0
    @State private var scanLineOffset: CGFloat = -200
    @State private var particleOpacity: Double = 0.8
    @State private var currentMessage: String = "Stretching muscles..."
    
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
                }
                
                // Contextual loading message
                VStack(spacing: 20) {
                    if appViewModel.showRedirectDelay {
                        // Redirect message for new users
                        VStack(spacing: 16) {
                            Image(systemName: "person.badge.plus")
                                .font(.system(size: 40))
                                .foregroundColor(.evolvePrimary)
                            
                            Text("New User Detected")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.evolveText)
                            
                            Text("Redirecting to onboarding...")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.evolveMuted)
                                .multilineTextAlignment(.center)
                        }
                        .transition(.opacity.combined(with: .scale))
                    } else {
                        // Regular loading message
                        VStack(spacing: 16) {
                            Text(currentMessage)
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.evolveText)
                                .multilineTextAlignment(.center)
                                .animation(.easeInOut(duration: 0.5), value: currentMessage)
                            
                            // Progress indicator
                            HStack(spacing: 8) {
                                ForEach(0..<3, id: \.self) { index in
                                    Circle()
                                        .fill(Color.evolvePrimary.opacity(0.3))
                                        .frame(width: 8, height: 8)
                                        .scaleEffect(getProgressDotScale(for: index))
                                        .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: getProgressDotScale(for: index))
                                }
                            }
                        }
                    }
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
            }
            .padding()
        }
        .onAppear {
            updateLoadingMessage()
        }
        .onChange(of: userManager.isLoading) { _ in
            updateLoadingMessage()
        }
        .onChange(of: workoutManager.isCoachesLoading) { _ in
            updateLoadingMessage()
        }
        .onChange(of: workoutManager.isLoading) { _ in
            updateLoadingMessage()
        }
    }
    
    private func updateLoadingMessage() {
        // Determine the appropriate message based on current state
        if appViewModel.showRedirectDelay {
            currentMessage = "New user detected, redirecting to onboarding..."
        } else if userManager.isLoading && userManager.userProfile == nil {
            currentMessage = "Loading your profile..."
        } else if workoutManager.isCoachesLoading {
            currentMessage = "Finding your perfect AI coach..."
        } else if workoutManager.isLoading && workoutManager.selectedCoach != nil {
            if workoutManager.workoutPlan != nil {
                currentMessage = "Loading your workout plan..."
            } else {
                currentMessage = "Generating your personalized workout plan..."
            }
        } else if workoutManager.errorMessage != nil {
            currentMessage = "Network error, please try again..."
        } else if userManager.userProfile != nil && workoutManager.selectedCoach != nil && workoutManager.workoutPlan != nil {
            currentMessage = "Setup complete! Redirecting to your dashboard..."
        } else {
            currentMessage = "Preparing your fitness journey..."
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

// MARK: - Previews

#Preview("StartLoadingView - Initial State") {
    StartLoadingView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .preferredColorScheme(.dark)
}

#Preview("StartLoadingView - New User") {
    let userManager = UserManager()
    userManager.isNewUser = true
    
    return StartLoadingView()
        .environmentObject(userManager)
        .environmentObject(WorkoutManager())
        .preferredColorScheme(.dark)
}