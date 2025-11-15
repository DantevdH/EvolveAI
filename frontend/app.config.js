const { readFileSync } = require('fs');
const { join } = require('path');

// Load .env from root directory (parent of frontend/)
const rootEnvPath = join(__dirname, '..', '.env');
let rootEnvVars = {};

try {
  const envContent = readFileSync(rootEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        rootEnvVars[key.trim()] = value;
      }
    }
  });
} catch (error) {
  console.warn('Could not read root .env file:', error.message);
}

// Merge root env vars with process.env
// For EXPO_PUBLIC_ vars, set them directly
// For DEBUG, also set EXPO_PUBLIC_DEBUG so it's accessible in the app
Object.keys(rootEnvVars).forEach(key => {
  if (key.startsWith('EXPO_PUBLIC_')) {
    process.env[key] = rootEnvVars[key];
  } else if (key === 'DEBUG') {
    // Set both DEBUG and EXPO_PUBLIC_DEBUG so it's accessible in the app
    process.env.DEBUG = rootEnvVars[key];
    process.env.EXPO_PUBLIC_DEBUG = rootEnvVars[key];
  }
});

// Load from app.json and extend with environment variables
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      // Make these available via expo-constants
      ...appJson.expo.extra,
      DEBUG: process.env.DEBUG || process.env.EXPO_PUBLIC_DEBUG || 'false',
    },
  },
};

