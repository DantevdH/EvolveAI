import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Supabase client for E2E testing
export const mockSupabase = {
  auth: {
    getSession: async () => ({
      data: { session: null },
      error: null
    }),
    onAuthStateChange: (callback: any) => {
      // Simulate no user initially
      callback('SIGNED_OUT', null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async (credentials: any) => ({
      data: { user: { id: 'test-user-id', email: credentials.email }, session: { access_token: 'mock-token' } },
      error: null
    }),
    signUp: async (credentials: any) => ({
      data: { user: { id: 'test-user-id', email: credentials.email }, session: null },
      error: null
    }),
    signOut: async () => ({
      data: {},
      error: null
    }),
    resetPasswordForEmail: async (email: string) => ({
      data: {},
      error: null
    }),
    signInWithOAuth: async (provider: any) => ({
      data: { provider, url: 'mock-oauth-url' },
      error: null
    })
  },
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
        single: async () => ({
          data: null,
          error: null
        }),
        then: async (callback: any) => {
          const result = { data: null, error: null };
          return callback ? callback(result) : result;
        }
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => ({
            data: { id: 'mock-id', ...data },
            error: null
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: async () => ({
              data: { id: value, ...data },
              error: null
            })
          })
        })
      })
    })
  })
};

// Export the mock as the default supabase client when in test environment
export const supabase = process.env.NODE_ENV === 'test' ? mockSupabase : require('./supabase').supabase;
