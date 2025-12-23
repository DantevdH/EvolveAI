-- Migration: Add live tracking and health import fields to endurance_session
-- This enables storing actual workout metrics from GPS tracking or health app imports

-- Add actual workout metrics (always stored in metric units for consistency)
ALTER TABLE public.endurance_session
  ADD COLUMN IF NOT EXISTS actual_duration integer,  -- Actual duration in seconds
  ADD COLUMN IF NOT EXISTS actual_distance numeric,  -- Actual distance in meters (converted for display)
  ADD COLUMN IF NOT EXISTS average_pace integer,     -- Average pace in seconds per km
  ADD COLUMN IF NOT EXISTS average_speed numeric,    -- Average speed in km/h
  ADD COLUMN IF NOT EXISTS average_heart_rate integer,  -- Average HR in bpm
  ADD COLUMN IF NOT EXISTS max_heart_rate integer,      -- Max HR in bpm
  ADD COLUMN IF NOT EXISTS min_heart_rate integer,      -- Min HR in bpm
  ADD COLUMN IF NOT EXISTS elevation_gain numeric,      -- Elevation gain in meters
  ADD COLUMN IF NOT EXISTS elevation_loss numeric,      -- Elevation loss in meters
  ADD COLUMN IF NOT EXISTS calories integer,            -- Estimated calories burned
  ADD COLUMN IF NOT EXISTS cadence integer,             -- Average cadence (steps/min or rpm)
  ADD COLUMN IF NOT EXISTS data_source text,            -- 'manual', 'live_tracking', 'healthkit', 'google_fit'
  ADD COLUMN IF NOT EXISTS health_workout_id text,      -- ID from HealthKit/Google Fit for deduplication
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,   -- When tracking started
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone; -- When tracking finished

-- Add constraint for data_source valid values
ALTER TABLE public.endurance_session
  DROP CONSTRAINT IF EXISTS endurance_session_data_source_check;

ALTER TABLE public.endurance_session
  ADD CONSTRAINT endurance_session_data_source_check
  CHECK (data_source IS NULL OR data_source IN ('manual', 'live_tracking', 'healthkit', 'google_fit'));

-- Add constraint for heart rate values (reasonable bounds)
ALTER TABLE public.endurance_session
  DROP CONSTRAINT IF EXISTS endurance_session_heart_rate_check;

ALTER TABLE public.endurance_session
  ADD CONSTRAINT endurance_session_heart_rate_check
  CHECK (
    (average_heart_rate IS NULL OR (average_heart_rate >= 30 AND average_heart_rate <= 250)) AND
    (max_heart_rate IS NULL OR (max_heart_rate >= 30 AND max_heart_rate <= 250)) AND
    (min_heart_rate IS NULL OR (min_heart_rate >= 30 AND min_heart_rate <= 250))
  );

-- Add index for health_workout_id lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_endurance_session_health_workout_id
  ON public.endurance_session(health_workout_id)
  WHERE health_workout_id IS NOT NULL;

-- Add index for data_source filtering
CREATE INDEX IF NOT EXISTS idx_endurance_session_data_source
  ON public.endurance_session(data_source)
  WHERE data_source IS NOT NULL;

-- Comment on new columns for documentation
COMMENT ON COLUMN public.endurance_session.actual_duration IS 'Actual workout duration in seconds (from GPS tracking or health import)';
COMMENT ON COLUMN public.endurance_session.actual_distance IS 'Actual distance in meters (always metric, converted for display based on user preference)';
COMMENT ON COLUMN public.endurance_session.average_pace IS 'Average pace in seconds per kilometer';
COMMENT ON COLUMN public.endurance_session.average_speed IS 'Average speed in kilometers per hour';
COMMENT ON COLUMN public.endurance_session.average_heart_rate IS 'Average heart rate in beats per minute';
COMMENT ON COLUMN public.endurance_session.max_heart_rate IS 'Maximum heart rate in beats per minute';
COMMENT ON COLUMN public.endurance_session.min_heart_rate IS 'Minimum heart rate in beats per minute';
COMMENT ON COLUMN public.endurance_session.elevation_gain IS 'Total elevation gain in meters';
COMMENT ON COLUMN public.endurance_session.elevation_loss IS 'Total elevation loss in meters';
COMMENT ON COLUMN public.endurance_session.calories IS 'Estimated calories burned';
COMMENT ON COLUMN public.endurance_session.cadence IS 'Average cadence (steps per minute for running, RPM for cycling)';
COMMENT ON COLUMN public.endurance_session.data_source IS 'Source of workout data: manual, live_tracking, healthkit, or google_fit';
COMMENT ON COLUMN public.endurance_session.health_workout_id IS 'Unique ID from HealthKit/Google Fit for deduplication';
COMMENT ON COLUMN public.endurance_session.started_at IS 'Timestamp when workout tracking started';
COMMENT ON COLUMN public.endurance_session.completed_at IS 'Timestamp when workout tracking completed';
