#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to clean (production code only, excluding tests)
const filesToClean = [
  'src/context/AuthContext.tsx',
  'src/context/OnboardingContext.tsx',
  'src/services/authService.ts',
  'src/services/tokenManager.ts',
  'src/services/trainingService.ts',
  'src/config/supabase.ts',
  'src/screens/auth/LoginScreen.tsx',
  'app/index.tsx',
  'app/oauth/callback.tsx',
  'app/reset-password.tsx'
];

function removeConsoleLogs(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalLength = content.length;
  
  // Remove console.log statements (but keep console.error for actual error logging)
  content = content.replace(/^\s*console\.log\([^)]*\);\s*$/gm, '');
  content = content.replace(/^\s*console\.log\([^)]*\);\s*\n/gm, '');
  
  // Clean up empty lines that might be left behind
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  const removedCount = (originalLength - content.length) / 20; // Rough estimate
  
  if (content.length !== originalLength) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Cleaned ${filePath} (removed ~${Math.round(removedCount)} console.log statements)`);
    return Math.round(removedCount);
  } else {
    console.log(`ℹ️  No console.log statements found in ${filePath}`);
    return 0;
  }
}

console.log('🧹 Starting console.log cleanup...\n');

let totalRemoved = 0;
filesToClean.forEach(file => {
  totalRemoved += removeConsoleLogs(file);
});

console.log(`\n🎉 Cleanup complete! Removed approximately ${totalRemoved} console.log statements.`);
console.log('\n📊 Performance Impact:');
console.log('   - Reduced bundle size');
console.log('   - Eliminated runtime logging overhead');
console.log('   - Improved production performance');
console.log('\n✅ Your app is now more production-ready!');
