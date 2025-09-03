import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { AuthService, AuthState } from '@/src/services/authService';
import { UserService } from '@/src/services/userService';
import { UserProfile, WorkoutPlan } from '@/src/types';
import { supabase } from '@/src/config/supabase';

// Enhanced auth state interface
interface EnhancedAuthState extends AuthState {
  userProfile: UserProfile | null;
  workoutPlan: WorkoutPlan | null;
  isOnboardingComplete: boolean;
  errorMessage: string | null;
  isInitialized: boolean;
  hasAttemptedLogin: boolean;
}

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_SESSION'; payload: any | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_WORKOUT_PLAN'; payload: WorkoutPlan | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_LOGIN_ATTEMPTED'; payload: boolean }
  | { type: 'SET_ONBOARDING_COMPLETE'; payload: boolean }
  | { type: 'CLEAR_AUTH' };

// Initial state
const initialState: EnhancedAuthState = {
  user: null,
  session: null,
  userProfile: null,
  workoutPlan: null,
  isLoading: false,
  isAuthenticated: false,
  isOnboardingComplete: false,
  errorMessage: null,
  isInitialized: false,
  hasAttemptedLogin: false,
};

// Auth reducer
const authReducer = (state: EnhancedAuthState, action: AuthAction): EnhancedAuthState => {
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
        isAuthenticated: !!action.payload,
      };
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload,
      };
    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfile: action.payload,
        isOnboardingComplete: !!action.payload,
      };
    case 'SET_WORKOUT_PLAN':
      return {
        ...state,
        workoutPlan: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        errorMessage: action.payload,
      };
    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
      };
    case 'SET_LOGIN_ATTEMPTED':
      return {
        ...state,
        hasAttemptedLogin: action.payload,
      };
    case 'SET_ONBOARDING_COMPLETE':
      return {
        ...state,
        isOnboardingComplete: action.payload,
      };
    case 'CLEAR_AUTH':
      console.log('🔐 CLEAR_AUTH action dispatched');
      const clearedState = {
        ...initialState,
        isInitialized: state.isInitialized, // Preserve the initialized state
        hasAttemptedLogin: state.hasAttemptedLogin, // Preserve login attempt state
      };
      console.log('🔐 CLEAR_AUTH new state:', {
        isAuthenticated: clearedState.isAuthenticated,
        hasUser: !!clearedState.user,
        hasSession: !!clearedState.session,
        isInitialized: clearedState.isInitialized,
        hasAttemptedLogin: clearedState.hasAttemptedLogin
      });
      return clearedState;
    default:
      return state;
  }
};

// Auth context type
interface AuthContextType {
  state: EnhancedAuthState;
  
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
  generateWorkoutPlan: () => Promise<boolean>;
  refreshWorkoutPlan: () => Promise<void>;
  
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

  // Load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await UserService.getUserProfile(userId);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_USER_PROFILE', payload: response.data });
        
        // Also load workout plan if user profile exists
        try {
          const { WorkoutService } = await import('../services/workoutService');
          const workoutResult = await WorkoutService.getWorkoutPlan(response.data.id!);
          
          if (workoutResult.success && workoutResult.data) {
            dispatch({ type: 'SET_WORKOUT_PLAN', payload: workoutResult.data });
            console.log('AuthContext: Loaded existing workout plan');
          } else {
            dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
            console.log('AuthContext: No existing workout plan found');
          }
        } catch (workoutError) {
          console.error('AuthContext: Error loading workout plan:', workoutError);
          dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
        }
      } else {
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
      }
    } catch (error) {
      console.error('Load user profile error:', error);
      dispatch({ type: 'SET_USER_PROFILE', payload: null });
      dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
    }
  }, []);

    // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🔐 Initializing authentication...');

      const session = await AuthService.getCurrentSession();
      console.log('🔐 Current session:', session ? 'Found' : 'Not found');
      console.log('🔐 Session details:', session);

      if (session && session.user) {
        console.log('✅ User authenticated:', session.user.email);
        dispatch({ type: 'SET_USER', payload: session.user });
        dispatch({ type: 'SET_SESSION', payload: session });
        await loadUserProfile(session.user.id);
      } else {
        console.log('❌ No session found, user not authenticated');
        console.log('🔐 Setting unauthenticated state...');
        // Set unauthenticated state without clearing everything
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_SESSION', payload: null });
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        console.log('🔐 Unauthenticated state set');
      }
    } catch (error) {
      console.error('💥 Auth initialization error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
      // Set unauthenticated state on error
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_SESSION', payload: null });
      dispatch({ type: 'SET_USER_PROFILE', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      console.log('🔐 Auth initialization complete');
    }
  }, [loadUserProfile]);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in via auth listener');
        dispatch({ type: 'SET_USER', payload: session.user });
        dispatch({ type: 'SET_SESSION', payload: session });
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('❌ User signed out via auth listener');
        // Only clear auth if we're not already in a cleared state AND we're not in the middle of a login attempt
        if ((state.isAuthenticated || state.user) && !state.isLoading) {
          console.log('🔐 Clearing auth state due to SIGNED_OUT event');
          dispatch({ type: 'CLEAR_AUTH' });
        } else {
          console.log('🔐 Ignoring SIGNED_OUT event - already cleared or loading');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, state.isAuthenticated, state.user, state.isLoading]);

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
      dispatch({ type: 'SET_LOGIN_ATTEMPTED', payload: true });

      console.log('🔐 Attempting to sign in with email:', email);
      
      const response = await AuthService.signInWithEmail({ email, password });
      console.log('🔐 AuthService response:', response);

      if (response.success && response.user) {
        console.log('✅ Sign in successful, user:', response.user.email);
        dispatch({ type: 'SET_USER', payload: response.user });
        dispatch({ type: 'SET_SESSION', payload: response.session });
        await loadUserProfile(response.user.id);
        return true;
      } else {
        console.log('❌ Sign in failed:', response.error);
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Sign in failed' });
        // Don't clear auth state immediately - let the error be displayed
        // The auth state listener will handle clearing if needed
        return false;
      }
    } catch (error) {
      console.error('💥 Sign in error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred' });
      // Don't clear auth state immediately - let the error be displayed
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
        if (response.user) {
          dispatch({ type: 'SET_USER', payload: response.user });
          dispatch({ type: 'SET_SESSION', payload: response.session });
          await loadUserProfile(response.user.id);
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

      const response = await UserService.createUserProfile(profile);

      if (response.success && response.data) {
        dispatch({ type: 'SET_USER_PROFILE', payload: response.data });
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
    dispatch({ type: 'SET_LOGIN_ATTEMPTED', payload: false });
  };

  // Check auth state
  const checkAuthState = async (): Promise<void> => {
    await initializeAuth();
  };

  // Get current user
  const getCurrentUser = async (): Promise<any> => {
    return await AuthService.getCurrentUser();
  };

  // Mark onboarding as complete
  const markOnboardingComplete = async (): Promise<void> => {
    try {
      // Here you would typically update the user profile in your backend
      // to mark onboarding as complete
      // For now, we'll just update the local state
      dispatch({ type: 'SET_ONBOARDING_COMPLETE', payload: true });
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      throw error;
    }
  };

  // Generate workout plan
  const generateWorkoutPlan = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (!state.userProfile) {
        throw new Error('No user profile found');
      }

      console.log('AuthContext: Generating workout plan for user:', state.userProfile.userId);

      // Import WorkoutService dynamically to avoid circular dependencies
      const { WorkoutService } = await import('../services/workoutService');
      
      const result = await WorkoutService.generateWorkoutPlan(state.userProfile);
      
      if (result.success && result.data) {
        dispatch({ type: 'SET_WORKOUT_PLAN', payload: result.data });
        console.log('AuthContext: Workout plan generated successfully');
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to generate workout plan' });
        return false;
      }
    } catch (error) {
      console.error('Failed to generate workout plan:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to generate workout plan' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

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
    generateWorkoutPlan,
    refreshWorkoutPlan,
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
