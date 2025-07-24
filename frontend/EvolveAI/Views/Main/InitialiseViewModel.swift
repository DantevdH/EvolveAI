//
//  StartViewModel.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 20/07/2025.
//

import SwiftUI
import Combine

// The ViewModel orchestrates the view's state.
class InitialiseViewModel: ObservableObject {
    
    // The ViewState enum remains the same.
    enum ViewState: Equatable {
        case loading
        case loggedOut
        case needsOnboarding
        case loggedIn
    }
    
    // The property is still private(set) for the main app logic.
    // Add the didSet block here
    @Published private(set) var viewState: ViewState {
        didSet {
            // This print statement will now run every time the viewState changes,
            // without causing any UI errors.
            print("App state changed to: \(viewState)")
        }
    }
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Main Initializer
    // This is the initializer your actual app will use.
    init(userManager: UserManager) { // Also, this init should likely only take userManager
        // 1. Give all properties an initial value FIRST. This fixes the error.
        self.viewState = .loading
        
        // 2. Now that everything is initialized, you can safely call methods.
        setupSubscriptions(userManager: userManager)
        
        // 3. Start the check.
        userManager.checkAuthenticationState()
    }
    
    private func setupSubscriptions(userManager: UserManager) {
        userManager.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self = self else { return }

                if userManager.isLoading {
                    self.viewState = .loading
                } else if userManager.authToken == nil {
                    self.viewState = .loggedOut
                } else if userManager.userProfile == nil {
                    // If there's a token but no profile, they need to create a profile.
                    self.viewState = .needsOnboarding
                } else {
                    // A profile exists! The user is considered "logged in".
                    // The MainTabView will now handle fetching/checking for the workout plan.
                    self.viewState = .loggedIn
                }
            }
            .store(in: &cancellables)
    }
    
    #if DEBUG
    init(forPreviewing viewState: ViewState) {
        self.viewState = viewState
    }
    #endif
}
