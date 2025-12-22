-- Migration: Add permissions_granted field to user_profiles
-- This stores the user's Health and Location permission status for:
-- - Live workout tracking (GPS, distance, time, route)
-- - Health/Google Fit data import (HR, pace, elevation)
-- - Background location for continuous tracking

-- Add permissions_granted JSONB field to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS permissions_granted JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.permissions_granted IS
'User permission status for health data and location access. Structure: {health: {granted: bool, platform: string, requestedAt: timestamp}, location: {foreground: bool, background: bool, requestedAt: timestamp}, skipped: bool, lastUpdated: timestamp}';

-- Create GIN index for querying users by permission status
-- Useful for analytics: how many users have granted each permission type
CREATE INDEX IF NOT EXISTS idx_user_profiles_permissions_granted
ON public.user_profiles USING GIN (permissions_granted);
