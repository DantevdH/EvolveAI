import SwiftUI

struct CalorieOverviewCard: View {
    @EnvironmentObject var nutritionManager: NutritionManager
    
    // // Simple calculation for progress
    // var progress: Double {
    //     // You would replace these hardcoded values with properties from your nutritionManager
    //     Double(1847) / Double(nutritionManager.calorieTarget)
    // }

    var body: some View {
        // VStack(spacing: 16) {
        //     Text("Calories")
        //         .font(.title2)
        //         .fontWeight(.bold)
        //         .foregroundColor(.white)

        //     ZStack {
        //         Circle()
        //             .stroke(lineWidth: 12)
        //             .opacity(0.3)
        //             .foregroundColor(Color.gray)

        //         Circle()
        //             .trim(from: 0.0, to: CGFloat(min(self.progress, 1.0)))
        //             .stroke(style: StrokeStyle(lineWidth: 12, lineCap: .round, lineJoin: .round))
        //             .foregroundColor(Color.evolvePrimary)
        //             .rotationEffect(Angle(degrees: 270.0))
                
        //         VStack {
        //             Text("1,847")
        //                 .font(.largeTitle)
        //                 .fontWeight(.bold)
        //             Text("kcal")
        //                 .font(.subheadline)
        //                 .foregroundColor(.secondary)
        //         }
        //     }
        //     .frame(width: 150, height: 150)
            
        //     HStack {
        //         Text("Goal: \(nutritionManager.calorieTarget) kcal")
        //             .font(.subheadline)
        //             .foregroundColor(.secondary)
        //     }
        // }
        // .padding()
        // .background(
        //     RoundedRectangle(cornerRadius: 16)
        //         .fill(Color.evolveCard)
        // )
    }
}

// struct MacroBreakdownCard: View {
//     var body: some View {
//         VStack(alignment: .leading, spacing: 16) {
//             Text("Macronutrients")
//                 .font(.headline)
//                 .fontWeight(.semibold)
//                 .foregroundColor(.white)
            
//             // Re-using the MacroBar view from your Dashboard
//             HStack(spacing: 16) {
//                 MacroBar(title: "Protein", current: 120, target: 150, color: .red)
//                 MacroBar(title: "Carbs", current: 180, target: 220, color: .orange)
//                 MacroBar(title: "Fat", current: 65, target: 80, color: .yellow)
//             }
//         }
//         .padding()
//         .frame(maxWidth: .infinity)
//         .background(
//             RoundedRectangle(cornerRadius: 16)
//                 .fill(Color.evolveCard)
//         )
//     }
// }

// struct MealSummarySection: View {
//     @EnvironmentObject var nutritionManager: NutritionManager

//     var body: some View {
//         VStack(alignment: .leading) {
//             Text("Today's Meals")
//                 .font(.headline)
//                 .fontWeight(.semibold)
//                 .foregroundColor(.white)
//                 .padding(.horizontal)

//             ForEach(nutritionManager.mealPlan) { meal in
//                 HStack {
//                     Text(meal.name)
//                     Spacer()
//                     Text("\(meal.calories) kcal")
//                         .foregroundColor(.secondary)
//                 }
//                 .padding()
//                 .background(
//                     RoundedRectangle(cornerRadius: 12)
//                         .fill(Color.evolveCard)
//                 )
//             }
//         }
//     }
// }
