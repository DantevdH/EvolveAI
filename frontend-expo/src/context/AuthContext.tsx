import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { AuthService, AuthState } from '@/src/services/authService';
import { UserService } from '@/src/services/userService';
import { UserProfile, WorkoutPlan } from '@/src/types';
import { supabase } from '@/src/config/supabase';

// Simplified auth state interface
interface SimpleAuthState {
  user: any | null;
  userProfile: UserProfile | null;
  workoutPlan: WorkoutPlan | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Simplified auth actions
type SimpleAuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_WORKOUT_PLAN'; payload: WorkoutPlan | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'CLEAR_AUTH' };

// Simplified initial state
const initialState: SimpleAuthState = {
  user: null,
  userProfile: null,
  workoutPlan: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Simplified auth reducer
const authReducer = (state: SimpleAuthState, action: SimpleAuthAction): SimpleAuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfile: action.payload,
      };
    case 'SET_WORKOUT_PLAN':
      return {
        ...state,
        workoutPlan: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
      };
    case 'CLEAR_AUTH':
      return {
        ...initialState,
        isInitialized: state.isInitialized, // Preserve initialization state
      };
    default:
      return state;
  }
};

// Auth context type
interface AuthContextType {
  state: SimpleAuthState;
  
  // Authentication methods
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  signInWithFacebook: () => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  
  // User profile methods
  createUserProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateUserProfile: (updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
  
  // Workout plan methods
  // generateWorkoutPlan: () => Promise<boolean>; // REMOVED: Use GeneratePlanScreen instead
  refreshWorkoutPlan: () => Promise<void>;
  setWorkoutPlan: (workoutPlan: WorkoutPlan) => void;
  
  // Utility methods
  clearError: () => void;
  checkAuthState: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  markOnboardingComplete: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Simplified user profile loading
  const loadUserProfile = useCallback(async (userId: string) => {
    // Prevent multiple simultaneous calls
    if (state.isLoading) {
      console.log('AuthContext: Profile loading already in progress, skipping duplicate call');
      return;
    }

    try {
      console.log('AuthContext: Loading user profile for user:', userId);
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await UserService.getUserProfile(userId);
      
      if (response.success) {
        dispatch({ type: 'SET_USER_PROFILE', payload: response.data || null });
        
        // Load workout plan if user profile exists
        if (response.data) {
          try {
            const { WorkoutService } = await import('../services/workoutService');
            const workoutResult = await WorkoutService.getWorkoutPlan(response.data.id!);
            dispatch({ type: 'SET_WORKOUT_PLAN', payload: workoutResult.success ? workoutResult.data || null : null });
          } catch (workoutError) {
            console.error('AuthContext: Error loading workout plan:', workoutError);
            dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
          }
        } else {
          dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
        }
      } else {
        console.log('AuthContext: Error loading user profile:', response.error);
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load user profile' });
      }
    } catch (error) {
      console.error('Load user profile error:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load user profile' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.isLoading]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth state...');
        console.log('AuthContext: Supabase client:', supabase);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthContext: Session response:', { session, error });
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          dispatch({ type: 'SET_ERROR', payload: error.message });
        } else if (session) {
          console.log('AuthContext: Found existing session:', session.user?.email);
          dispatch({ type: 'SET_USER', payload: session.user });
          
          // Load user profile if we have a session
          if (session.user) {
            await loadUserProfile(session.user.id);
          }
        } else {
          console.log('AuthContext: No existing session found');
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
      } finally {
        console.log('AuthContext: Setting initialized to true');
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    };

    initializeAuth();
  }, []);

  // Single auth state listener - handles all auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in');
        dispatch({ type: 'SET_USER', payload: session.user });
        
        // Check if OAuth user needs email verification (not for email signup)
        if (session.user && !session.user.email_confirmed_at && session.user.app_metadata?.provider !== 'email') {
          console.log('AuthContext: OAuth user needs email verification, not loading profile yet');
          return; // Don't load profile until email is verified
        }
        
        // Only load profile if we don't already have one for this user and not currently loading
        if ((!state.userProfile || state.userProfile.userId !== session.user.id) && !state.isLoading) {
          await loadUserProfile(session.user.id);
        } else {
          console.log('AuthContext: User profile already loaded or loading in progress, skipping duplicate load');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('❌ User signed out');
        dispatch({ type: 'CLEAR_AUTH' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, state.userProfile, state.isLoading]);

  // Force clear all authentication data
  const forceSignOut = async () => {
    console.log('🔐 Force signing out...');
    try {
      await AuthService.signOut();
      dispatch({ type: 'CLEAR_AUTH' });
      console.log('🔐 Force sign out complete');
    } catch (error) {
      console.error('💥 Force sign out error:', error);
    }
  };

  // Sign in with email
  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.signInWithEmail({ email, password });

      if (response.success && response.user) {
        dispatch({ type: 'SET_USER', payload: response.user });
        await loadUserProfile(response.user.id);
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Sign in failed' });
        return false;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sign up with email
  const signUpWithEmail = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.signUpWithEmail({ email, password, name });

      if (response.success) {
        if (response.user && response.session) {
          // User is immediately signed in (rare case)
          dispatch({ type: 'SET_USER', payload: response.user });
          await loadUserProfile(response.user.id);
        } else if (response.user && !response.session) {
          // User needs to verify email - don't set user or load profile
          console.log('AuthContext: User needs email verification, not setting user state');
        }
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Sign up failed' });
        return false;
      }
    } catch (error) {
      console.error('Sign up error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.signInWithGoogle();

      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Google sign in failed' });
        return false;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sign in with Apple
  const signInWithApple = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.signInWithApple();

      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Apple sign in failed' });
        return false;
      }
    } catch (error) {
      console.error('Apple sign in error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sign in with Facebook
  const signInWithFacebook = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.signInWithFacebook();

      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Facebook sign in failed' });
        return false;
      }
    } catch (error) {
      console.error('Facebook sign in error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await AuthService.signOut();
      dispatch({ type: 'CLEAR_AUTH' });
    } catch (error) {
      console.error('Sign out error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Sign out failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.resetPassword(email);

      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Password reset failed' });
        return false;
      }
    } catch (error) {
      console.error('Reset password error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.resendVerificationEmail(email);

      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to resend verification email' });
        return false;
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update password
  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.updatePassword(newPassword);

      if (response.success) {
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Password update failed' });
        return false;
      }
    } catch (error) {
      console.error('Update password error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Create user profile
  const createUserProfile = async (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Note: This method is deprecated in favor of the new createUserProfile method
      // that takes userId and profileData separately
      console.warn('createUserProfile method is deprecated. Use the new method in UserService.');
      
      const response = await UserService.createUserProfile(profile.userId || '', profile);

      if (response.success && response.data) {
        // The new method returns { id: number }, so we need to fetch the full profile
        const fullProfileResponse = await UserService.getUserProfile(profile.userId || '');
        if (fullProfileResponse.success && fullProfileResponse.data) {
          dispatch({ type: 'SET_USER_PROFILE', payload: fullProfileResponse.data });
        }
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to create profile' });
        return false;
      }
    } catch (error) {
      console.error('Create user profile error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (!state.user) {
        dispatch({ type: 'SET_ERROR', payload: 'No authenticated user' });
        return false;
      }

      const response = await UserService.updateUserProfile(state.user.id, updates);

      if (response.success && response.data) {
        dispatch({ type: 'SET_USER_PROFILE', payload: response.data });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to update profile' });
        return false;
      }
    } catch (error) {
      console.error('Update user profile error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Refresh user profile
  const refreshUserProfile = async (): Promise<void> => {
    if (state.user) {
      await loadUserProfile(state.user.id);
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Check auth state
  const checkAuthState = async (): Promise<void> => {
    // Auth state is now handled automatically by the listener
    console.log('Auth state check - current user:', state.user ? 'authenticated' : 'not authenticated');
  };

  // Get current user
  const getCurrentUser = async (): Promise<any> => {
    return await AuthService.getCurrentUser();
  };

  // Mark onboarding as complete
  const markOnboardingComplete = async (): Promise<void> => {
    // Onboarding completion is now determined by the presence of userProfile
    console.log('Onboarding completion is determined by userProfile existence');
  };

  // Generate workout plan
  // REMOVED: generateWorkoutPlan function
  // This has been replaced by GeneratePlanScreen.handleGeneratePlan() which uses the backend flow

  // Refresh workout plan
  const refreshWorkoutPlan = async (): Promise<void> => {
    try {
      if (!state.userProfile) {
        return;
      }

      console.log('AuthContext: Refreshing workout plan for user:', state.userProfile.userId);

      // Import WorkoutService dynamically to avoid circular dependencies
      const { WorkoutService } = await import('../services/workoutService');
      
      const result = await WorkoutService.getWorkoutPlan(state.userProfile.id!);
      
      if (result.success && result.data) {
        dispatch({ type: 'SET_WORKOUT_PLAN', payload: result.data });
        console.log('AuthContext: Workout plan refreshed successfully');
      } else {
        // No workout plan found, clear it
        dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
        console.log('AuthContext: No workout plan found, cleared from state');
      }
    } catch (error) {
      console.error('Failed to refresh workout plan:', error);
      throw error;
    }
  };

  // Set workout plan directly (for use after generation)
  const setWorkoutPlan = (workoutPlan: WorkoutPlan): void => {
    console.log('AuthContext: Setting workout plan directly:', workoutPlan);
    dispatch({ type: 'SET_WORKOUT_PLAN', payload: workoutPlan });
  };

  const contextValue: AuthContextType = {
    state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signOut,
    resetPassword,
    resendVerificationEmail,
    updatePassword,
    createUserProfile,
    updateUserProfile,
    refreshUserProfile,
    // generateWorkoutPlan, // REMOVED: Use GeneratePlanScreen instead
    refreshWorkoutPlan,
    setWorkoutPlan,
    clearError,
    checkAuthState,
    getCurrentUser,
    markOnboardingComplete,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
