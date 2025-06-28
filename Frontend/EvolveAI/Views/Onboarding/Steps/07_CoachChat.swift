//
//  07_CoachChat.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 09/07/2025.
//

import SwiftUI

struct FinalChatStep: View {
    @Binding var userProfile: UserProfile
    
    // This closure will be called when the user is ready to generate the schedule.
    var onReadyToGenerate: () -> Void
    
    // Enum to manage the different states of the chat
    private enum ChatPhase {
        case initial, awaitingChoice, userTyping, finished
    }
    
    // State variables to manage the chat flow
    @State private var messages: [ChatMessage] = []
    @State private var currentMessage: String = ""
    @State private var chatPhase: ChatPhase = .initial
    @State private var isCoachTyping: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            // --- NEW: A dedicated header for the chat screen ---
            ChatHeaderView(coach: userProfile.coach)
            
            // Chat history
            ScrollViewReader { scrollViewProxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(messages) { message in
                            // --- MODIFIED: The row now includes the coach's icon ---
                            MessageRow(message: message, coach: userProfile.coach)
                                .id(message.id)
                        }
                        if isCoachTyping {
                            TypingIndicatorRow(coach: userProfile.coach)
                                .id("typingIndicator")
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) {
                    // Automatically scroll to the newest message
                    if let lastMessage = messages.last {
                        withAnimation { scrollViewProxy.scrollTo(lastMessage.id, anchor: .bottom) }
                    }
                }
                .onChange(of: isCoachTyping) {
                    if isCoachTyping {
                        // Scroll down when the typing indicator appears
                        withAnimation { scrollViewProxy.scrollTo("typingIndicator", anchor: .bottom) }
                    }
                }
            }
            
            // Footer is now conditional based on the chat phase
            VStack(spacing: 0) {
                Divider()
                chatFooter
                    .animation(.easeInOut, value: chatPhase)
            }
        }
        .background(Color.black.opacity(0.95).ignoresSafeArea())
        .onAppear(perform: startChat)
    }
    
    // A computed view for the dynamic chat footer
    @ViewBuilder
    private var chatFooter: some View {
        switch chatPhase {
        case .initial:
            // Empty while the first message is "typing"
            Color.clear.frame(height: 70)
            
        case .awaitingChoice:
            // Show the Yes/No buttons
            HStack(spacing: 12) {
                Button("No, I'm ready!") { chatPhase = .finished }
                    .buttonStyle(SecondaryButtonStyle())
                Button("Yes, there's more") { chatPhase = .userTyping }
                    .buttonStyle(PrimaryButtonStyle())
            }
            .padding()
            
        case .userTyping:
            // Show the text input bar
            HStack(spacing: 12) {
                TextField(
                    "",
                    text: $currentMessage,
                    prompt: Text("Add any final notes...")
                        .foregroundColor(.gray)
                        .italic()
                )
                .foregroundColor(.white)
                .padding(12)
                .background(Color.white.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                
                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundColor(.evolvePrimary)
                }
                .disabled(currentMessage.isEmpty)
            }
            .padding()
            
        case .finished:
            // Show the final "Create Schedule" button
            Button("Create My Schedule", action: onReadyToGenerate)
                .buttonStyle(PrimaryButtonStyle())
                .padding()
        }
    }
    
    // --- Logic functions to drive the chat state ---
    private func startChat() {
        guard messages.isEmpty else { return }
        
        isCoachTyping = true
        // First message
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isCoachTyping = false
            let welcomeMessage = "Hi, nice to meet you! Or as I always say, *\(userProfile.coach.tagline)*"
            messages.append(ChatMessage(text: welcomeMessage, isFromCoach: true))
            
            // Second message
            isCoachTyping = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                isCoachTyping = false
                let secondMessage = "I've reviewed your profile and I'm excited to get started! Before I build your plan, is there anything else about your fitness I should know?"
                messages.append(ChatMessage(text: secondMessage, isFromCoach: true))
                chatPhase = .awaitingChoice
            }
        }
    }
    
    private func sendMessage() {
        guard !currentMessage.isEmpty else { return }
        
        userProfile.finalChatNotes = currentMessage
        messages.append(ChatMessage(text: currentMessage, isFromCoach: false))
        currentMessage = ""
        
        isCoachTyping = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            isCoachTyping = false
            let finalMessage = "Got it. I have everything I need. Let's create your plan!"
            messages.append(ChatMessage(text: finalMessage, isFromCoach: true))
            chatPhase = .finished
        }
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
                Text(coach.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                HStack(spacing: 4) {
                    Circle().fill(.green).frame(width: 8, height: 8)
                    Text("Online")
                        .font(.caption)
                        .foregroundColor(Color.white)
                }
            }
            
            Spacer()
        }
        .padding()
        .background(Color.black.opacity(0.5))
    }
}

// --- NEW: A view for a single row in the chat ---
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

// --- NEW: A view for the typing indicator row ---
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


// A model for a single chat message
struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let isFromCoach: Bool
}

// A view for a single chat message bubble
struct ChatBubble: View {
    let message: String
    let isFromCoach: Bool
    
    var body: some View {
        // Using AttributedString to render markdown for italics
        Text(try! AttributedString(markdown: message))
            .padding()
            .foregroundColor(.white)
            .background(isFromCoach ? Color.white.opacity(0.15) : Color.evolvePrimary)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

// A view for the typing indicator
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

// --- SUPPORTING CODE FOR PREVIEW ---

struct FinalChatStep_Previews: PreviewProvider {
    static var previews: some View {
        FinalChatStep(userProfile: .constant(UserProfile(primaryGoal: "Bodybuilding"))) {
            print("Ready to generate!")
        }
    }
}
