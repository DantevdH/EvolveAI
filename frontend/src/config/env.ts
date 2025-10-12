import { readFileSync } from 'fs';
import { join } from 'path';

// Read environment variables from root .env file
const rootEnvPath = join(__dirname, '../../../.env');
let envVars: Record<string, string> = {};

try {
  const envContent = readFileSync(rootEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !value.startsWith('#')) {
        envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
} catch (error) {
  console.warn('Could not read root .env file:', error);
}

// Export environment variables
export const ENV = {
  EXPO_PUBLIC_BACKEND_URL: envVars.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL,
  EXPO_PUBLIC_SUPABASE_URL: envVars.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};
