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
      workout_plans: {
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
