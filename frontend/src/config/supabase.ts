import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use mock Supabase for E2E tests
let supabase: SupabaseClient;

if (process.env.NODE_ENV === 'test' || process.env.DETOX === 'true') {
  const { mockSupabase } = require('./supabase.mock');
  supabase = mockSupabase as any;
} else {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  // Validate required environment variables
  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL environment variable is not set. Please check your .env file.');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is not set. Please check your .env file.');
  }

  // Use appropriate storage based on platform
  // On web, use localStorage (handled by Supabase automatically if storage is not provided)
  // On native, use AsyncStorage
  let storage: any;
  
  if (Platform.OS === 'web') {
    // On web, Supabase will use localStorage automatically if storage is undefined
    // But we need to check if window is available (not during SSR)
    if (typeof window !== 'undefined') {
      storage = undefined; // Let Supabase use localStorage automatically
    } else {
      // During SSR, don't set storage - it will be set when window is available
      storage = {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      };
    }
  } else {
    // On native, use AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    storage = AsyncStorage;
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };