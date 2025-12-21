-- Add ON DELETE CASCADE to foreign key constraints
-- This allows cascading deletes when weekly_schedules are deleted/updated
-- which is required by the update_single_week function

-- 1. Drop and recreate daily_training -> weekly_schedules foreign key with CASCADE
ALTER TABLE public.daily_training
DROP CONSTRAINT IF EXISTS daily_workouts_weekly_schedule_id_fkey;

ALTER TABLE public.daily_training
ADD CONSTRAINT daily_workouts_weekly_schedule_id_fkey 
FOREIGN KEY (weekly_schedule_id) 
REFERENCES public.weekly_schedules(id) 
ON DELETE CASCADE;

-- 2. Drop and recreate endurance_session -> daily_training foreign key with CASCADE
ALTER TABLE public.endurance_session
DROP CONSTRAINT IF EXISTS endurance_session_daily_training_id_fkey;

ALTER TABLE public.endurance_session
ADD CONSTRAINT endurance_session_daily_training_id_fkey 
FOREIGN KEY (daily_training_id) 
REFERENCES public.daily_training(id) 
ON DELETE CASCADE;

-- 3. Drop and recreate strength_exercise -> daily_training foreign key with CASCADE
ALTER TABLE public.strength_exercise
DROP CONSTRAINT IF EXISTS workout_exercises_daily_workout_id_fkey;

ALTER TABLE public.strength_exercise
ADD CONSTRAINT workout_exercises_daily_workout_id_fkey 
FOREIGN KEY (daily_training_id) 
REFERENCES public.daily_training(id) 
ON DELETE CASCADE;
