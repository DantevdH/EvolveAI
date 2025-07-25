//
//  MainTabViewModel.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 20/07/2025.
//

import SwiftUI
import Combine

class MainTabViewModel: ObservableObject {
    
    // 1. A single, robust enum to represent all possible UI states.
    enum ViewState: Equatable {
        // We need Equatable for the animation modifier and for easier testing.
        static func == (lhs: MainTabViewModel.ViewState, rhs: MainTabViewModel.ViewState) -> Bool {
            switch (lhs, rhs) {
            case (.loading, .loading):
                return true
            case (.loaded(let lhsPlan), .loaded(let rhsPlan)):
                // Make sure your WorkoutPlan model is Equatable, comparing by ID is best.
                return lhsPlan.id == rhsPlan.id
            case (.error(let lhsMessage), .error(let rhsMessage)):
                return lhsMessage == rhsMessage
            default:
                return false
            }
        }
        
        case loading
        case loaded(plan: WorkoutPlan)
        case error(message: String)
    }
    
    @Published private(set) var viewState: ViewState = .loading
    
    // 2. Dependencies are injected for testability and clear ownership.
    private let userManager: UserManager
    private let workoutManager: WorkoutManager
    private var cancellables = Set<AnyCancellable>()
    
    init(userManager: UserManager, workoutManager: WorkoutManager) {
        self.userManager = userManager
        self.workoutManager = workoutManager
        
        // 3. The ViewModel subscribes to changes from the manager.
        setupSubscriptions()
        
        // 4. The ViewModel, not the View, triggers the initial data fetch.
        fetchWorkoutPlan()
    }
    
    // The public interface for the View to trigger a refresh.
    func fetchWorkoutPlan() {
        // Prevent redundant fetches if already loading.
        guard !workoutManager.isLoading else { return }

        // This block is ONLY compiled for Debug builds (i.e., when running from Xcode,
        // including Previews). It will be completely removed from your final App Store release.
        #if DEBUG
        print("--- ViewModel is in DEBUG mode, bypassing real auth token check. ---")
        workoutManager.fetchPlan(authToken: "DEBUG_MOCK_TOKEN")
        return
        #endif

        // --- Real Authentication Check for RELEASE builds ---
        // This code will only run for your final App Store (Release) builds.
        guard let authToken = userManager.authToken else {
            self.viewState = .error(message: "Authentication token not found.")
            return
        }
        
        // The WorkoutManager is now the single source of truth for loading state.
        workoutManager.fetchPlan(authToken: authToken)
    }
    
    private func setupSubscriptions() {
        workoutManager.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateViewState()
            }
            .store(in: &cancellables)
    }

    /// This function contains the corrected logic to determine the view state.
    private func updateViewState() {
        // Priority 1: If there's an explicit error message, always show it.
        if let errorMessage = workoutManager.errorMessage {
            self.viewState = .error(message: errorMessage)
            return
        }
        
        // Priority 2: If a plan has been loaded, show it.
        // This ensures that even if a background refresh is happening, the user still sees their data.
        if let plan = workoutManager.workoutPlan {
            self.viewState = .loaded(plan: plan)
            return
        }
        
        // Priority 3: If there's no plan yet and we are actively loading, show the spinner.
        if workoutManager.isLoading {
            self.viewState = .loading
            return
        }
        
        // Fallback: If not loading, no error, and still no plan, then we show the generic error.
        // This state is now only reached after the network request has definitively finished without success.
        self.viewState = .error(message: "Could not load your workout plan.")
    }
}
