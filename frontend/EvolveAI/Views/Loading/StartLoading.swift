import SwiftUI

struct StartLoadingView: View {
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    @EnvironmentObject var appViewModel: AppViewModel
    
    @State private var gradientRotation: Double = 0
    @State private var currentMessage: String = "Stretching muscles..."
    
    var body: some View {
        ZStack {
            // Subtle animated background
            LinearGradient(
                colors: [
                    Color.evolveBackground,
                    Color.evolveBackground.opacity(0.98)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .rotationEffect(.degrees(gradientRotation))
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                    gradientRotation = 360
                }
            }
            
            // Main content
            VStack(spacing: 28) {
                VStack(spacing: 6) {
                    Text("EVOLVE")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.evolvePrimary, Color.evolvePrimary.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    Text("AI FITNESS")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(Color.evolvePrimary.opacity(0.8))
                        .tracking(3)
                }
                
                // Subtle primary glow + Simplified spinner
                ZStack {
                    RadialGradient(
                        colors: [Color.evolvePrimary.opacity(0.25), .clear],
                        center: .center,
                        startRadius: 2,
                        endRadius: 120
                    )
                    .frame(width: 180, height: 180)
                    .blur(radius: 20)
                    EvolveSpinner(size: 120)
                }
                .padding(.top, 2)
                
                // Contextual loading message + progress
                VStack(spacing: 12) {
                    if appViewModel.showRedirectDelay {
                        VStack(spacing: 6) {
                            Image(systemName: "person.badge.plus")
                                .font(.system(size: 24))
                                .foregroundColor(.evolvePrimary)
                            Text("New user detected. Redirecting to onboarding…")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.evolveText)
                                .multilineTextAlignment(.center)
                        }
                        .transition(.opacity.combined(with: .scale))
                    } else {
                        VStack(spacing: 8) {
                            Text(currentMessage)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.evolveText)
                                .multilineTextAlignment(.center)
                                .animation(.easeInOut(duration: 0.2), value: currentMessage)
                            
                            if let coach = workoutManager.selectedCoach {
                                HStack(spacing: 6) {
                                    Image(systemName: coach.iconName)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(coach.primaryColor)
                                    Text("Coach: \(coach.name)")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(.evolveMuted)
                                }
                                .transition(.opacity)
                            }
                            
                            LoadingProgressBar(progress: CGFloat(getOverallProgress()))
                                .frame(height: 6)
                                .padding(.top, 4)
                        }
                    }
                }
                .padding(.horizontal, 28)
            }
            .padding()
        }
        .onAppear { updateLoadingMessage() }
        .onChange(of: userManager.isLoading) { _ in updateLoadingMessage() }
        .onChange(of: userManager.authToken) { _ in updateLoadingMessage() }
        .onChange(of: userManager.userProfile?.id) { _ in updateLoadingMessage() }
        .onChange(of: workoutManager.isCoachesLoading) { _ in updateLoadingMessage() }
        .onChange(of: workoutManager.isLoading) { _ in updateLoadingMessage() }
        .onChange(of: workoutManager.selectedCoach?.id) { _ in updateLoadingMessage() }
        .onChange(of: workoutManager.workoutPlan) { _ in updateLoadingMessage() }
        .onChange(of: workoutManager.errorMessage) { _ in updateLoadingMessage() }
        .onChange(of: workoutManager.coachesErrorMessage) { _ in updateLoadingMessage() }
        .onChange(of: appViewModel.state) { _ in updateLoadingMessage() }
    }
    
    private func updateLoadingMessage() {
        if appViewModel.showRedirectDelay {
            currentMessage = "New user detected. Redirecting to onboarding…"
            return
        }
        if let error = userManager.errorMessage ?? workoutManager.coachesErrorMessage ?? workoutManager.errorMessage {
            currentMessage = "\(error)"
            return
        }
        if userManager.isLoading && userManager.authToken == nil {
            currentMessage = "Connecting to your account…"
        } else if userManager.isLoading && userManager.userProfile == nil {
            currentMessage = "Fetching your profile…"
        } else if workoutManager.isCoachesLoading {
            currentMessage = "Matching you with the right AI coach…"
        } else if workoutManager.isLoading && workoutManager.selectedCoach != nil && workoutManager.workoutPlan == nil {
            let coachName = workoutManager.selectedCoach?.name ?? "your coach"
            currentMessage = "Generating your personalized plan with \(coachName)…"
        } else if workoutManager.isLoading && workoutManager.workoutPlan != nil {
            currentMessage = "Loading your workout plan…"
        } else if case .needsPlan = appViewModel.state {
            currentMessage = "No plan found. Preparing recommendations…"
        } else if userManager.userProfile != nil && workoutManager.selectedCoach != nil && workoutManager.workoutPlan != nil {
            currentMessage = "Setup complete! Taking you to your dashboard…"
        } else {
            currentMessage = "Preparing your fitness journey…"
        }
    }
    
    private func getOverallProgress() -> Double {
        var completed = 0
        if userManager.authToken != nil { completed += 1 }
        if userManager.userProfile != nil { completed += 1 }
        if workoutManager.selectedCoach != nil { completed += 1 }
        if workoutManager.workoutPlan != nil { completed += 1 }
        return Double(completed) / 4.0
    }
}

// MARK: - Progress Bar
fileprivate struct LoadingProgressBar: View {
    let progress: CGFloat // 0.0 - 1.0
    
    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let clamped = min(max(progress, 0), 1)
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(Color.evolvePrimary.opacity(0.18))
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color.evolvePrimary.opacity(0.95), Color.evolvePrimary.opacity(0.6)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: width * clamped)
                    .shadow(color: Color.evolvePrimary.opacity(0.35), radius: 5, x: 0, y: 0)
            }
        }
    }
}

// MARK: - Previews
#Preview("StartLoadingView - Initial State") {
    StartLoadingView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .environmentObject(AppViewModel(userManager: UserManager(), workoutManager: WorkoutManager()))
        .preferredColorScheme(.dark)
}

#Preview("StartLoadingView - New User") {
    let userManager = UserManager()
    userManager.isNewUser = true
    
    return StartLoadingView()
        .environmentObject(userManager)
        .environmentObject(WorkoutManager())
        .environmentObject(AppViewModel(userManager: userManager, workoutManager: WorkoutManager()))
        .preferredColorScheme(.dark)
}