-- Migration: Add endurance_segment table for interval workouts
-- This enables multi-session workouts with multiple segments per endurance session
-- Each segment can have different targets (time/distance), heart rate zones, and segment types

-- ============================================================================
-- Step 1: Create endurance_segment table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.endurance_segment (
  id SERIAL PRIMARY KEY,
  endurance_session_id INTEGER NOT NULL REFERENCES endurance_session(id) ON DELETE CASCADE,
  segment_order INTEGER NOT NULL,  -- Order within session (1, 2, 3...)

  -- Segment type (industry standard)
  segment_type TEXT NOT NULL DEFAULT 'work',  -- warmup, work, recovery, rest, cooldown
  name TEXT,  -- Optional custom name, auto-generated from type if null
  description TEXT,

  -- Target (planned values)
  target_type TEXT NOT NULL,  -- 'time', 'distance', 'open'
  target_value NUMERIC,  -- Duration in seconds OR distance in meters (null for 'open')
  target_heart_rate_zone INTEGER CHECK (target_heart_rate_zone IS NULL OR (target_heart_rate_zone >= 1 AND target_heart_rate_zone <= 5)),
  target_pace INTEGER,  -- Target pace in seconds per km (nullable)
  repeat_count INTEGER NOT NULL DEFAULT 1 CHECK (repeat_count >= 1 AND repeat_count <= 20),  -- For interval blocks (default 1, max 20)

  -- Actuals (recorded during/after tracking) - enables per-segment analysis
  actual_duration INTEGER,  -- Actual duration in seconds
  actual_distance NUMERIC,  -- Actual distance in meters
  actual_avg_pace INTEGER,  -- Actual average pace in seconds per km
  actual_avg_heart_rate INTEGER CHECK (actual_avg_heart_rate IS NULL OR (actual_avg_heart_rate >= 30 AND actual_avg_heart_rate <= 250)),
  actual_max_heart_rate INTEGER CHECK (actual_max_heart_rate IS NULL OR (actual_max_heart_rate >= 30 AND actual_max_heart_rate <= 250)),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT segment_type_check CHECK (segment_type IN ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  CONSTRAINT target_type_check CHECK (target_type IN ('time', 'distance', 'open')),
  CONSTRAINT unique_segment_order UNIQUE (endurance_session_id, segment_order)
);

-- Index for efficient segment lookups
CREATE INDEX IF NOT EXISTS idx_endurance_segment_session_id ON endurance_segment(endurance_session_id);

-- Comment on table and columns
COMMENT ON TABLE public.endurance_segment IS 'Segments within an endurance session for interval workouts. Each segment has its own target and actuals.';
COMMENT ON COLUMN public.endurance_segment.segment_order IS 'Order within session (1, 2, 3...). Used for display and execution sequence.';
COMMENT ON COLUMN public.endurance_segment.segment_type IS 'Type of segment: warmup, work, recovery, rest, cooldown. Used for auto-naming and visual distinction.';
COMMENT ON COLUMN public.endurance_segment.target_type IS 'How to measure segment completion: time (seconds), distance (meters), or open (manual advance).';
COMMENT ON COLUMN public.endurance_segment.target_value IS 'Target value in seconds (time) or meters (distance). Null for open segments.';
COMMENT ON COLUMN public.endurance_segment.target_heart_rate_zone IS 'Target heart rate zone (1-5) for this segment.';
COMMENT ON COLUMN public.endurance_segment.target_pace IS 'Target pace in seconds per km (optional).';
COMMENT ON COLUMN public.endurance_segment.repeat_count IS 'Number of times to repeat this segment (default 1, max 20). Consecutive segments with same repeat_count are grouped and expanded during tracking.';
COMMENT ON COLUMN public.endurance_segment.actual_duration IS 'Actual duration in seconds (from tracking).';
COMMENT ON COLUMN public.endurance_segment.actual_distance IS 'Actual distance in meters (from tracking).';
COMMENT ON COLUMN public.endurance_segment.actual_avg_pace IS 'Actual average pace in seconds per km (from tracking).';
COMMENT ON COLUMN public.endurance_segment.actual_avg_heart_rate IS 'Actual average heart rate in bpm (from tracking).';
COMMENT ON COLUMN public.endurance_segment.actual_max_heart_rate IS 'Actual max heart rate in bpm (from tracking).';

-- ============================================================================
-- Step 2: Migrate existing endurance sessions to have 1 segment each
-- ============================================================================

INSERT INTO endurance_segment (
  endurance_session_id,
  segment_order,
  segment_type,
  target_type,
  target_value,
  target_heart_rate_zone
)
SELECT
  es.id,
  1,  -- segment_order
  'work',  -- segment_type (default for simple sessions)
  CASE
    WHEN es.unit IN ('minutes', 'seconds') THEN 'time'
    WHEN es.unit IN ('km', 'miles', 'meters') THEN 'distance'
    ELSE 'time'
  END,
  CASE
    WHEN es.unit = 'minutes' THEN es.training_volume * 60  -- Convert to seconds
    WHEN es.unit = 'seconds' THEN es.training_volume
    WHEN es.unit = 'km' THEN es.training_volume * 1000  -- Convert to meters
    WHEN es.unit = 'miles' THEN es.training_volume * 1609.34  -- Convert to meters
    WHEN es.unit = 'meters' THEN es.training_volume
    ELSE es.training_volume * 60  -- Default: assume minutes
  END,
  es.heart_rate_zone
FROM endurance_session es
WHERE NOT EXISTS (
  -- Only migrate if no segments exist yet (idempotent)
  SELECT 1 FROM endurance_segment seg WHERE seg.endurance_session_id = es.id
);

-- ============================================================================
-- Step 3: Drop old columns from endurance_session
-- ============================================================================

-- Drop training_volume, unit, and heart_rate_zone columns
-- These are now stored in endurance_segment table
ALTER TABLE public.endurance_session
  DROP COLUMN IF EXISTS training_volume,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS heart_rate_zone;

-- ============================================================================
-- Step 4: Add RLS policies for endurance_segment
-- ============================================================================

-- Enable RLS on endurance_segment
ALTER TABLE public.endurance_segment ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view segments for their own endurance sessions
CREATE POLICY "Users can view own endurance segments"
  ON public.endurance_segment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = endurance_segment.endurance_session_id
        AND up.user_id = auth.uid()
    )
  );

-- Policy: Users can insert segments for their own endurance sessions
CREATE POLICY "Users can insert own endurance segments"
  ON public.endurance_segment
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = endurance_session_id
        AND up.user_id = auth.uid()
    )
  );

-- Policy: Users can update segments for their own endurance sessions
CREATE POLICY "Users can update own endurance segments"
  ON public.endurance_segment
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = endurance_segment.endurance_session_id
        AND up.user_id = auth.uid()
    )
  );

-- Policy: Users can delete segments for their own endurance sessions
CREATE POLICY "Users can delete own endurance segments"
  ON public.endurance_segment
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = endurance_segment.endurance_session_id
        AND up.user_id = auth.uid()
    )
  );
