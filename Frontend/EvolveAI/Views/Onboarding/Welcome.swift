import SwiftUI

struct WelcomeStep: View {
    // This closure is called when the CTA button is tapped.
    var onStart: () -> Void
    
    let titleGradient = LinearGradient(
            gradient: Gradient(colors: [.white, Color(hex: "#B0B0B0")]), // White to light gray
            startPoint: .top,
            endPoint: .bottom
        )


    var body: some View {
        ZStack {
            // 1. Dimming Overlay
            // This color stretches edge-to-edge, covering the image.
            Color.black.opacity(0.4)
                .ignoresSafeArea()
            
            // 2. Text and Button Content
            // This content correctly stays within the safe area.
            VStack {
//
                Text("EvolveAI")
                    .font(.system(size: 28, weight: .black, design: .monospaced))
                    .kerning(4) // Adds spacing between letters
                    .foregroundStyle(titleGradient)
                    .shadow(color: .evolvePrimary.opacity(0.8), radius: 10)
                    .padding(.top, 20) // Pushes all content down from the top edge
                
                Spacer()
                
                Text("Smart Fitness, Personalized For You")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.7)
                    .lineLimit(2)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                Text("Achieve your goals with an AI coach that adapts to you.")
                    .font(.headline)
                    .minimumScaleFactor(0.8)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)
                    .padding(.horizontal)
                
                Spacer()
                Spacer()
                
                Button("Start Your Journey", action: onStart)
                     .buttonStyle(StartButtonStyle())
                     .padding(.bottom, 20)
                
            }
            .padding()
        }
        .background(
            // Use an Image view for the background
            Image("background") //
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
        )
    }
}
