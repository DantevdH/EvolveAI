import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key';

// Log configuration for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key configured:', !!supabaseAnonKey);
console.log('Supabase properly configured:', isSupabaseConfigured);

if (!isSupabaseConfigured) {
  console.warn('⚠️  Supabase not configured! Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  console.warn('📖 See README-AUTH.md for setup instructions');
}

// Create Supabase client with fallback configuration
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // Configure auth options
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
