import SwiftUI
import Combine

struct MainTabView: View {
    
    // The View holds the ViewModel as its single source of truth for state.
    @StateObject private var viewModel: MainTabViewModel
    
    // The selected tab is pure UI state, so @State is appropriate here.
    @State private var selectedTab = 0
    
    // Haptic feedback generator for tab taps.
    private let hapticGenerator = UIImpactFeedbackGenerator(style: .light)
    
    // 6. The View's initializer is now responsible for dependency injection.
    init(userManager: UserManager, workoutManager: WorkoutManager) {
        _viewModel = StateObject(wrappedValue: MainTabViewModel(
            userManager: userManager,
            workoutManager: workoutManager
        ))
    }
    
    var body: some View {
        
        Group {
            // The View is now a simple "renderer" for the ViewModel's state.
            switch viewModel.viewState {
            case .loading:
                loadingView
                
            case .loaded(let plan):
                loadedView(with: plan)
                
            case .error(let message):
                errorView(with: message)
            }
        }
        .background(Color.evolveBackground.ignoresSafeArea())
        .animation(.easeInOut, value: viewModel.viewState)
    }
    
    private var loadingView: some View {
        ZStack {
            Color.evolveBackground.ignoresSafeArea()
            VStack {
                ProgressView("Loading Your Plan...")
                    .progressViewStyle(CircularProgressViewStyle(tint: .evolvePrimary))
                    .foregroundStyle(Color.evolveText)
            }
        }
    }
    
    private func loadedView(with plan: WorkoutPlan) -> some View {
        
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                DashboardView().tag(0)
                WorkoutView(plan: plan).tag(1)
                NutritionView().tag(2)
//                ProfileView().tag(3)
            }
            .toolbar(.hidden, for: .tabBar)
            
            customTabBar
        }
        .background(Color.evolveBackground)
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }
    
    private func errorView(with message: String) -> some View {
        ErrorView(message: message, retryAction: {
            viewModel.fetchWorkoutPlan() // The View tells the ViewModel to act.
        })
    }
    
    private var customTabBar: some View {
            HStack(spacing: 0) {
                tabBarItem(icon: "house.fill", label: "Home", tag: 0)
                tabBarItem(icon: "figure.strengthtraining.functional", label: "Training", tag: 1)
                tabBarItem(icon: "leaf.fill", label: "Nutrition", tag: 2)
                tabBarItem(icon: "person.fill", label: "Profile", tag: 3)
            }
            // 3. Decrease height by adjusting vertical padding
            .padding(.vertical, 10)
            .padding(.horizontal)
            .background(
                Color.evolveCard
            )
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


#Preview("Loaded State") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    workoutManager.workoutPlan = mockWorkoutPlan
    workoutManager.isLoading = false
    
    return MainTabView(userManager: userManager, workoutManager: workoutManager)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
        .background(Color.evolveBackground.ignoresSafeArea())
}

#Preview("Error State") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    workoutManager.isLoading = false
    workoutManager.errorMessage = "Network connection timed out."
    
    return MainTabView(userManager: userManager, workoutManager: workoutManager)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
        .background(Color.evolveBackground)
}

#Preview("Loading State") {
    let userManager = UserManager()
    let workoutManager = WorkoutManager()
    workoutManager.isLoading = true
    
    return MainTabView(userManager: userManager, workoutManager: workoutManager)
        .environmentObject(userManager)
        .environmentObject(workoutManager)
        .background(Color.evolveBackground)
}
