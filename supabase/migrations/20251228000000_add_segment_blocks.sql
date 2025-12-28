-- Migration: Add segment_block table for structured interval workouts
-- This enables block-based interval definitions where a block contains segments
-- that can be repeated together (e.g., 4× [1km hard + 90s recovery])
--
-- Structure: endurance_session → segment_block → endurance_segment
--
-- Benefits:
-- - Cleaner block-based interval definitions
-- - AI generates fewer segments (one block instead of N repeated segments)
-- - Supports complex patterns like 3× (2× [200m + 30s jog] + 3min walk)
-- - Block-level metadata (name, description)

-- ============================================================================
-- Step 1: Create segment_block table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.segment_block (
  id SERIAL PRIMARY KEY,
  endurance_session_id INTEGER NOT NULL REFERENCES endurance_session(id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL,  -- Order within session (1, 2, 3...)

  -- Block metadata
  name TEXT,  -- Optional custom name (e.g., "Main Set", "Warm Up Block")
  description TEXT,

  -- Repeat configuration
  repeat_count INTEGER NOT NULL DEFAULT 1 CHECK (repeat_count >= 1 AND repeat_count <= 20),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_block_order UNIQUE (endurance_session_id, block_order)
);

-- Index for efficient block lookups
CREATE INDEX IF NOT EXISTS idx_segment_block_session_id ON segment_block(endurance_session_id);

-- Comments
COMMENT ON TABLE public.segment_block IS 'Blocks of segments within an endurance session. Each block can be repeated N times.';
COMMENT ON COLUMN public.segment_block.block_order IS 'Order within session (1, 2, 3...). Blocks are executed in this order.';
COMMENT ON COLUMN public.segment_block.repeat_count IS 'Number of times to repeat all segments in this block (default 1, max 20).';

-- ============================================================================
-- Step 2: Add block_id to endurance_segment table
-- ============================================================================

-- Add block_id column (nullable initially for migration)
ALTER TABLE public.endurance_segment
  ADD COLUMN IF NOT EXISTS block_id INTEGER REFERENCES segment_block(id) ON DELETE CASCADE;

-- Create index for block lookups
CREATE INDEX IF NOT EXISTS idx_endurance_segment_block_id ON endurance_segment(block_id);

-- Update segment_order comment - now represents order within block, not session
COMMENT ON COLUMN public.endurance_segment.segment_order IS 'Order within block (1, 2, 3...). Segments are executed in this order within their block.';

-- ============================================================================
-- Step 3: Migrate existing segments to blocks
-- Each existing segment gets its own block with repeat_count from segment
-- ============================================================================

-- Step 3a: Create blocks for existing segments
-- Group consecutive segments with same repeat_count into a single block
-- This is done via a function for clarity

DO $$
DECLARE
  session_record RECORD;
  segment_record RECORD;
  current_block_id INTEGER;
  current_repeat_count INTEGER;
  block_order_counter INTEGER;
  segment_order_counter INTEGER;
BEGIN
  -- Process each endurance session
  FOR session_record IN
    SELECT DISTINCT endurance_session_id
    FROM endurance_segment
    WHERE block_id IS NULL
  LOOP
    current_block_id := NULL;
    current_repeat_count := NULL;
    block_order_counter := 0;
    segment_order_counter := 0;

    -- Process segments in order
    FOR segment_record IN
      SELECT * FROM endurance_segment
      WHERE endurance_session_id = session_record.endurance_session_id
        AND block_id IS NULL
      ORDER BY segment_order
    LOOP
      -- Check if we need a new block (different repeat_count or first segment)
      IF current_repeat_count IS NULL OR current_repeat_count != COALESCE(segment_record.repeat_count, 1) THEN
        -- Create new block
        block_order_counter := block_order_counter + 1;
        segment_order_counter := 0;
        current_repeat_count := COALESCE(segment_record.repeat_count, 1);

        INSERT INTO segment_block (endurance_session_id, block_order, repeat_count)
        VALUES (session_record.endurance_session_id, block_order_counter, current_repeat_count)
        RETURNING id INTO current_block_id;
      END IF;

      -- Update segment with block_id and reset segment_order within block
      segment_order_counter := segment_order_counter + 1;
      UPDATE endurance_segment
      SET block_id = current_block_id,
          segment_order = segment_order_counter
      WHERE id = segment_record.id;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Step 4: Make block_id NOT NULL and remove repeat_count from segment
-- ============================================================================

-- Now that all segments have blocks, make block_id required
ALTER TABLE public.endurance_segment
  ALTER COLUMN block_id SET NOT NULL;

-- Remove repeat_count from segment (now on block)
ALTER TABLE public.endurance_segment
  DROP COLUMN IF EXISTS repeat_count;

-- Update unique constraint: segment_order is now unique within block, not session
ALTER TABLE public.endurance_segment
  DROP CONSTRAINT IF EXISTS unique_segment_order;

ALTER TABLE public.endurance_segment
  ADD CONSTRAINT unique_segment_order_in_block UNIQUE (block_id, segment_order);

-- Drop old index if exists
DROP INDEX IF EXISTS idx_endurance_segment_session_id;

-- ============================================================================
-- Step 5: Add RLS policies for segment_block
-- ============================================================================

-- Enable RLS on segment_block
ALTER TABLE public.segment_block ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view blocks for their own endurance sessions
CREATE POLICY "Users can view own segment blocks"
  ON public.segment_block
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = segment_block.endurance_session_id
        AND up.user_id = auth.uid()
    )
  );

-- Policy: Users can insert blocks for their own endurance sessions
CREATE POLICY "Users can insert own segment blocks"
  ON public.segment_block
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

-- Policy: Users can update blocks for their own endurance sessions
CREATE POLICY "Users can update own segment blocks"
  ON public.segment_block
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = segment_block.endurance_session_id
        AND up.user_id = auth.uid()
    )
  );

-- Policy: Users can delete blocks for their own endurance sessions
CREATE POLICY "Users can delete own segment blocks"
  ON public.segment_block
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM endurance_session es
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE es.id = segment_block.endurance_session_id
        AND up.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Step 6: Update endurance_segment RLS policies (block_id reference)
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own endurance segments" ON public.endurance_segment;
DROP POLICY IF EXISTS "Users can insert own endurance segments" ON public.endurance_segment;
DROP POLICY IF EXISTS "Users can update own endurance segments" ON public.endurance_segment;
DROP POLICY IF EXISTS "Users can delete own endurance segments" ON public.endurance_segment;

-- Recreate with block-based access
CREATE POLICY "Users can view own endurance segments"
  ON public.endurance_segment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM segment_block sb
      JOIN endurance_session es ON sb.endurance_session_id = es.id
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE sb.id = endurance_segment.block_id
        AND up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own endurance segments"
  ON public.endurance_segment
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM segment_block sb
      JOIN endurance_session es ON sb.endurance_session_id = es.id
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE sb.id = block_id
        AND up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own endurance segments"
  ON public.endurance_segment
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM segment_block sb
      JOIN endurance_session es ON sb.endurance_session_id = es.id
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE sb.id = endurance_segment.block_id
        AND up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own endurance segments"
  ON public.endurance_segment
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM segment_block sb
      JOIN endurance_session es ON sb.endurance_session_id = es.id
      JOIN daily_training dt ON es.daily_training_id = dt.id
      JOIN weekly_schedules ws ON dt.weekly_schedule_id = ws.id
      JOIN training_plans tp ON ws.training_plan_id = tp.id
      JOIN user_profiles up ON tp.user_profile_id = up.id
      WHERE sb.id = endurance_segment.block_id
        AND up.user_id = auth.uid()
    )
  );
