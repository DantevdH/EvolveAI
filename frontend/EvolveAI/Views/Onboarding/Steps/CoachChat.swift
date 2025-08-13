import SwiftUI


import SwiftUI

struct FinalChatStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    
    let coach: Coach?
    var onReadyToGenerate: () -> Void
    
    // 1. Use @ViewBuilder on the body to allow conditional logic (if/else)
    //    without needing to wrap views in AnyView. This is much more efficient.
    @ViewBuilder
    var body: some View {
        if let coach = coach {
            // The main view when a coach is available
            chatView(for: coach)
        } else {
            // The fallback view when the coach is nil
            missingCoachView
        }
    }
    
    // 2. The main chat interface is extracted into its own helper view.
    private func chatView(for coach: Coach) -> some View {
        VStack(spacing: 0) {
            ChatHeaderView(coach: coach)
            chatHistoryView(for: coach)
            chatFooterView // This helper was already here, just renamed for clarity
        }
        .background(Color.black.opacity(0.95).ignoresSafeArea())
        .onAppear { viewModel.startChat(with: coach) }
    }
    
    // 3. The ScrollView and its logic are now in a dedicated helper.
    private func chatHistoryView(for coach: Coach) -> some View {
        ScrollViewReader { scrollViewProxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(viewModel.messages) { message in
                        MessageRow(message: message, coach: coach)
                            .id(message.id)
                    }
                    if viewModel.isCoachTyping {
                        TypingIndicatorRow(coach: coach)
                            .id("typingIndicator")
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) {
                if let lastMessageId = viewModel.messages.last?.id {
                    withAnimation { scrollViewProxy.scrollTo(lastMessageId, anchor: .bottom) }
                }
            }
            .onChange(of: viewModel.isCoachTyping) { _, isTyping in
                if isTyping {
                    withAnimation { scrollViewProxy.scrollTo("typingIndicator", anchor: .bottom) }
                }
            }
        }
    }

    // 4. The footer is cleaner, with the Divider moved inside it.
    @ViewBuilder
    private var chatFooterView: some View {
        VStack(spacing: 0) {
            Divider()
            
            // The animation is applied directly to the content that changes.
            Group {
                switch viewModel.chatPhase {
                case .initial:
                    Color.clear.frame(height: 70)
                    
                case .awaitingChoice:
                    HStack(spacing: 12) {
                        Button("No, I'm ready!") { viewModel.chatPhase = .finished }
                             .buttonStyle(PrimaryButtonStyle())

                        Button("Yes, there's more") { viewModel.chatPhase = .userTyping }
                             .buttonStyle(PrimaryButtonStyle())

                    }
                    .padding()
                    
                case .userTyping:
                    HStack(spacing: 12) {
                        TextField("", text: $viewModel.currentMessage, prompt: Text("Add any final notes...").foregroundColor(.gray).italic())
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.white.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                        
                        Button(action: viewModel.sendMessage) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.title)
                                // .foregroundColor(.evolvePrimary)
                        }
                        .disabled(viewModel.currentMessage.isEmpty)

                    }
                    .padding()
                    
                case .finished:
                    Button("Create My Schedule", action: onReadyToGenerate)
                         .buttonStyle(PrimaryButtonStyle())
                        .padding()

                }
            }
            .animation(.easeInOut, value: viewModel.chatPhase)
        }
    }
    
    // A simple helper for the fallback UI.
    private var missingCoachView: some View {
        Text("Please select a goal first to meet your coach.")
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black.opacity(0.95).ignoresSafeArea())
    }
}

struct ChatHeaderView: View {
    let coach: Coach
    var body: some View {
        HStack {
            Image(systemName: coach.iconName)
                .font(.title2)
                .foregroundColor(coach.primaryColor)
                .frame(width: 44, height: 44)
                .background(coach.primaryColor.opacity(0.2))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(coach.name).font(.headline).fontWeight(.bold).foregroundColor(.white)
                HStack(spacing: 4) {
                    Circle().fill(.green).frame(width: 8, height: 8)
                    Text("Online").font(.caption).foregroundColor(Color.white)
                }
            }
            Spacer()
        }
        .padding()
        .background(Color.black.opacity(0.5))
    }
}

struct MessageRow: View {
    let message: ChatMessage
    let coach: Coach
    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            if message.isFromCoach {
                Image(systemName: coach.iconName)
                    .font(.title)
                    .foregroundColor(coach.primaryColor)
                    .clipShape(Circle())
                ChatBubble(message: message.text, isFromCoach: true)
                Spacer()
            } else {
                Spacer()
                ChatBubble(message: message.text, isFromCoach: false)
            }
        }
    }
}

struct TypingIndicatorRow: View {
    let coach: Coach
    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            Image(systemName: coach.iconName)
                .font(.title)
                .foregroundColor(coach.primaryColor)
                .clipShape(Circle())
            TypingIndicatorBubble()
            Spacer()
        }
        .transition(.opacity)
    }
}

struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let isFromCoach: Bool
}

struct ChatBubble: View {
    let message: String
    let isFromCoach: Bool
    var body: some View {
        Text(try! AttributedString(markdown: message))
            .padding()
            .foregroundColor(.white)
            .background(isFromCoach ? Color.white.opacity(0.15) : Color.evolvePrimary)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

struct TypingIndicatorBubble: View {
    @State private var scale: CGFloat = 0.5
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { i in
                Circle()
                    .frame(width: 8, height: 8)
                    .scaleEffect(scale)
                    .animation(.easeInOut(duration: 0.4).repeatForever().delay(0.1 * Double(i)), value: scale)
            }
        }
        .padding()
        .foregroundColor(.white.opacity(0.5))
        .background(Color.white.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .onAppear { scale = 1.0 }
        .transition(.opacity)
    }
}

//struct FinalChatStep_Previews: PreviewProvider {
//    static var previews: some View {
//        // FIX 3: The preview now passes the coach directly.
//        let dummyCoach = Coach(name: "Coach Forge", goal: "Bodybuilding", iconName: "dumbbell.fill", tagline: "Sculpting strength, building legends.", primaryColorHex: "#FF9500")
//        
//        FinalChatStep(
//            userProfile: .constant(viewModel.UserProfile()),
//            coach: dummyCoach
//        ) {
//            print("Ready to generate!")
//        }
//    }
//}
