import SwiftUI

struct WelcomeStep: View {
    var onStart: (String) -> Void
    @ObservedObject var viewModel: OnboardingViewModel
    @State private var username: String = ""
    @FocusState private var isTextFieldFocused: Bool
    @State private var animate = false
    
    var body: some View {
        ZStack {
            OnboardingBackground()
            VStack(spacing: 32) {
                Spacer()
                // Modern fitness/AI icon and tagline
                VStack(spacing: 18) {
                    ZStack {
                        Circle()
                            .fill(RadialGradient(colors: [Color.evolvePrimary.opacity(0.5), Color.clear], center: .center, startRadius: 0, endRadius: 60))
                            .frame(width: 80, height: 80)
                            .shadow(color: Color.evolvePrimary.opacity(0.18), radius: 16, y: 8)
                        Image(systemName: "dumbbell.fill")
                            .font(.system(size: 44, weight: .bold))
                            .foregroundColor(.white)
                            .shadow(color: Color.evolvePrimary.opacity(0.5), radius: 8, y: 4)
                        // AI accent
                        Image(systemName: "sparkles")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.evolveSecondary)
                            .offset(x: 28, y: -28)
                            .shadow(color: Color.evolveSecondary.opacity(0.5), radius: 6, y: 2)
                    }
                    // Tagline
                    Text("Science Based. Improved Results.")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
        
                        .opacity(animate ? 1 : 0)
                        .offset(y: animate ? 0 : 10)
                        .animation(.easeOut(duration: 0.7).delay(0.2), value: animate)
                }
                .padding(.top, 60)
                // Username entry
                VStack(spacing: 12) {
                    Text("What should we call you?")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                        .multilineTextAlignment(.center)
                        .opacity(animate ? 1 : 0)
                        .offset(y: animate ? 0 : 10)
                        .animation(.easeOut(duration: 0.7).delay(0.5), value: animate)
                    HStack {
                        Image(systemName: "person.fill")
                            .foregroundColor(.evolvePrimary)
                        TextField("Your username", text: $username)
                            .focused($isTextFieldFocused)
                            .textInputAutocapitalization(.words)
                            .disableAutocorrection(true)
                            .foregroundColor(.white)
                            .font(.title2)
                            .padding(.vertical, 10)

                        .onChange(of: username) { _, newValue in
                            viewModel.userProfile.username = newValue
                        }
                    }
                    .padding(.horizontal)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(isTextFieldFocused ? Color.evolvePrimary : Color.white.opacity(0.18), lineWidth: 2)
                    )
                    .shadow(color: Color.evolvePrimary.opacity(0.15), radius: 8, y: 4)
                    .opacity(animate ? 1 : 0)
                    .offset(y: animate ? 0 : 10)
                    .animation(.easeOut(duration: 0.7).delay(0.6), value: animate)
                    if username.count > 0 && username.count < 5 {
                        Text("Username must be at least 5 characters")
                            .font(.caption)
                            .foregroundColor(.red)
                            .transition(.opacity)
                    }
                }
                // Start button
                Button(action: {
                    isTextFieldFocused = false
                    if username.count >= 5 {
                        viewModel.userProfile.username = username
                        onStart(username)
                    }
                }) {
                    HStack {
                        Image(systemName: "arrow.right.circle.fill")
                            .accessibilityHidden(true)
                        Text("Start")
                    }
                }
                .buttonStyle(NextButtonStyle())
                .disabled(username.trimmingCharacters(in: .whitespaces).count < 5)

                .opacity(animate ? 1 : 0)
                .offset(y: animate ? 0 : 10)
                .animation(.easeOut(duration: 0.7).delay(0.7), value: animate)
                Spacer()
            }
            .padding()
            .onAppear { animate = true }
        }
    }
}

#if DEBUG
struct WelcomeStep_Preview: PreviewProvider {
    static var previews: some View {
        WelcomeStep(onStart: { username in
            print("Username: \(username)")
        }, viewModel: OnboardingViewModel(userManager: UserManager(), workoutManager: WorkoutManager()))
        .preferredColorScheme(.dark)
    }
}
#endif

