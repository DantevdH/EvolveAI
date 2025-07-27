import SwiftUI
import Combine

struct MainTabView: View {
    let plan: WorkoutPlan
    @EnvironmentObject var userManager: UserManager
    @EnvironmentObject var workoutManager: WorkoutManager
    
    @State private var selectedTab = 0
    private let hapticGenerator = UIImpactFeedbackGenerator(style: .light)
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                DashboardView().tag(0)
                WorkoutView(workoutPlan: plan).tag(1)
                NutritionView().tag(2)
            }
            .toolbar(.hidden, for: .tabBar)
            customTabBar
        }
        .background(Color.evolveBackground)
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }
    
    private var customTabBar: some View {
        HStack(spacing: 0) {
            tabBarItem(icon: "house.fill", label: "Home", tag: 0)
            tabBarItem(icon: "figure.strengthtraining.functional", label: "Training", tag: 1)
            tabBarItem(icon: "leaf.fill", label: "Nutrition", tag: 2)
            tabBarItem(icon: "person.fill", label: "Profile", tag: 3)
        }
        .padding(.vertical, 10)
        .padding(.horizontal)
        .background(Color.evolveCard)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.8), radius: 15, x: 0, y: 5)
        .padding(.horizontal)
        .background(Color.evolveBackground)
    }
    
    private func tabBarItem(icon: String, label: String, tag: Int) -> some View {
        let isActive = selectedTab == tag
        return VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 22))
                .scaleEffect(isActive ? 1.1 : 1.0)
            Text(label)
                .font(.caption)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
        .foregroundStyle(isActive ? Color.evolvePrimary : Color.evolveMuted)
        .onTapGesture {
            hapticGenerator.impactOccurred()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                selectedTab = tag
            }
        }
    }
}