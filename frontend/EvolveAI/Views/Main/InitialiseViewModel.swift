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
    init(userManager: UserManager) {
        // Set the initial state
        self.viewState = .loading
        
        // Set up the reactive subscriptions
        setupSubscriptions(userManager: userManager)
        
        // Trigger the initial check
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
                } else if !userManager.isOnboardingComplete {
                    self.viewState = .needsOnboarding
                } else {
                    self.viewState = .loggedIn
                }
            }
            .store(in: &cancellables)
    }
    
    
    // MARK: - Preview/Testing Initializer
    // 1. We add a new initializer specifically for development.
    // 2. The #if DEBUG flag ensures this code is ONLY included in
    //    Debug builds (like Previews) and is completely removed
    //    from your final App Store release.
    #if DEBUG
    init(forPreviewing viewState: ViewState) {
        self.viewState = viewState
    }
    #endif
}
