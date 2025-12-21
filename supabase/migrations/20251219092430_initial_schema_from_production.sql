-- Initial schema from production
-- Downloaded from Supabase Dashboard → Database → Schema Visualizer
-- Fixed: Added IF NOT EXISTS, proper array types, and correct table order

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables in dependency order (tables without foreign keys first)

-- Base tables (no foreign keys)
CREATE TABLE IF NOT EXISTS public.exercises (
  id SERIAL,
  name text NOT NULL,
  equipment text NOT NULL,
  target_area text NOT NULL,
  force text NOT NULL,
  difficulty text NOT NULL,
  tier text NOT NULL,
  popularity_score integer NOT NULL,
  main_muscles text[] NOT NULL,
  secondary_muscles text[] NOT NULL,
  preparation text,
  execution text,
  tips text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  alternative_names text[],
  CONSTRAINT exercises_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id SERIAL,
  user_id uuid NOT NULL UNIQUE,
  username character varying NOT NULL,
  age integer NOT NULL,
  weight numeric NOT NULL,
  height numeric NOT NULL,
  weight_unit character varying NOT NULL DEFAULT 'kg'::character varying,
  height_unit character varying NOT NULL DEFAULT 'cm'::character varying,
  measurement_system character varying NOT NULL DEFAULT 'metric'::character varying,
  gender character varying NOT NULL,
  goal_description text NOT NULL,
  initial_questions jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  experience_level character varying NOT NULL,
  initial_responses jsonb,
  plan_accepted boolean,
  information_complete boolean,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.documents (
  id BIGSERIAL,
  title text NOT NULL,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'pdf'::text,
  topic text,
  keywords text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.latency (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event character varying NOT NULL,
  duration_seconds real NOT NULL CHECK (duration_seconds >= 0::double precision),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  total_tokens integer CHECK (total_tokens IS NULL OR total_tokens >= 0),
  model character varying,
  CONSTRAINT latency_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id SERIAL,
  event character varying NOT NULL,
  user_id character varying NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  properties jsonb,
  CONSTRAINT telemetry_events_pkey PRIMARY KEY (id)
);

-- Tables with foreign keys (depend on base tables above)

CREATE TABLE IF NOT EXISTS public.ai_exercises (
  id BIGSERIAL,
  ai_exercise_name text NOT NULL,
  main_muscle text NOT NULL,
  equipment text NOT NULL,
  similarity_score double precision NOT NULL DEFAULT 0.0 CHECK (similarity_score >= 0.0::double precision AND similarity_score <= 1.0::double precision),
  matched_exercise_id integer,
  matched_exercise_name text,
  status text NOT NULL DEFAULT 'pending_review'::text,
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT ai_exercises_matched_exercise_id_fkey FOREIGN KEY (matched_exercise_id) REFERENCES public.exercises(id)
);
CREATE TABLE IF NOT EXISTS public.training_plans (
  id SERIAL,
  user_profile_id integer NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  justification text,
  ai_message text,
  CONSTRAINT training_plans_pkey PRIMARY KEY (id),
  CONSTRAINT workout_plans_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);

CREATE TABLE IF NOT EXISTS public.weekly_schedules (
  id SERIAL,
  training_plan_id integer NOT NULL,
  week_number integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  focus_theme text,
  primary_goal text,
  progression_lever text,
  CONSTRAINT weekly_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_schedules_workout_plan_id_fkey FOREIGN KEY (training_plan_id) REFERENCES public.training_plans(id)
);

CREATE TABLE IF NOT EXISTS public.daily_training (
  id SERIAL,
  weekly_schedule_id integer NOT NULL,
  day_of_week text NOT NULL,
  is_rest_day boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  training_type text NOT NULL CHECK (training_type = ANY (ARRAY['strength'::text, 'endurance'::text, 'mixed'::text, 'rest'::text])),
  justification text,
  session_rpe bigint,
  scheduled_date timestamp with time zone,
  CONSTRAINT daily_training_pkey PRIMARY KEY (id),
  CONSTRAINT daily_workouts_weekly_schedule_id_fkey FOREIGN KEY (weekly_schedule_id) REFERENCES public.weekly_schedules(id)
);
CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id BIGSERIAL,
  document_id bigint NOT NULL,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT document_embeddings_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);

CREATE TABLE IF NOT EXISTS public.endurance_session (
  id SERIAL,
  daily_training_id integer NOT NULL,
  sport_type text NOT NULL,
  training_volume numeric NOT NULL,
  unit text NOT NULL,
  heart_rate_zone integer CHECK (heart_rate_zone >= 1 AND heart_rate_zone <= 5),
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name character varying,
  description text,
  execution_order smallint,
  CONSTRAINT endurance_session_pkey PRIMARY KEY (id),
  CONSTRAINT endurance_session_daily_training_id_fkey FOREIGN KEY (daily_training_id) REFERENCES public.daily_training(id)
);
CREATE TABLE IF NOT EXISTS public.insights_summaries (
  id SERIAL,
  user_profile_id integer UNIQUE,
  summary jsonb,
  data_hash text,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone,
  CONSTRAINT insights_summaries_pkey PRIMARY KEY (id),
  CONSTRAINT insights_summaries_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE IF NOT EXISTS public.lessons (
  id SERIAL,
  lesson_id character varying NOT NULL UNIQUE,
  user_profile_id integer NOT NULL,
  text text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  positive boolean DEFAULT true,
  confidence double precision DEFAULT 0.5 CHECK (confidence >= 0.0::double precision AND confidence <= 1.0::double precision),
  requires_context boolean DEFAULT false,
  context text,
  helpful_count integer DEFAULT 0,
  harmful_count integer DEFAULT 0,
  times_applied integer DEFAULT 0,
  last_used_at timestamp with time zone,
  source_plan_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE IF NOT EXISTS public.strength_exercise (
  id SERIAL,
  daily_training_id integer NOT NULL,
  exercise_id integer NOT NULL,
  sets integer NOT NULL,
  reps text[] NOT NULL,
  weight numeric[],
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  execution_order smallint,
  CONSTRAINT strength_exercise_pkey PRIMARY KEY (id),
  CONSTRAINT workout_exercises_daily_workout_id_fkey FOREIGN KEY (daily_training_id) REFERENCES public.daily_training(id),
  CONSTRAINT workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
);