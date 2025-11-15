/**
 * Quick script to completely reset user and go back to login
 * Run this in Metro console or React Native Debugger
 * 
 * Usage:
 * 1. Open Metro console (in terminal) or React Native Debugger
 * 2. Copy and paste this entire script
 * 3. Run: resetUser()
 * 
 * Or use the one-liner below directly in console!
 */

const resetUser = async () => {
  try {
    console.log('🧹 Resetting user completely - clearing ALL storage...');
    
    // Import required modules
    const { supabase } = require('../src/config/supabase');
    const { TokenManager } = require('../src/services/tokenManager');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Get current user (if exists)
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    
    if (user) {
      console.log('👤 Current user:', user.email);
    } else {
      console.log('ℹ️ No user logged in (but clearing storage anyway)');
    }
    
    // 1. Sign out from Supabase (clears AsyncStorage session)
    console.log('🚪 Step 1: Signing out from Supabase...');
    await supabase.auth.signOut().catch(() => {}); // Ignore errors if already signed out
    
    // 2. Clear SecureStore tokens (iOS Keychain / Android Keystore)
    console.log('🗑️ Step 2: Clearing SecureStore tokens...');
    await TokenManager.clearTokens().catch(() => {});
    
    // 3. Clear ALL AsyncStorage (nuclear option - clears everything!)
    console.log('🗑️ Step 3: Clearing ALL AsyncStorage (this clears everything)...');
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage completely cleared!');
    
    // 4. Also manually clear Supabase session keys
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const projectMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      if (projectMatch && projectMatch[1]) {
        const projectId = projectMatch[1];
        const supabaseKey = `sb-${projectId}-auth-token`;
        await AsyncStorage.removeItem(supabaseKey).catch(() => {});
        await AsyncStorage.removeItem('supabase.auth.token').catch(() => {});
        console.log('✅ Cleared Supabase session keys');
      }
    }
    
    // 5. Verify everything is cleared
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('✅ Session cleared!');
    } else {
      console.warn('⚠️ Session still exists - this should not happen');
    }
    
    console.log('');
    console.log('✅✅✅ USER RESET COMPLETE! ✅✅✅');
    console.log('');
    console.log('🔄 Now RESTART your app (close completely and reopen)');
    console.log('   You should be at the login screen!');
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting user:', error);
    console.log('💡 Try manually: Delete app and reinstall');
    return false;
  }
};

// ONE-LINER FOR CONSOLE (copy this directly!)
// Paste this in Metro console or React Native Debugger:
const resetOneLiner = `const {supabase}=require('./src/config/supabase');const AsyncStorage=require('@react-native-async-storage/async-storage').default;await supabase.auth.signOut();await AsyncStorage.clear();console.log('✅ Reset complete! Restart app.');`;

// Export for use
if (typeof window !== 'undefined') {
  window.resetUser = resetUser;
  console.log('💡 Use window.resetUser() in console to reset user');
  console.log('💡 Or copy this one-liner:', resetOneLiner);
}

module.exports = { resetUser, resetOneLiner };

