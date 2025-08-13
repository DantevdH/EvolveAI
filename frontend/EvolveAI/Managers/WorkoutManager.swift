//
//  WorkoutManager.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation
import Combine
import Supabase

// MARK: - WorkoutManager Protocol
protocol WorkoutManagerProtocol: AnyObject {
    var workoutPlan: WorkoutPlan? { get }
    var completeWorkoutPlan: CompleteWorkoutPlan? { get }
    var isLoading: Bool { get }
    var errorMessage: String? { get }
    var coaches: [Coach] { get }
    var selectedCoach: Coach? { get }
    var isCoachesLoading: Bool { get }
    var coachesErrorMessage: String? { get }
    
    func fetchExistingPlan(userProfileId: Int?, completion: @escaping (Bool) -> Void)
    func createAndProvidePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void)
    func updateExerciseCompletion(exerciseId: Int, isCompleted: Bool, weekNumber: Int)
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void)
}

class WorkoutManager: ObservableObject, WorkoutManagerProtocol {
    
    @Published var workoutPlan: WorkoutPlan?
    @Published var completeWorkoutPlan: CompleteWorkoutPlan?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Progress tracking
    @Published var pendingUpdates: [ExerciseProgressUpdate] = []
    private var updateTimer: Timer?
    private let updateDelay: TimeInterval = 2.0 // 2 seconds delay for batch updates
    
    // Add operation tracking for cancellation
    private var currentTask: Task<Void, Never>?
    private var currentOperation: WorkoutOperation?
    private var isOperationInProgress = false
    
    // Add retry logic
    private var currentRetryCount: Int = 0
    private var maxRetryAttempts: Int = 3
    private var lastError: Error?
    private var retryableOperations: [WorkoutOperation] = []
    
    // Add context storage for retry operations
    private var retryContexts: [WorkoutOperation: RetryContext] = [:]
    
    @Published var coaches: [Coach] = []
    @Published var selectedCoach: Coach? = nil
    @Published var isCoachesLoading = false
    @Published var coachesErrorMessage: String? = nil
    
    private var cancellables = Set<AnyCancellable>()
    private let networkService: NetworkServiceProtocol

    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
    }
    
    // MARK: - Cleanup Methods
    
    /// Manually cleanup resources when needed
    func cleanup() {
        updateTimer?.invalidate()
        updateTimer = nil
        pendingUpdates.removeAll()
        
        // Cancel any ongoing operations
        cancelCurrentOperation()
        
        // Clear retry state
        clearRetryState()
    }
    
    /// Cancels the current ongoing operation
    func cancelCurrentOperation() {
        print("[WorkoutManager] Cancelling current operation: \(currentOperation?.description ?? "none")")
        
        // Cancel the current task
        currentTask?.cancel()
        currentTask = nil
        
        // Reset operation state
        currentOperation = nil
        isOperationInProgress = false
        
        // Reset loading states
        isLoading = false
        isCoachesLoading = false
        
        // Clear error messages
        errorMessage = nil
        coachesErrorMessage = nil
        
        print("[WorkoutManager] Operation cancelled and state reset")
    }
    
    /// Checks if an operation can be cancelled
    var canCancelOperation: Bool {
        return isOperationInProgress && currentTask != nil
    }
    
    // MARK: - Retry Logic
    
    /// Attempts to retry the last failed operation
    func retryLastOperation() {
        guard let lastOperation = retryableOperations.last else {
            print("[WorkoutManager] No retryable operation available")
            return
        }
        
        print("[WorkoutManager] Retrying operation: \(lastOperation.description)")
        
        // Reset retry count for manual retry
        currentRetryCount = 0
        
        // Execute the operation
        executeOperation(lastOperation)
    }
    
    /// Attempts automatic retry of the current operation
    private func attemptAutoRetry(for operation: WorkoutOperation) {
        guard currentRetryCount < maxRetryAttempts else {
            print("[WorkoutManager] Max retry attempts reached for \(operation.description)")
            handleMaxRetriesReached(for: operation)
            return
        }
        
        currentRetryCount += 1
        print("[WorkoutManager] Auto-retry attempt \(currentRetryCount)/\(maxRetryAttempts) for \(operation.description)")
        
        // Add delay before retry (exponential backoff)
        let delay = TimeInterval(pow(2.0, Double(currentRetryCount - 1))) // 1s, 2s, 4s
        
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.executeOperation(operation)
        }
    }
    
    /// Executes a specific workout operation
    private func executeOperation(_ operation: WorkoutOperation) {
        print("[WorkoutManager] Executing operation: \(operation.description)")
        
        switch operation {
        case .fetchPlan:
            executeFetchPlan()
        case .generatePlan:
            executeGeneratePlan()
        case .fetchCoaches:
            executeFetchCoaches()
        case .updateProgress:
            print("[WorkoutManager] Update progress retry not implemented - requires exercise data")
        @unknown default:
            print("[WorkoutManager] Unknown operation type: \(operation)")
        }
    }
    
    /// Executes fetch plan operation with retry logic
    private func executeFetchPlan() {
        guard let context = retryContexts[.fetchPlan] else {
            print("[WorkoutManager] No context found for fetch plan retry")
            errorMessage = "Retry failed: Missing context for fetch plan"
            return
        }
        
        print("[WorkoutManager] Retrying fetch plan operation with userProfileId: \(context.userProfileId?.description ?? "nil")")
        
        // Execute the fetch with stored context
        fetchExistingPlan(userProfileId: context.userProfileId) { [weak self] success in
            if !success {
                print("[WorkoutManager] Fetch plan retry failed")
            }
        }
    }
    
    /// Executes generate plan operation with retry logic
    private func executeGeneratePlan() {
        guard let context = retryContexts[.generatePlan], let userProfile = context.userProfile else {
            print("[WorkoutManager] No context found for generate plan retry")
            errorMessage = "Retry failed: Missing context for generate plan"
            return
        }
        
        print("[WorkoutManager] Retrying generate plan operation for user: \(userProfile.username)")
        
        // Execute the plan generation with stored context
        createAndProvidePlan(for: userProfile) { [weak self] success in
            if !success {
                print("[WorkoutManager] Generate plan retry failed")
            }
        }
    }
    
    /// Executes fetch coaches operation with retry logic
    private func executeFetchCoaches() {
        guard let context = retryContexts[.fetchCoaches], let userGoal = context.userGoal else {
            print("[WorkoutManager] No context found for fetch coaches retry")
            errorMessage = "Retry failed: Missing context for fetch coaches"
            return
        }
        
        print("[WorkoutManager] Retrying fetch coaches operation for goal: \(userGoal)")
        
        // Execute the coach fetch with stored context
        fetchCoaches(userGoal: userGoal) { [weak self] success in
            if !success {
                print("[WorkoutManager] Fetch coaches retry failed")
            }
        }
    }
    
    /// Determines if an operation should be retried based on the error
    private func shouldRetryOperation(error: Error) -> Bool {
        // Retry on network errors, server errors, but not on validation errors
        let nsError = error as NSError
        
        // Retry on network-related errors
        if nsError.domain == NSURLErrorDomain {
            return true
        }
        
        // Retry on server errors (5xx)
        if let httpResponse = nsError.userInfo["_response"] as? HTTPURLResponse {
            return (500...599).contains(httpResponse.statusCode)
        }
        
        // Don't retry on client errors (4xx)
        if let httpResponse = nsError.userInfo["_response"] as? HTTPURLResponse {
            return !(400...499).contains(httpResponse.statusCode)
        }
        
        // Default to retrying
        return true
    }
    
    /// Stores an operation for potential retry
    private func storeRetryableOperation(_ operation: WorkoutOperation, context: RetryContext? = nil) {
        // Remove any existing operations of the same type
        retryableOperations.removeAll { existingOperation in
            return existingOperation == operation
        }
        
        retryableOperations.append(operation)
        
        // Store context if provided
        if let context = context {
            retryContexts[operation] = context
        }
        
        lastError = lastError ?? NSError(domain: "WorkoutManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unknown error"])
    }
    
    /// Handles when max retries are reached
    private func handleMaxRetriesReached(for operation: WorkoutOperation) {
        print("[WorkoutManager] Max retries reached for \(operation.description)")
        
        // Clean up operation state
        cancelCurrentOperation()
        
        // Set final error message
        errorMessage = "\(operation.description) failed after \(maxRetryAttempts) attempts. Please try again later."
        isLoading = false
        isCoachesLoading = false
        
        // Clear retry state
        clearRetryState()
    }
    
    /// Clears retry state
    private func clearRetryState() {
        currentRetryCount = 0
        lastError = nil
        retryableOperations.removeAll()
        retryContexts.removeAll()
    }
    
    /// Gets current retry information for UI
    var retryInfo: (canRetry: Bool, retryCount: Int, maxRetries: Int) {
        return (
            canRetry: !retryableOperations.isEmpty && currentRetryCount < maxRetryAttempts,
            retryCount: currentRetryCount,
            maxRetries: maxRetryAttempts
        )
    }
    
    /// Gets the context for the last retryable operation
    var lastRetryContext: RetryContext? {
        guard let lastOperation = retryableOperations.last else { return nil }
        return retryContexts[lastOperation]
    }
    
    /// Gets detailed retry information including operation type and context
    var detailedRetryInfo: (canRetry: Bool, operation: WorkoutOperation?, context: RetryContext?, retryCount: Int, maxRetries: Int) {
        guard let lastOperation = retryableOperations.last else {
            return (canRetry: false, operation: nil, context: nil, retryCount: currentRetryCount, maxRetries: maxRetryAttempts)
        }
        
        let context = retryContexts[lastOperation]
        let canRetry = currentRetryCount < maxRetryAttempts
        
        return (
            canRetry: canRetry,
            operation: lastOperation,
            context: context,
            retryCount: currentRetryCount,
            maxRetries: maxRetryAttempts
        )
    }
    
    // MARK: - Business Logic Validation Methods
    
    /// Checks if the workout manager needs to fetch a plan
    func needsPlan() -> Bool {
        return workoutPlan == nil && !isLoading
    }
    
    /// Checks if the workout manager has a complete plan
    func hasCompletePlan() -> Bool {
        return workoutPlan != nil && completeWorkoutPlan != nil
    }
    
    /// Checks if coaches need to be fetched
    func needsCoaches() -> Bool {
        return selectedCoach == nil && coaches.isEmpty && !isCoachesLoading
    }
    
    /// Validates if the current state supports the requested operation
    func canPerformOperation(_ operation: WorkoutOperation) -> Bool {
        switch operation {
        case .fetchPlan:
            return !isLoading
        case .generatePlan:
            return !isLoading && !hasCompletePlan()
        case .fetchCoaches:
            return !isCoachesLoading
        case .updateProgress:
            return hasCompletePlan()
        }
    }
    
    /// Gets the current workout plan safely
    func getCurrentWorkoutPlan() -> WorkoutPlan? {
        return workoutPlan
    }
    
    /// Gets the selected coach safely
    func getSelectedCoach() -> Coach? {
        return selectedCoach
    }
    
    deinit {
        print("[DEINIT] WorkoutManager deinitialized: \(Unmanaged.passUnretained(self).toOpaque())")
        // Ensure timer is invalidated to prevent memory leaks
        updateTimer?.invalidate()
        updateTimer = nil
        
        // Cancel any ongoing operations
        cancelCurrentOperation()
        
        // Clear retry state
        clearRetryState()
    }
    
    /// Fetches the list of coaches from Supabase
    func fetchCoaches(userGoal: String, completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] fetchCoaches called with userGoal: \(userGoal)")
        
        // Prevent multiple operations
        guard !isOperationInProgress else {
            print("[WorkoutManager] Operation already in progress, ignoring fetchCoaches request")
            completion(false)
            return
        }

        // Set operation state
        currentOperation = .fetchCoaches
        isOperationInProgress = true
        
        DispatchQueue.main.async { [weak self] in
            self?.isCoachesLoading = true
            self?.coachesErrorMessage = nil
        }
        
        // Create cancellable task
        currentTask = Task {
            do {
                let response: [Coach] = try await supabase.database
                    .from("coaches")
                    .select()
                    .execute()
                    .value
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] fetchCoaches task was cancelled")
                    return
                }
                
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = response
                    self.selectedCoach = response.first(where: { $0.goal == userGoal })
                    
                    // Clear operation state
                    self.currentTask = nil
                    self.currentOperation = nil
                    self.isOperationInProgress = false
                    
                    completion(self.selectedCoach != nil)
                }
            } catch {
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] fetchCoaches task was cancelled due to error")
                    return
                }
                
                await MainActor.run {
                    self.isCoachesLoading = false
                    self.coaches = []
                    self.selectedCoach = nil
                    self.coachesErrorMessage = "Failed to fetch coaches: \(error.localizedDescription)"
                    
                    // Store operation for potential retry
                    self.storeRetryableOperation(.fetchCoaches, context: RetryContext(userGoal: userGoal))
                    
                    // Check if we should retry
                    if self.shouldRetryOperation(error: error) {
                        print("[WorkoutManager] fetchCoaches failed, attempting auto-retry")
                        self.attemptAutoRetry(for: .fetchCoaches)
                    } else {
                        print("[WorkoutManager] fetchCoaches failed, not retryable")
                        // Clear operation state
                        self.currentTask = nil
                        self.currentOperation = nil
                        self.isOperationInProgress = false
                    }
                    
                    completion(false)
                }
            }
        }
    }

    /// Creates a new workout plan for the user using the NetworkService
    func createAndProvidePlan(for profile: UserProfile, completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] createAndProvidePlan called")
        
        // Prevent multiple operations
        guard !isOperationInProgress else {
            print("[WorkoutManager] Operation already in progress, ignoring createAndProvidePlan request")
            completion(false)
            return
        }
        
        // Set operation state
        currentOperation = .generatePlan
        isOperationInProgress = true
        self.errorMessage = nil
        
        // Create cancellable task
        currentTask = Task {
            do {
                let session = try await supabase.auth.session
                let userId = session.user.id
                let userProfile = try await networkService.fetchUserProfile(for: userId)
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] createAndProvidePlan task was cancelled")
                    return
                }
                
                // Generate via FastAPI
                let generated = try await networkService.generateWorkoutPlanFromAPI(profile: profile)
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] createAndProvidePlan task was cancelled")
                    return
                }
                
                // Save to Supabase
                let savedWorkoutPlan = try await networkService.saveWorkoutPlanToDatabase(
                    generatedPlan: generated,
                    userProfile: userProfile
                )
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] createAndProvidePlan task was cancelled")
                    return
                }
                
                // Immediately fetch the complete structure so callers can proceed once fully ready
                let complete = try await networkService.fetchCompleteWorkoutPlan(for: savedWorkoutPlan)
                
                await MainActor.run {
                    self.workoutPlan = savedWorkoutPlan
                    self.completeWorkoutPlan = complete
                    self.isLoading = false
                    
                    // Clear operation state
                    self.currentTask = nil
                    self.currentOperation = nil
                    self.isOperationInProgress = false
                    
                    completion(true)
                }
            } catch {
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] createAndProvidePlan task was cancelled due to error")
                    return
                }
                
                await MainActor.run {
                    self.errorMessage = "Failed to create workout plan: \(error.localizedDescription)"
                    self.isLoading = false
                    
                    // Store operation for potential retry
                    self.storeRetryableOperation(.generatePlan, context: RetryContext(userProfile: profile))
                    
                    // Check if we should retry
                    if self.shouldRetryOperation(error: error) {
                        print("[WorkoutManager] createAndProvidePlan failed, attempting auto-retry")
                        self.attemptAutoRetry(for: .generatePlan)
                    } else {
                        print("[WorkoutManager] createAndProvidePlan failed, not retryable")
                        // Clear operation state
                        self.currentTask = nil
                        self.currentOperation = nil
                        self.isOperationInProgress = false
                    }
                    
                    completion(false)
                }
            }
        }
    }

    /// Fetches the existing workout plan for the authenticated user from Supabase
    func fetchExistingPlan(userProfileId: Int?, completion: @escaping (Bool) -> Void) {
        print("[WorkoutManager] fetchExistingPlan called")
        
        // Prevent multiple operations
        guard !isOperationInProgress else {
            print("[WorkoutManager] Operation already in progress, ignoring fetchExistingPlan request")
            completion(false)
            return
        }
        
        // Set operation state
        currentOperation = .fetchPlan
        isOperationInProgress = true
        
        DispatchQueue.main.async { [weak self] in
            self?.isLoading = true
            self?.errorMessage = nil
        }
        
        // Create cancellable task
        currentTask = Task {
            do {
                print("[WorkoutManager] fetchExistingPlan: Start (userProfileId=\(userProfileId?.description ?? "nil"))")
                // Get current session to get user ID
                let session = try await supabase.auth.session
                let userId = session.user.id
                print("[WorkoutManager] fetchExistingPlan: Have session for userId=\(userId)")
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] fetchExistingPlan task was cancelled")
                    return
                }
                
                let network = self.networkService
                
                // Resolve base plan
                let basePlan: WorkoutPlan?
                if let profileId = userProfileId {
                    print("[WorkoutManager] fetchExistingPlan: Using provided userProfileId=\(profileId)")
                    basePlan = try await network.fetchWorkoutPlans(userProfileId: profileId).first
                } else {
                    print("[WorkoutManager] fetchExistingPlan: No userProfileId provided, querying by userId join")
                    basePlan = try await network.fetchWorkoutPlansByUserIdJoin(userId: userId).first
                }
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] fetchExistingPlan task was cancelled")
                    return
                }
                
                guard let plan = basePlan else {
                    await MainActor.run {
                        self.isLoading = false
                        self.workoutPlan = nil
                        print("[WorkoutManager] No existing plan found for user \(userId)")
                        
                        // Clear operation state
                        self.currentTask = nil
                        self.currentOperation = nil
                        self.isOperationInProgress = false
                        
                        completion(false)
                    }
                    return
                }
                
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] fetchExistingPlan task was cancelled")
                    return
                }
                
                // Fetch complete structure
                let complete = try await network.fetchCompleteWorkoutPlan(for: plan)
                
                await MainActor.run {
                    self.isLoading = false
                    self.workoutPlan = plan
                    self.completeWorkoutPlan = complete
                    print("[WorkoutManager] Fetched complete plan for planId=\(plan.id)")
                    
                    // Clear operation state
                    self.currentTask = nil
                    self.currentOperation = nil
                    self.isOperationInProgress = false
                    
                    completion(true)
                }
            } catch {
                // Check if task was cancelled
                guard !Task.isCancelled else {
                    print("[WorkoutManager] fetchExistingPlan task was cancelled due to error")
                    return
                }
                
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = "Failed to fetch workout plan: \(error.localizedDescription)"
                    print("[WorkoutManager] fetchExistingPlan: ERROR: \(error.localizedDescription)")
                    
                    // Store operation for potential retry
                    self.storeRetryableOperation(.fetchPlan, context: RetryContext(userProfileId: userProfileId))
                    
                    // Check if we should retry
                    if self.shouldRetryOperation(error: error) {
                        print("[WorkoutManager] fetchExistingPlan failed, attempting auto-retry")
                        self.attemptAutoRetry(for: .fetchPlan)
                    } else {
                        print("[WorkoutManager] fetchExistingPlan failed, not retryable")
                        // Clear operation state
                        self.currentTask = nil
                        self.currentOperation = nil
                        self.isOperationInProgress = false
                    }
                    
                    completion(false)
                }
            }
        }
    }
    
    /// Updates exercise completion status with batch processing
    func updateExerciseCompletion(exerciseId: Int, isCompleted: Bool, weekNumber: Int) {
        let update = ExerciseProgressUpdate(
            exerciseId: exerciseId,
            isCompleted: isCompleted,
            weekNumber: weekNumber
        )
        
        // Add to pending updates
        if let existingIndex = pendingUpdates.firstIndex(where: { $0.exerciseId == exerciseId && $0.weekNumber == weekNumber }) {
            pendingUpdates[existingIndex] = update
        } else {
            pendingUpdates.append(update)
        }
        
        // Reset timer for batch processing
        updateTimer?.invalidate()
        updateTimer = Timer.scheduledTimer(withTimeInterval: updateDelay, repeats: false) { [weak self] _ in
            guard let self = self else { return }
            self.flushPendingUpdates()
        }
    }

    
    
    // MARK: - Private Methods
    
    private func flushPendingUpdates() {
        guard !pendingUpdates.isEmpty else { return }
        
        let updates = pendingUpdates
        pendingUpdates.removeAll()
        
        // For now, just log the updates since we don't have a progress tracking table yet
        print("Would update \(updates.count) exercise progress items: \(updates)")
        
        // TODO: Implement progress tracking in Supabase
        // This would involve creating a progress tracking table and updating it
    }
}

// MARK: - Workout Operations Enum
enum WorkoutOperation {
    case fetchPlan
    case generatePlan
    case fetchCoaches
    case updateProgress
    
    var description: String {
        switch self {
        case .fetchPlan:
            return "Fetch Plan"
        case .generatePlan:
            return "Generate Plan"
        case .fetchCoaches:
            return "Fetch Coaches"
        case .updateProgress:
            return "Update Progress"
        }
    }
}

// MARK: - Retry Context Models

/// Stores context needed to retry operations
struct RetryContext {
    let userProfileId: Int?
    let userGoal: String?
    let userProfile: UserProfile?
    
    init(userProfileId: Int? = nil, userGoal: String? = nil, userProfile: UserProfile? = nil) {
        self.userProfileId = userProfileId
        self.userGoal = userGoal
        self.userProfile = userProfile
    }
}
