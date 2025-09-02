import React, {createContext, useContext, useReducer, ReactNode} from 'react';
import {UserProfile, WorkoutPlan, Theme, AppState as AppStateEnum, Coach} from '@/types';
import {theme, darkTheme} from '@/constants';

// Define the state shape matching Swift AppViewModel
interface AppState {
  // App state management
  appState: AppStateEnum;
  selectedCoach: Coach | null;
  isLoading: boolean;
  errorMessage: string | null;
  showRedirectDelay: boolean;
  
  // User data
  user: UserProfile | null;
  isAuthenticated: boolean;
  authToken: string | null;
  
  // Workout data
  currentWorkout: WorkoutPlan | null;
  
  // UI state
  theme: Theme;
  isDarkMode: boolean;
}

// Define action types matching Swift AppViewModel
type AppAction =
  | {type: 'SET_APP_STATE'; payload: AppStateEnum}
  | {type: 'SET_USER'; payload: UserProfile | null}
  | {type: 'SET_AUTHENTICATED'; payload: boolean}
  | {type: 'SET_AUTH_TOKEN'; payload: string | null}
  | {type: 'SET_SELECTED_COACH'; payload: Coach | null}
  | {type: 'SET_CURRENT_WORKOUT'; payload: WorkoutPlan | null}
  | {type: 'SET_LOADING'; payload: boolean}
  | {type: 'SET_ERROR'; payload: string | null}
  | {type: 'SET_REDIRECT_DELAY'; payload: boolean}
  | {type: 'TOGGLE_THEME'};

// Initial state matching Swift app
const initialState: AppState = {
  // App state
  appState: AppStateEnum.LOADING,
  selectedCoach: null,
  isLoading: false,
  errorMessage: null,
  showRedirectDelay: false,
  
  // User data
  user: null,
  isAuthenticated: false,
  authToken: null,
  
  // Workout data
  currentWorkout: null,
  
  // UI state
  theme: theme,
  isDarkMode: false,
};

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_APP_STATE':
      return {
        ...state,
        appState: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload,
      };
    case 'SET_AUTH_TOKEN':
      return {
        ...state,
        authToken: action.payload,
      };
    case 'SET_SELECTED_COACH':
      return {
        ...state,
        selectedCoach: action.payload,
      };
    case 'SET_CURRENT_WORKOUT':
      return {
        ...state,
        currentWorkout: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        errorMessage: action.payload,
      };
    case 'SET_REDIRECT_DELAY':
      return {
        ...state,
        showRedirectDelay: action.payload,
      };
    case 'TOGGLE_THEME':
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
        theme: !state.isDarkMode ? darkTheme : theme,
      };
    default:
      return state;
  }
};

// Context type matching Swift AppViewModel functionality
interface AppContextType {
  state: AppState;
  // App state management
  setAppState: (appState: AppStateEnum) => void;
  setSelectedCoach: (coach: Coach | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setRedirectDelay: (show: boolean) => void;
  
  // User management
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setAuthToken: (token: string | null) => void;
  
  // Workout management
  setCurrentWorkout: (workout: WorkoutPlan | null) => void;
  
  // UI management
  toggleTheme: () => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const contextValue: AppContextType = {
    state,
    // App state management
    setAppState: (appState: AppStateEnum) =>
      dispatch({type: 'SET_APP_STATE', payload: appState}),
    setSelectedCoach: (coach: Coach | null) =>
      dispatch({type: 'SET_SELECTED_COACH', payload: coach}),
    setLoading: (isLoading: boolean) =>
      dispatch({type: 'SET_LOADING', payload: isLoading}),
    setError: (error: string | null) =>
      dispatch({type: 'SET_ERROR', payload: error}),
    setRedirectDelay: (show: boolean) =>
      dispatch({type: 'SET_REDIRECT_DELAY', payload: show}),
    
    // User management
    setUser: (user: UserProfile | null) =>
      dispatch({type: 'SET_USER', payload: user}),
    setAuthenticated: (isAuthenticated: boolean) =>
      dispatch({type: 'SET_AUTHENTICATED', payload: isAuthenticated}),
    setAuthToken: (token: string | null) =>
      dispatch({type: 'SET_AUTH_TOKEN', payload: token}),
    
    // Workout management
    setCurrentWorkout: (workout: WorkoutPlan | null) =>
      dispatch({type: 'SET_CURRENT_WORKOUT', payload: workout}),
    
    // UI management
    toggleTheme: () => dispatch({type: 'TOGGLE_THEME'}),
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
