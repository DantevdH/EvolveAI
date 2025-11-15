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

// Expose supabase globally in development for console debugging
if (__DEV__ && typeof global !== 'undefined') {
  (global as any).supabase = supabase;
  (global as any).clearAuthToken = async () => {
    const result = await supabase.auth.signOut();
    if (result.error) {
      console.error('❌ Error clearing token:', result.error.message);
      return false;
    }
    console.log('✅ Auth token cleared!');
    return true;
  };
  
  // Comprehensive cache clearing function
  (global as any).clearAllCache = async () => {
    try {
      console.log('🧹 Clearing all cache...');
      
      // 1. Sign out from Supabase
      console.log('🚪 Step 1: Signing out from Supabase...');
      await supabase.auth.signOut().catch(() => {});
      
      // 2. Clear AsyncStorage (React Native)
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        console.log('🗑️ Step 2: Clearing AsyncStorage...');
        
        // Get all keys first
        const allKeys = await AsyncStorage.getAllKeys();
        console.log(`📋 Found ${allKeys.length} keys in AsyncStorage`);
        
        // Clear all auth/supabase related keys
        const authKeys = allKeys.filter((key: string) => 
          key.includes('supabase') || 
          key.includes('sb-') ||
          key.includes('auth') ||
          key.includes('token') ||
          key.includes('user')
        );
        
        if (authKeys.length > 0) {
          await AsyncStorage.multiRemove(authKeys);
          console.log(`✅ Cleared ${authKeys.length} auth-related keys:`, authKeys);
        }
        
        // Option to clear everything (uncomment if needed)
        // await AsyncStorage.clear();
        // console.log('✅ Cleared ALL AsyncStorage');
      } else {
        // Web: Clear localStorage
        console.log('🗑️ Step 2: Clearing localStorage...');
        const authKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
            authKeys.push(key);
          }
        }
        authKeys.forEach(key => localStorage.removeItem(key));
        console.log(`✅ Cleared ${authKeys.length} auth-related localStorage keys`);
      }
      
      // 3. Clear SecureStore tokens (if TokenManager is available)
      try {
        const { TokenManager } = require('../services/tokenManager');
        console.log('🗑️ Step 3: Clearing SecureStore tokens...');
        await TokenManager.clearTokens().catch(() => {});
        console.log('✅ SecureStore cleared');
      } catch (e) {
        console.log('ℹ️ TokenManager not available (might be web)');
      }
      
      // 4. Clear ALL scheduled notifications (this is why you're still getting notifications!)
      try {
        const Notifications = require('expo-notifications');
        console.log('🔔 Step 4: Clearing all scheduled notifications...');
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`📋 Found ${allNotifications.length} scheduled notifications`);
        
        // Cancel all notifications
        for (const notification of allNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
        console.log(`✅ Cancelled ${allNotifications.length} scheduled notifications`);
        
        // Also cancel the specific training reminder
        const { NotificationService } = require('../services/NotificationService');
        await NotificationService.cancelTrainingReminder();
        console.log('✅ Training reminder cancelled');
      } catch (e) {
        console.log('ℹ️ Could not clear notifications:', e);
      }
      
      // 5. Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('✅ Session verified as cleared!');
      } else {
        console.warn('⚠️ Session still exists after clearing');
      }
      
      console.log('');
      console.log('✅✅✅ CACHE CLEARED! ✅✅✅');
      console.log('   - Auth tokens cleared');
      console.log('   - AsyncStorage cleared');
      console.log('   - SecureStore cleared');
      console.log('   - Scheduled notifications cancelled');
      console.log('');
      console.log('🔄 Reload your app to see the changes');
      console.log('');
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  };
  
  // Debug helper to inspect cache state
  (global as any).inspectCache = async () => {
    try {
      console.log('🔍 Inspecting cache state...');
      console.log('');
      
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('📱 Session:', session ? `✅ Active (user: ${session.user.email})` : '❌ None');
      if (sessionError) console.log('   Error:', sessionError.message);
      
      // Check AsyncStorage (React Native)
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const allKeys = await AsyncStorage.getAllKeys();
        console.log(`📦 AsyncStorage: ${allKeys.length} keys`);
        
        const authKeys = allKeys.filter((key: string) => 
          key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('token') || key.includes('user')
        );
        if (authKeys.length > 0) {
          console.log('   Auth-related keys:', authKeys);
        }
      } else {
        console.log('📦 localStorage: Web platform');
        const authKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
            authKeys.push(key);
          }
        }
        if (authKeys.length > 0) {
          console.log('   Auth-related keys:', authKeys);
        }
      }
      
      // Check notifications
      try {
        const Notifications = require('expo-notifications');
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`🔔 Scheduled notifications: ${allNotifications.length}`);
        if (allNotifications.length > 0) {
          allNotifications.forEach((n: any, i: number) => {
            console.log(`   ${i + 1}. ${n.identifier} - ${n.content.title}`);
          });
        }
      } catch (e) {
        console.log('🔔 Notifications: Could not check');
      }
      
      console.log('');
      return true;
    } catch (error) {
      console.error('❌ Error inspecting cache:', error);
      return false;
    }
  };
}

export { supabase };