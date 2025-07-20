//
//  MainTabViewModel.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 20/07/2025.
//

import SwiftUI
import Combine

// MARK: - View Model

class MainTabViewModel: ObservableObject {
    
    // 1. A single, robust enum to represent all possible UI states.
    enum ViewState: Equatable {
        // We need Equatable for the animation modifier and for easier testing.
        static func == (lhs: MainTabViewModel.ViewState, rhs: MainTabViewModel.ViewState) -> Bool {
            switch (lhs, rhs) {
            case (.loading, .loading):
                return true
            case (.loaded(let lhsPlan), .loaded(let rhsPlan)):
                return lhsPlan.id == rhsPlan.id // Assuming WorkoutPlan is identifiable
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
        // Prevent redundant fetches.
        guard viewState != .loading else { return }
        
        guard let authToken = userManager.authToken else {
            self.viewState = .error(message: "Authentication token not found.")
            return
        }
        
        // The ViewModel now controls the loading state.
        self.viewState = .loading
        workoutManager.fetchWorkoutPlan(authToken: authToken)
    }
    
    private func setupSubscriptions() {
        workoutManager.$workoutPlan
            .combineLatest(workoutManager.$isLoading, workoutManager.$errorMessage)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] (plan, isLoading, errorMessage) in
                guard let self = self else { return }
                
                // 5. All presentation logic is now cleanly contained in the ViewModel.
                if isLoading {
                    self.viewState = .loading
                    return
                }
                
                if let errorMessage = errorMessage {
                    self.viewState = .error(message: errorMessage)
                    return
                }
                
                if let plan = plan {
                    self.viewState = .loaded(plan: plan)
                } else {
                    // This case handles when loading is false but there's no plan and no error.
                    self.viewState = .error(message: "Could not load your workout plan.")
                }
            }
            .store(in: &cancellables)
    }
}
