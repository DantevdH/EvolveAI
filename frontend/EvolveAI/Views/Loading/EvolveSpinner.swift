import SwiftUI

struct EvolveSpinner: View {
    @State private var rotation: Double = 0
    @State private var dotRotation: Double = 0

    var size: CGFloat = 120

    var body: some View {
        ZStack {
            // Track
            Circle()
                .stroke(Color.white.opacity(0.08), lineWidth: 8)
                .frame(width: size, height: size)

            // Active arc (primary-forward)
            Circle()
                .trim(from: 0.12, to: 0.88)
                .stroke(
                    AngularGradient(
                        gradient: Gradient(colors: [
                            Color.evolvePrimary.opacity(1.0),
                            Color.evolvePrimary.opacity(0.6),
                            Color.evolvePrimary.opacity(1.0)
                        ]),
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: 8, lineCap: .round)
                )
                .frame(width: size, height: size)
                .rotationEffect(.degrees(rotation))
                .shadow(color: Color.evolvePrimary.opacity(0.35), radius: 6)

            // Moving dot (primary)
            Circle()
                .fill(Color.evolvePrimary)
                .frame(width: 10, height: 10)
                .shadow(color: Color.evolvePrimary.opacity(0.5), radius: 5)
                .offset(y: -size/2 + 6)
                .rotationEffect(.degrees(dotRotation))
        }
        .onAppear {
            withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                rotation = 360
                dotRotation = 360
            }
        }
        .accessibilityLabel("Loading")
        .accessibilityAddTraits(.isImage)
    }
}

#Preview {
    ZStack {
        Color.evolveBackground.ignoresSafeArea()
        EvolveSpinner(size: 120)
    }
    .preferredColorScheme(.dark)
} 