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
                print("Comparing plans: \(lhsPlan.id) == \(rhsPlan.id)")
                return lhsPlan.id == rhsPlan.id
            case (.error(let lhsMessage), .error(let rhsMessage)):
                return lhsMessage == rhsMessage
            default:
                return false
            }
        }
        
        case loading
        case loaded(plan: WorkoutPlan)
        case noPlan
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
        // All properties are now initialized, so it's safe to use self.
        setupSubscriptions()
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
            workoutManager.fetchWorkoutPlan(authToken: "DEBUG_MOCK_TOKEN")
            return
        #endif

        // --- Real Authentication Check for RELEASE builds ---
        // This code will only run for your final App Store (Release) builds.
        guard let authToken = userManager.authToken else {
            self.viewState = .error(message: "Authentication token not found.")
            return
        }
        
        // The WorkoutManager is now the single source of truth for loading state.
        workoutManager.fetchWorkoutPlan(authToken: authToken)
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
        if let errorMessage = workoutManager.errorMessage {
            print("Error state: \(errorMessage)")
            self.viewState = .error(message: errorMessage)
            return
        }

        if let plan = workoutManager.workoutPlan {
            print("WorkoutPlan loaded. isEmpty: \(plan.isEmpty)")
            if plan.isEmpty {
                self.viewState = .noPlan
            } else {
                print("Setting viewState to .loaded")
                self.viewState = .loaded(plan: plan)
                print(self.viewState)
            }
            return
        }

        if workoutManager.isLoading {
            print("Still loading...")
            self.viewState = .loading
            return
        }

        print("No plan and not loading.")
        self.viewState = .noPlan
    }
}
