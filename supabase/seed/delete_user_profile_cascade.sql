-- Delete user_profile and ALL related data (cascade delete)
-- Replace 'YOUR-USER-ID-HERE' with your actual user_id UUID
-- Or replace user_profile_id := 1 with your profile ID

DO $$
DECLARE
  target_user_id uuid := 'ff932444-f5a1-4651-8399-0be4bf2c2daf'::uuid;  -- ⚠️ CHANGE THIS to your user_id UUID
  -- OR use profile ID instead: target_user_profile_id integer := 1;  -- ⚠️ CHANGE THIS
  profile_id integer;
BEGIN
  -- Get profile_id from user_id (if using UUID)
  SELECT id INTO profile_id FROM public.user_profiles WHERE user_id = target_user_id;
  
  -- If using profile_id directly, uncomment this:
  -- profile_id := target_user_profile_id;
  
  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  RAISE NOTICE 'Deleting user_profile_id: % and all related data', profile_id;
  
  -- Delete in dependency order (children first, then parents)
  
  -- 1. Delete endurance_session (depends on daily_training)
  DELETE FROM public.endurance_session
  WHERE daily_training_id IN (
    SELECT dt.id FROM public.daily_training dt
    JOIN public.weekly_schedules ws ON dt.weekly_schedule_id = ws.id
    JOIN public.training_plans tp ON ws.training_plan_id = tp.id
    WHERE tp.user_profile_id = profile_id
  );
  
  -- 2. Delete strength_exercise (depends on daily_training)
  DELETE FROM public.strength_exercise
  WHERE daily_training_id IN (
    SELECT dt.id FROM public.daily_training dt
    JOIN public.weekly_schedules ws ON dt.weekly_schedule_id = ws.id
    JOIN public.training_plans tp ON ws.training_plan_id = tp.id
    WHERE tp.user_profile_id = profile_id
  );
  
  -- 3. Delete daily_training (depends on weekly_schedules)
  DELETE FROM public.daily_training
  WHERE weekly_schedule_id IN (
    SELECT ws.id FROM public.weekly_schedules ws
    JOIN public.training_plans tp ON ws.training_plan_id = tp.id
    WHERE tp.user_profile_id = profile_id
  );
  
  -- 4. Delete weekly_schedules (depends on training_plans)
  DELETE FROM public.weekly_schedules
  WHERE training_plan_id IN (
    SELECT id FROM public.training_plans WHERE user_profile_id = profile_id
  );
  
  -- 5. Delete training_plans (depends on user_profiles)
  DELETE FROM public.training_plans WHERE user_profile_id = profile_id;
  
  -- 6. Delete lessons (depends on user_profiles)
  DELETE FROM public.lessons WHERE user_profile_id = profile_id;
  
  -- 7. Delete insights_summaries (depends on user_profiles)
  DELETE FROM public.insights_summaries WHERE user_profile_id = profile_id;
  
  -- 8. Finally delete user_profile
  DELETE FROM public.user_profiles WHERE id = profile_id;
  
  RAISE NOTICE '✅ Successfully deleted user_profile and all related data';
END $$;

-- ============================================================
-- ONE-LINER VERSION (for quick copy-paste)
-- ============================================================
-- Replace USER_ID_UUID_HERE with your actual UUID:
/*
DO $$ DECLARE p_id integer; BEGIN SELECT id INTO p_id FROM public.user_profiles WHERE user_id = 'USER_ID_UUID_HERE'::uuid; DELETE FROM public.endurance_session WHERE daily_training_id IN (SELECT dt.id FROM public.daily_training dt JOIN public.weekly_schedules ws ON dt.weekly_schedule_id = ws.id JOIN public.training_plans tp ON ws.training_plan_id = tp.id WHERE tp.user_profile_id = p_id); DELETE FROM public.strength_exercise WHERE daily_training_id IN (SELECT dt.id FROM public.daily_training dt JOIN public.weekly_schedules ws ON dt.weekly_schedule_id = ws.id JOIN public.training_plans tp ON ws.training_plan_id = tp.id WHERE tp.user_profile_id = p_id); DELETE FROM public.daily_training WHERE weekly_schedule_id IN (SELECT ws.id FROM public.weekly_schedules ws JOIN public.training_plans tp ON ws.training_plan_id = tp.id WHERE tp.user_profile_id = p_id); DELETE FROM public.weekly_schedules WHERE training_plan_id IN (SELECT id FROM public.training_plans WHERE user_profile_id = p_id); DELETE FROM public.training_plans WHERE user_profile_id = p_id; DELETE FROM public.lessons WHERE user_profile_id = p_id; DELETE FROM public.insights_summaries WHERE user_profile_id = p_id; DELETE FROM public.user_profiles WHERE id = p_id; END $$;
*/
