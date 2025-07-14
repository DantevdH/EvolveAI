import SwiftUI

struct MealPlanView: View {
    var body: some View {
        ScrollView {
            VStack {
                Text("Your Meal Plan")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding()
                
                // Placeholder for meal plan content
                Text("A detailed view of your weekly meal plan will be displayed here.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.evolveBackground)
    }
}

#Preview {
    MealPlanView()
        .preferredColorScheme(.dark)
}
