import SwiftUI

struct NutritionView: View {
    @EnvironmentObject var nutritionManager: NutritionManager
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                Text("Welcome to the Nutrition Tab View!")
                // Custom Tab Bar
//                NutritionTabBar(selectedTab: $selectedTab)
                
//                // Content
//                TabView(selection: $selectedTab) {
//                    DailyNutritionView()
//                        .tag(0)
//                    
//                    MealPlanView()
//                        .tag(1)
//                    
//                    FoodLogView()
//                        .tag(2)
//                }
//                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
            .background(Color.evolveBackground)
            .navigationTitle("Nutrition")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct NutritionTabBar: View {
    @Binding var selectedTab: Int
    
    private let tabs = [
        ("Today", "calendar.badge.clock"),
        ("Meal Plan", "list.bullet.clipboard"),
        ("Food Log", "plus.circle.fill")
    ]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                Button(action: {
                    selectedTab = index
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.1)
                            .font(.title3)
                        
                        Text(tab.0)
                            .font(.caption)
                    }
                    .foregroundColor(selectedTab == index ? .evolvePrimary : .secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.evolveCard)
        )
        .padding(.horizontal)
    }
}

struct DailyNutritionView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Calorie Overview
                CalorieOverviewCard()
                
                // Macronutrient Breakdown
                MacroBreakdownCard()
                
                // Meal Summary
                MealSummarySection()
            }
        }
    }
}
