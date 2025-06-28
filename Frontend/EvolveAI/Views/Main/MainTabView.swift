import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Dashboard")
                }
                .tag(0)
            
            WorkoutView()
                .tabItem {
                    Image(systemName: "figure.strengthtraining.functional")
                    Text("Workout")
                }
                .tag(1)
            
            NutritionView()
                .tabItem {
                    Image(systemName: "leaf.fill")
                    Text("Nutrition")
                }
                .tag(2)
            
            ProgressView()
                .tabItem {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("Progress")
                }
                .tag(3)
            
//            AICoachView()
//                .tabItem {
//                    Image(systemName: "brain.head.profile")
//                    Text("AI Coach")
//                }
//                .tag(4)
        }
        .accentColor(Color.evolveBlue)
        .background(Color.evolveBackground)
    }
}

#Preview {
    MainTabView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
        .environmentObject(NutritionManager())
}
