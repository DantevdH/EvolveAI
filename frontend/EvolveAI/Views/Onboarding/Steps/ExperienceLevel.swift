// Remove the old ExperienceViewModel completely.
import SwiftUI

struct ExperienceStep: View {
    // It now observes the main OnboardingViewModel directly.
    @ObservedObject var viewModel: OnboardingViewModel

    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("Experience Level")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            
            Text("This sets your starting point")
                .font(.subheadline)
                .italic()
                .foregroundStyle(.white)
            
            Spacer()
            
            VStack(spacing: 16) {
                // Loop over the levels from the shared ViewModel
                ForEach(viewModel.levels) { level in
                    ExperienceCard(
                        title: level.title,
                        description: level.description,
                        infoText: level.infoText, // Pass the new info text here
                        isSelected: viewModel.userProfile.experienceLevel == level.rawValue
                    ) {
                        // Call the selection method on the shared ViewModel
                        viewModel.selectExperienceLevel(level)
                    }
                }
            }
            .padding(.horizontal)
            
            Spacer()
            Spacer()
        }
    }
}


struct ExperienceCard: View {
    let title: String
    let description: String
    let infoText: String
    let isSelected: Bool
    let action: () -> Void
    
    // State for the popover
    @State private var showingInfoPopover = false
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(title)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        // Info icon button
                        Button {
                            showingInfoPopover = true
                        } label: {
                            Image(systemName: "info.circle")
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .popover(isPresented: $showingInfoPopover) {
                            Text(infoText)
                                .font(.subheadline)
                                .padding()
                                .presentationCompactAdaptation(.popover)
                        }

                    }
                    
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(isSelected ? .white : .gray)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .black : .evolvePrimary) // Original color
                    .font(.title2)
                    .accessibilityHidden(true)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.evolvePrimary : Color.evolveCard) // Original color
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.clear : Color.evolvePrimary.opacity(0.3), lineWidth: 1) // Original color
                    )
            )
        }
        .buttonStyle(.plain)

    }
}
