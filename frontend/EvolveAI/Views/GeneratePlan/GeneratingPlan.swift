import SwiftUI

/// A view that displays an animated loading indicator while the AI generates the user's workout plan.
/// This view is now a "dumb" view, purely for presentation. It contains no logic.
struct AIGeneratingView: View {

    // It receives the coach to display their name, but has no other dependencies.
    let coach: Coach?
    
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            // A dark, semi-opaque background for a focused, modal feel.
            Color.black.opacity(0.95).ignoresSafeArea()
            
            VStack(spacing: 40) {
                // --- Animated Spinner ---
                ZStack {
                    // The background track for the spinner
                    Circle()
                        .stroke(Color.white.opacity(0.1), lineWidth: 10)
                    
                    // The rotating, gradient-filled arc of the spinner
                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [.evolvePrimary, .evolvePrimary.opacity(0.5)]),
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            style: StrokeStyle(lineWidth: 10, lineCap: .round)
                        )
                        .rotationEffect(.degrees(isAnimating ? 360 : 0))
                    
                    // A central icon to give context to the loading process.
                    Image(systemName: "cpu")
                        .font(.system(size: 70))
                        .foregroundColor(.white)
                        .shadow(color: .evolvePrimary.opacity(0.7), radius: 10)
                }
                .frame(width: 180, height: 180)
                
                // --- Informational Text ---
                VStack(spacing: 12) {
                    Text("\(coach?.name ?? "Your Coach") is thinking...")
                        .font(.title2.weight(.bold))
                        .foregroundColor(.white)

                    Text("This might take a few moments. We'll get you set up as soon as possible.")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
        }
        .onAppear {
            // The view's only responsibility on appear is to start its own UI animation.
            // It performs no network calls or other logic.
            withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

//// MARK: - Preview
//#Preview {
//    // Create a mock coach for the preview
//    let mockCoach = Coach(
//        id: 1,
//        name: "Coach Alex",
//        specialization: "Strength Training",
//        bio: "Alex is a certified strength and conditioning specialist.",
//        tagline: "Let's build some serious power!",
//        goal: "Increase Strength"
//    )
//
//    AIGeneratingView(coach: mockCoach)
//}
