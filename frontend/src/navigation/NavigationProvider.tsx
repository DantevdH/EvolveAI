/**
 * Navigation Provider - Integrates with existing Expo Router structure
 */

import React, { useEffect } from 'react';
import { initializeDeepLinking } from '../utils/deepLinking';

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {

  // Initialize deep linking
  useEffect(() => {
    const cleanup = initializeDeepLinking();
    return cleanup;
  }, []);

  // Navigation logic removed - handled by app/index.tsx
  // This prevents duplicate navigation systems from conflicting

  return <>{children}</>;
};
