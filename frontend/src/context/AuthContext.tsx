import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AuthService, AuthState } from '@/src/services/authService';
import { UserService } from '@/src/services/userService';
import { UserProfile } from '@/src/types';
import { TrainingPlan } from '@/src/types/training';
import { supabase } from '@/src/config/supabase';
import { NotificationService } from '@/src/services/NotificationService';
import { logger } from '@/src/utils/logger';

// Simplified auth state interface
interface SimpleAuthState {
  user: any | null;
  session: any | null;  // Store full session (includes access_token)
  userProfile: UserProfile | null;
  trainingPlan: TrainingPlan | null;
  exercises: any[] | null;
  isLoading: boolean;
  trainingPlanLoading: boolean;
  isPollingPlan: boolean;  // True when polling for background plan generation
  error: string | null;
  isInitialized: boolean;
}

// Simplified auth actions
type SimpleAuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WORKOUT_PLAN_LOADING'; payload: boolean }
  | { type: 'SET_POLLING_PLAN'; payload: boolean }
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_SESSION'; payload: any | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_WORKOUT_PLAN'; payload: TrainingPlan | null }
  | { type: 'SET_EXERCISES'; payload: any[] | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'CLEAR_AUTH' };

// Simplified initial state
const initialState: SimpleAuthState = {
  user: null,
  session: null,
  userProfile: null,
  trainingPlan: null,
  exercises: null,
  isLoading: false,
  trainingPlanLoading: false,
  isPollingPlan: false,
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
    case 'SET_WORKOUT_PLAN_LOADING':
      return {
        ...state,
        trainingPlanLoading: action.payload,
      };
    case 'SET_POLLING_PLAN':
      return {
        ...state,
        isPollingPlan: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
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
      };
    case 'SET_WORKOUT_PLAN':
      return {
        ...state,
        trainingPlan: action.payload,
      };
    case 'SET_EXERCISES':
      return {
        ...state,
        exercises: action.payload,
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
  loadUserProfile: (userId: string) => Promise<void>;
  updateUserProfile: (updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
  dispatch: (action: SimpleAuthAction) => void;
  
  // Training plan methods
  // generateTrainingPlan: () => Promise<boolean>; // REMOVED: Use GeneratePlanScreen instead
  refreshTrainingPlan: () => Promise<void>;
  setTrainingPlan: (trainingPlan: TrainingPlan) => void;
  setPollingPlan: (isPolling: boolean) => void;
  
  // Exercise methods
  loadAllExercises: () => Promise<void>;
  setExercises: (exercises: any[]) => void;
  clearExercises: () => void;
  
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
  const isLoadingProfileRef = useRef(false);

  // Simplified user profile loading with debouncing
  // BEST PRACTICE: Profile loading should NOT block navigation
  // Navigation is reactive to auth state, profile loads in background
  const loadUserProfile = useCallback(async (userId: string) => {
    // Prevent multiple simultaneous calls
    if (isLoadingProfileRef.current) {
      console.log('🚫 Profile loading already in progress, skipping...');
      return;
    }

    isLoadingProfileRef.current = true;

    try {
      console.log('👤 Loading user profile...');
      // DON'T set isLoading - profile loading should not block navigation
      // Navigation should be reactive to auth state, not profile loading state
      
      // Add timeout to prevent hanging - if profile query takes too long, give up
      const profilePromise = UserService.getUserProfile(userId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile loading timeout after 3 seconds')), 3000);
      });
      
      let response;
      try {
        response = await Promise.race([profilePromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('⚠️ Profile loading timed out - treating as new user, allowing onboarding');
        // Treat timeout as "no profile found" - allow navigation to onboarding
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        dispatch({ type: 'SET_ERROR', payload: null });
        isLoadingProfileRef.current = false;
        return;
      }
      
      if (response.success) {
        console.log('✅ User profile loaded');
        dispatch({ type: 'SET_USER_PROFILE', payload: response.data || null });
        
        // Load training plan if user profile exists (non-blocking)
        if (response.data) {
          // Don't await - let this load in background
          (async () => {
            try {
              console.log('💪 Loading training plan...');
              dispatch({ type: 'SET_WORKOUT_PLAN_LOADING', payload: true });
              
              const { TrainingService } = await import('../services/trainingService');
              const trainingResult = await TrainingService.getTrainingPlan(response.data!.id!);
              
              if (trainingResult.success) {
                console.log('✅ Training plan loaded');
              } else {
                console.log('ℹ️ No training plan found');
              }
              
              const trainingPlan = trainingResult.success ? trainingResult.data || null : null;
              dispatch({ type: 'SET_WORKOUT_PLAN', payload: trainingPlan });
              
              // Schedule training reminder if training plan exists
              if (trainingPlan) {
                try {
                  await NotificationService.scheduleTrainingReminder(trainingPlan);
                  console.log('🔔 Training reminder scheduled');
                } catch (notificationError) {
                  console.log('⚠️ Failed to schedule training reminder:', notificationError);
                }
              }
            } catch (trainingError) {
              console.error('❌ Error loading training plan:', trainingError instanceof Error ? trainingError.message : String(trainingError));
              dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
            } finally {
              dispatch({ type: 'SET_WORKOUT_PLAN_LOADING', payload: false });
            }
          })();
        } else {
          console.log('ℹ️ No user profile data');
          dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
        }

      } else {
        console.log('❌ User profile not found');
        // Don't set error - treat as "no profile" to allow onboarding
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        dispatch({ type: 'SET_ERROR', payload: null });
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error instanceof Error ? error.message : 'Failed to load user profile');
      
      // If query fails, treat as "no profile found" to allow onboarding to proceed
      // This handles network errors, RLS issues, etc. gracefully
      console.warn('⚠️ Profile loading failed - treating as new user, allowing onboarding');
      dispatch({ type: 'SET_USER_PROFILE', payload: null });
      dispatch({ type: 'SET_ERROR', payload: null }); // Clear error to allow navigation
    } finally {
      // DON'T set isLoading to false - we never set it to true for profile loading
      isLoadingProfileRef.current = false;
    }
  }, []); // No dependencies - stable function

  // Load all exercises at startup (non-blocking, runs in background)
  useEffect(() => {
    // Only load if exercises haven't been loaded yet
    if (state.exercises === null) {
      loadAllExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Checking user session...');
        
        // Add timeout to prevent hanging after clearAuth()
        const getSessionPromise = supabase.auth.getSession();
        const sessionTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('getSession timeout after 3 seconds')), 3000);
        });
        
        let session: any = null;
        let error: any = null;
        
        try {
          const result = await Promise.race([getSessionPromise, sessionTimeoutPromise]);
          session = (result as any)?.data?.session;
          error = (result as any)?.error;
        } catch (sessionError) {
          console.warn('⚠️ getSession failed or timed out during init:', sessionError instanceof Error ? sessionError.message : String(sessionError));
          // Treat timeout as "no session" - user needs to sign in
          error = { message: 'Session check timed out' };
        }

        if (error) {
          // Handle expected refresh token errors gracefully
          const isRefreshTokenError = 
            error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Refresh Token Not Found') ||
            error.message?.includes('refresh_token_not_found') ||
            error.message?.includes('timeout');
          
          if (isRefreshTokenError) {
            // This is expected when a user's session has expired or token was cleared
            // No need to show this as an error - user just needs to sign in again
            console.log('ℹ️ No valid session - user needs to sign in');
            dispatch({ type: 'SET_ERROR', payload: null }); // Clear any previous errors
          } else {
            // Log actual errors that need attention
            console.error('❌ Session error:', error.message);
            dispatch({ type: 'SET_ERROR', payload: error.message });
          }
        } else if (session) {
          console.log('✅ User session found');
          dispatch({ type: 'SET_USER', payload: session.user });
          dispatch({ type: 'SET_SESSION', payload: session });
          
          // Set session on client before loading profile
          if (session.access_token) {
            try {
              await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token || '',
              });
              console.log('✅ Session set on Supabase client during init');
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (setError) {
              console.warn('⚠️ Error setting session during init:', setError);
            }
          }
          
          // Load user profile if we have a session
          if (session.user) {
            await loadUserProfile(session.user.id);
          }
        } else {
          console.log('ℹ️ No user session');
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
      } finally {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    };

    initializeAuth();
  }, [loadUserProfile]);

  // Single auth state listener - handles all auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in');
        dispatch({ type: 'SET_USER', payload: session.user });
        dispatch({ type: 'SET_SESSION', payload: session });
        
        // Check if OAuth user needs email verification (not for email signup)
        if (session.user && !session.user.email_confirmed_at && session.user.app_metadata?.provider !== 'email') {
          console.log('📧 Email verification required');
          // Clear profile to ensure navigation to email verification
          dispatch({ type: 'SET_USER_PROFILE', payload: null });
          return; // Don't load profile until email is verified
        }
        
        // BEST PRACTICE: Optimistically clear profile to allow immediate navigation
        // Profile will load in background and update state when ready
        // This prevents navigation from being blocked by profile loading
        if (!state.userProfile || state.userProfile.userId !== session.user.id) {
          console.log('🔄 User signed in - clearing profile state for immediate navigation...');
          dispatch({ type: 'SET_USER_PROFILE', payload: null });
          dispatch({ type: 'SET_ERROR', payload: null }); // Clear any errors
        }
        
        // Only load profile if we don't already have one for this user and not currently loading
        if ((!state.userProfile || state.userProfile.userId !== session.user.id) && !isLoadingProfileRef.current) {
          console.log('🔄 Loading profile in background (non-blocking)...');
          
          // CRITICAL: Set session on Supabase client BEFORE loading profile
          // This ensures RLS policies work and prevents getSession() from hanging
          if (session.access_token) {
            try {
              await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token || '',
              });
              console.log('✅ Session set on Supabase client before profile load');
              // Small delay to ensure session is propagated
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (setError) {
              console.warn('⚠️ Error setting session before profile load:', setError);
              // Continue anyway - session might already be set
            }
          }
          
          // Load profile in background - don't await, navigation happens immediately
          loadUserProfile(session.user.id).catch((error) => {
            console.error('❌ Background profile loading failed:', error);
            // Already handled in loadUserProfile - just log here
          });
        } else {
          console.log('🚫 Skipping profile load - already have profile or loading in progress');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        dispatch({ type: 'CLEAR_AUTH' });
        isLoadingProfileRef.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile, state.userProfile]);

  // Force clear all authentication data
  const forceSignOut = async () => {
    try {
      await AuthService.signOut();
      dispatch({ type: 'CLEAR_AUTH' });
    } catch (error) {
      console.error('💥 Force sign out error:', error);
    }
  };

  // Clear auth function for development console
  const clearAuth = useCallback(async () => {
    if (!__DEV__) {
      console.warn('⚠️ clearAuth() is only available in development mode');
      return;
    }

    try {
      console.log('🧹 Clearing authentication...');
      
      // Sign out from Supabase
      await AuthService.signOut();
      
      // Clear auth state
      dispatch({ type: 'CLEAR_AUTH' });
      isLoadingProfileRef.current = false;
      
      console.log('✅ Authentication cleared');
      console.log('💡 App will automatically redirect to login page');
      console.log('💡 If not redirected, manually navigate or reload the app');
    } catch (error) {
      console.error('❌ Error clearing auth:', error);
    }
  }, [dispatch]);

  // Sign in with email
  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await AuthService.signInWithEmail({ email, password });

      if (response.success && response.user) {
        dispatch({ type: 'SET_USER', payload: response.user });
        // Use consolidated profile loading
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
        // If user and session are returned immediately (token extraction in authService worked)
        if (response.user && response.session) {
          console.log('✅ [AuthContext] User flow: OAuth session set immediately, updating context');
          dispatch({ type: 'SET_USER', payload: response.user });
          dispatch({ type: 'SET_SESSION', payload: response.session });
          
          // Don't load profile here - let the auth state listener handle it
          // This prevents duplicate calls and race conditions
          console.log('✅ [AuthContext] User flow: Context updated, auth state listener will load profile');
          return true;
        }
        
        // If tokens weren't extracted immediately, auth state listener will handle it
        // But we return true to indicate OAuth flow initiated successfully
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
        // The backend may return a trimmed profile object. Merge it with the existing
        // profile in state to avoid losing fields like questions/responses/playbook.
        const existingProfile = (state.userProfile as any) || {};
        const mergedProfile = {
          ...existingProfile,
          ...response.data,
        };
        dispatch({ type: 'SET_USER_PROFILE', payload: mergedProfile });
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

  };

  // Get current user
  const getCurrentUser = async (): Promise<any> => {
    return await AuthService.getCurrentUser();
  };

  // Mark onboarding as complete
  const markOnboardingComplete = async (): Promise<void> => {
    // Onboarding completion is now determined by the presence of userProfile

  };

  // Generate training plan
  // REMOVED: generateTrainingPlan function
  // This has been replaced by GeneratePlanScreen.handleGeneratePlan() which uses the backend flow

  // Refresh training plan
  const refreshTrainingPlan = async (): Promise<void> => {
    try {
      if (!state.userProfile) {
        return;
      }

      dispatch({ type: 'SET_WORKOUT_PLAN_LOADING', payload: true });

      // Import TrainingService dynamically to avoid circular dependencies
      const { TrainingService } = await import('../services/trainingService');
      
      const result = await TrainingService.getTrainingPlan(state.userProfile.id!);
      
      if (result.success && result.data) {
        dispatch({ type: 'SET_WORKOUT_PLAN', payload: result.data });
        
        // Schedule training reminder for the new training plan
        try {
          await NotificationService.scheduleTrainingReminder(result.data);
          console.log('🔔 Training reminder scheduled for new plan');
        } catch (notificationError) {
          console.log('⚠️ Failed to schedule training reminder:', notificationError);
        }

      } else {
        // No training plan found, clear it
        dispatch({ type: 'SET_WORKOUT_PLAN', payload: null });
        
        // Cancel any existing training reminders
        try {
          await NotificationService.cancelTrainingReminder();
          console.log('🔔 Training reminder cancelled (no plan)');
        } catch (notificationError) {
          console.log('⚠️ Failed to cancel training reminder:', notificationError);
        }
      }
      
      dispatch({ type: 'SET_WORKOUT_PLAN_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to refresh training plan:', error);
      dispatch({ type: 'SET_WORKOUT_PLAN_LOADING', payload: false });
      throw error;
    }
  };

  // Set training plan directly (for use after generation)
  const setTrainingPlan = (trainingPlan: TrainingPlan): void => {
    console.log('💪 Training plan set');
    dispatch({ type: 'SET_WORKOUT_PLAN', payload: trainingPlan });
  };

  // Load all exercises at startup (one-time DB call)
  const loadAllExercises = useCallback(async (): Promise<void> => {
    // Only load if not already loaded
    if (state.exercises !== null) {
      console.log('🏋️ Exercises already loaded, skipping...');
      return;
    }

    try {
      console.log('🏋️ Loading all exercises...');
      const { ExerciseSwapService } = await import('../services/exerciseSwapService');
      
      // Load all exercises (no limit, no offset)
      const result = await ExerciseSwapService.searchExercises('', {}, 10000, 0);
      
      if (result.success && result.data) {
        console.log(`✅ Loaded ${result.data.length} exercises into context`);
        dispatch({ type: 'SET_EXERCISES', payload: result.data.map(r => r.exercise) });
      } else {
        console.error('❌ Failed to load exercises:', result.error);
        dispatch({ type: 'SET_EXERCISES', payload: [] });
      }
    } catch (error) {
      console.error('❌ Error loading exercises:', error);
      dispatch({ type: 'SET_EXERCISES', payload: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Don't depend on state.exercises to avoid infinite loops

  // Set exercises directly (for use after plan generation)
  const setExercises = (exercises: any[]): void => {
    console.log('🏋️ Exercises set');
    dispatch({ type: 'SET_EXERCISES', payload: exercises });
  };

  // Clear exercises
  const clearExercises = (): void => {
    console.log('🧹 Exercises cleared');
    dispatch({ type: 'SET_EXERCISES', payload: null });
  };

  // Set polling plan flag
  const setPollingPlan = (isPolling: boolean): void => {
    dispatch({ type: 'SET_POLLING_PLAN', payload: isPolling });
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
    loadUserProfile,
    updateUserProfile,
    refreshUserProfile,
    dispatch,
    // generateTrainingPlan, // REMOVED: Use GeneratePlanScreen instead
    refreshTrainingPlan,
    setTrainingPlan,
    setPollingPlan,
    loadAllExercises,
    setExercises,
    clearExercises,
    clearError,
    checkAuthState,
    getCurrentUser,
    markOnboardingComplete,
  };

  // Expose clearAuth globally in development mode
  useEffect(() => {
    if (__DEV__) {
      // @ts-ignore - Exposing to global scope for console access
      global.clearAuth = clearAuth;
      console.log('💡 Development: clearAuth() is now available in console');
    }
    
    return () => {
      if (__DEV__) {
        // @ts-ignore
        delete global.clearAuth;
      }
    };
  }, [clearAuth]);

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
