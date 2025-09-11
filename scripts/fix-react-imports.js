#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that use React but are missing the import
const filesToFix = [
  'frontend-expo/src/screens/onboarding/TimeAvailabilityScreen.tsx',
  'frontend-expo/src/screens/onboarding/OnboardingFlow.tsx',
  'frontend-expo/src/screens/onboarding/ExperienceLevelScreen.tsx',
  'frontend-expo/src/screens/WorkoutScreen.tsx',
  'frontend-expo/src/screens/ProfileScreen.tsx',
  'frontend-expo/src/screens/OnboardingScreen.tsx',
  'frontend-expo/src/screens/HomeScreen.tsx',
  'frontend-expo/src/components/shared/LoadingOverlay.tsx',
  'frontend-expo/src/components/onboarding/ProgressIndicator.tsx',
  'frontend-expo/src/components/generatePlan/LoadingIndicator.tsx',
  'frontend-expo/src/components/auth/SocialLoginButton.tsx',
  'frontend-expo/src/components/auth/AuthLoadingSpinner.tsx',
  'frontend-expo/src/components/auth/AuthFormInput.tsx',
  'frontend-expo/src/components/NetworkStatus.tsx',
  'frontend-expo/src/components/Input.tsx'
];

function fixReactImport(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if React import already exists
    if (content.includes('import React')) {
      console.log(`✅ React import already exists: ${filePath}`);
      return true;
    }

    // Check if file uses React
    if (!content.includes('React.')) {
      console.log(`⏭️  No React usage found: ${filePath}`);
      return true;
    }

    // Find the first import statement
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find where to insert the React import
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i;
        break;
      }
    }

    // Insert React import
    lines.splice(insertIndex, 0, "import React from 'react';");
    
    const newContent = lines.join('\n');
    fs.writeFileSync(fullPath, newContent, 'utf8');
    
    console.log(`✅ Fixed React import: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing React imports...\n');

let fixedCount = 0;
let totalCount = filesToFix.length;

filesToFix.forEach(filePath => {
  if (fixReactImport(filePath)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount}/${totalCount} files`);
console.log('React import issues should now be resolved!');
