import Constants from 'expo-constants';

// Export environment variables
// The app.config.js loads .env from the root directory
// Variables prefixed with EXPO_PUBLIC_ are accessible via process.env
// Other variables can be accessed via Constants.expoConfig?.extra
export const ENV = {
  EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  DEBUG: process.env.EXPO_PUBLIC_DEBUG || 
         process.env.DEBUG || 
         Constants.expoConfig?.extra?.DEBUG || 
         'false',
};

/**
 * Detect if running against local Supabase instance
 * Used to conditionally show/hide features like OAuth login
 */
export const IS_LOCAL_DEV = 
  ENV.EXPO_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') || 
  ENV.EXPO_PUBLIC_SUPABASE_URL?.includes('localhost') ||
  false;
