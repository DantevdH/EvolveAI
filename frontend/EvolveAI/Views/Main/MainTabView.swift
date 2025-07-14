import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    
    @State private var selectedTab = 0
    
    var body: some View {
        Group {  
            if workoutManager.isLoading {
                ProgressView("Loading Your Plan...")
            } else if let plan = workoutManager.workoutPlan {
                TabView(selection: $selectedTab) {
                    DashboardView()
                        .tabItem {
                            Image(systemName: "house.fill")
                            Text("Dashboard")
                        }
                        .tag(0)
                    
                    WorkoutView(plan: plan)
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
                }
                .accentColor(Color.evolveBlue)
            } else {
                VStack(spacing: 15) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.largeTitle)
                        .foregroundColor(.yellow)
                    Text("Could not load your plan.")
                        .font(.headline)
                    Button("Retry") {
                        fetchPlan()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
        .onAppear { 
            fetchPlan()
        }
    }
    
    private func fetchPlan() {
            // Prevent running in previews
            if ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
                // Provide the mock plan directly to the workout manager
                self.workoutManager.workoutPlan = mockWorkoutPlan
                self.workoutManager.isLoading = false
                return
            }

            guard workoutManager.workoutPlan == nil, !workoutManager.isLoading else { return }
            
            if let authToken = userManager.authToken {
                workoutManager.fetchWorkoutPlan(authToken: authToken)
            } else {
                print("Error: Cannot fetch plan, user is not authenticated.")
                // Optionally set isLoading to false to show the error state
                workoutManager.isLoading = false
            }
        }
    }

#Preview {
    MainTabView()
        .environmentObject(UserManager())
        .environmentObject(WorkoutManager())
}
