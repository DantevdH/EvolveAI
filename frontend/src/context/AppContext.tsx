import React, {createContext, useContext, useReducer, ReactNode} from 'react';
import {UserProfile, TrainingPlan, Theme, AppState as AppStateEnum, Coach} from '@/src/types';
import { colors } from '../constants/designSystem';

// Create theme object from design system
const theme: Theme = {
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.card,
    text: colors.text,
    textSecondary: colors.muted,
    border: colors.border,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 32,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

// Dark theme is the same as light theme since we're using a dark design system
const darkTheme: Theme = theme;

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
  
  // Training data
  currentTraining: TrainingPlan | null;
  
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
  | {type: 'SET_CURRENT_WORKOUT'; payload: TrainingPlan | null}
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
  
  // Training data
  currentTraining: null,
  
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
        currentTraining: action.payload,
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
  
  // Training management
  setCurrentTraining: (training: TrainingPlan | null) => void;
  
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
    
    // Training management
    setCurrentTraining: (training: TrainingPlan | null) =>
      dispatch({type: 'SET_CURRENT_WORKOUT', payload: training}),
    
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
