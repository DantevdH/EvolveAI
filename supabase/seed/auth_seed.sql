-- Seed test users for local development
-- This file is automatically run when Supabase starts locally
-- Password: testpass123

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create test user in auth.users table
-- Note: This uses Supabase's auth schema structure
DO $$
DECLARE
  test_user_id uuid;
  user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'dev@test.com') INTO user_exists;
  
  -- Only create user if it doesn't exist
  IF NOT user_exists THEN
    -- Generate a UUID for the test user
    test_user_id := gen_random_uuid();
    
    -- Insert into auth.users (Supabase auth schema)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      test_user_id,
      'authenticated',
      'authenticated',
      'dev@test.com',
      crypt('testpass123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    -- Create corresponding user profile
    INSERT INTO public.user_profiles (
      user_id,
      username,
      age,
      weight,
      height,
      weight_unit,
      height_unit,
      measurement_system,
      gender,
      goal_description,
      experience_level,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      'Dev User',
      25,
      70.0,
      175.0,
      'kg',
      'cm',
      'metric',
      'male',
      'Build muscle and improve fitness',
      'intermediate',
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- User already exists, get their ID for profile check
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'dev@test.com';
    
    -- Ensure profile exists (create if missing)
    INSERT INTO public.user_profiles (
      user_id,
      username,
      age,
      weight,
      height,
      weight_unit,
      height_unit,
      measurement_system,
      gender,
      goal_description,
      experience_level,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      'Dev User',
      25,
      70.0,
      175.0,
      'kg',
      'cm',
      'metric',
      'male',
      'Build muscle and improve fitness',
      'intermediate',
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
