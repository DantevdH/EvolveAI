import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { CoachService, Coach } from '../services/coachService';
import { staticCoaches } from '../data/coaches';

// Coach state interface
interface CoachState {
  allCoaches: Coach[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Coach actions
type CoachAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_COACHES'; payload: Coach[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'CLEAR_COACHES' };

// Initial state
const initialState: CoachState = {
  allCoaches: [],
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Coach reducer
const coachReducer = (state: CoachState, action: CoachAction): CoachState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_COACHES':
      return {
        ...state,
        allCoaches: action.payload,
        error: null,
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
    case 'CLEAR_COACHES':
      return {
        ...initialState,
        isInitialized: state.isInitialized,
      };
    default:
      return state;
  }
};

// Coach context type
interface CoachContextType {
  state: CoachState;
  
  // Methods
  filterCoachesByGoal: (goal: string) => Coach[];
  clearError: () => void;
}

// Create context
const CoachContext = createContext<CoachContextType | undefined>(undefined);

// Coach provider component
interface CoachProviderProps {
  children: ReactNode;
}

export const CoachProvider: React.FC<CoachProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(coachReducer, initialState);

  // Load static coaches data immediately
  useEffect(() => {
    if (!state.isInitialized) {
      dispatch({ type: 'SET_COACHES', payload: staticCoaches });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    }
  }, [state.isInitialized]);

  // Filter coaches by goal
  const filterCoachesByGoal = useCallback((goal: string): Coach[] => {
    if (!goal || state.allCoaches.length === 0) {
      return [];
    }

    const matchingCoaches = CoachService.filterCoachesByGoal(state.allCoaches, goal);
    return matchingCoaches;
  }, [state.allCoaches]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const contextValue: CoachContextType = {
    state,
    filterCoachesByGoal,
    clearError,
  };

  return (
    <CoachContext.Provider value={contextValue}>
      {children}
    </CoachContext.Provider>
  );
};

// Custom hook to use coach context
export const useCoaches = (): CoachContextType => {
  const context = useContext(CoachContext);
  if (context === undefined) {
    throw new Error('useCoaches must be used within a CoachProvider');
  }
  return context;
};
