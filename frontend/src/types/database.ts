// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: number;
          user_id: string;
          username: string;
          primary_goal: string;
          primary_goal_description: string;
          coach_id: number | null;
          experience_level: string;
          days_per_week: number;
          minutes_per_session: number;
          equipment: string;
          age: number;
          weight: number;
          weight_unit: string;
          height: number;
          height_unit: string;
          gender: string;
          has_limitations: boolean;
          limitations_description: string;
          final_chat_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          username: string;
          primary_goal: string;
          primary_goal_description: string;
          coach_id?: number | null;
          experience_level: string;
          days_per_week: number;
          minutes_per_session: number;
          equipment: string;
          age: number;
          weight: number;
          weight_unit: string;
          height: number;
          height_unit: string;
          gender: string;
          has_limitations: boolean;
          limitations_description: string;
          final_chat_notes: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          username?: string;
          primary_goal?: string;
          primary_goal_description?: string;
          coach_id?: number | null;
          experience_level?: string;
          days_per_week?: number;
          minutes_per_session?: number;
          equipment?: string;
          age?: number;
          weight?: number;
          weight_unit?: string;
          height?: number;
          height_unit?: string;
          gender?: string;
          has_limitations?: boolean;
          limitations_description?: string;
          final_chat_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      coaches: {
        Row: {
          id: number;
          name: string;
          goal: string;
          icon_name: string;
          tagline: string;
          primary_color_hex: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          goal: string;
          icon_name: string;
          tagline: string;
          primary_color_hex: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          goal?: string;
          icon_name?: string;
          tagline?: string;
          primary_color_hex?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      training_plans: {
        Row: {
          id: number;
          user_profile_id: number;
          title: string;
          summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_profile_id: number;
          title: string;
          summary: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_profile_id?: number;
          title?: string;
          summary?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      weekly_schedules: {
        Row: {
          id: number;
          training_plan_id: number;
          week_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          training_plan_id: number;
          week_number: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          training_plan_id?: number;
          week_number?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_trainings: {
        Row: {
          id: number;
          weekly_schedule_id: number;
          day_of_week: string;
          is_rest_day: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          weekly_schedule_id: number;
          day_of_week: string;
          is_rest_day?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          weekly_schedule_id?: number;
          day_of_week?: string;
          is_rest_day?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      training_exercises: {
        Row: {
          id: number;
          daily_training_id: number;
          exercise_id: number;
          sets: number;
          reps: number[];
          weight: (number | null)[];
          completed: boolean;
          created_at: string;
          updated_at: string;
          weight_1rm: number[];
        };
        Insert: {
          id?: number;
          daily_training_id: number;
          exercise_id: number;
          sets: number;
          reps: number[];
          weight?: (number | null)[];
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
          weight_1rm?: number[];
        };
        Update: {
          id?: number;
          daily_training_id?: number;
          exercise_id?: number;
          sets?: number;
          reps?: number[];
          weight?: (number | null)[];
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
          weight_1rm?: number[];
        };
      };
      exercises: {
        Row: {
          id: number;
          name: string;
          description: string;
          video_url: string | null;
          target_area: string | null;
          main_muscles: string[] | null;
          secondary_muscles: string[] | null;
          equipment: string | null;
          difficulty: string | null;
          exercise_tier: string | null;
          popularity_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description: string;
          video_url?: string | null;
          target_area?: string | null;
          main_muscles?: string[] | null;
          secondary_muscles?: string[] | null;
          equipment?: string | null;
          difficulty?: string | null;
          exercise_tier?: string | null;
          popularity_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string;
          video_url?: string | null;
          target_area?: string | null;
          main_muscles?: string[] | null;
          secondary_muscles?: string[] | null;
          equipment?: string | null;
          difficulty?: string | null;
          exercise_tier?: string | null;
          popularity_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
