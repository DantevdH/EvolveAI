import { supabase } from '../config/supabase';

export interface Coach {
  id: number;
  name: string;
  goal: string;
  specialization?: string;
  bio?: string;
  experience_years?: number;
  certifications?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CoachServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CoachService {
  /**
   * Fetch all coaches from the database
   */
  static async getAllCoaches(): Promise<CoachServiceResponse<Coach[]>> {
    try {
      console.log('👨‍💼 CoachService: Fetching all coaches...');

      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ CoachService: Failed to fetch coaches:', error);
        return {
          success: false,
          error: `Failed to fetch coaches: ${error.message}`,
        };
      }

      if (data) {
        console.log(`✅ CoachService: Fetched ${data.length} coaches successfully`);
        return {
          success: true,
          data: data as Coach[],
        };
      } else {
        console.warn('⚠️ CoachService: No coaches data returned');
        return {
          success: true,
          data: [],
        };
      }
    } catch (error) {
      console.error('💥 CoachService: Unexpected error fetching coaches:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Filter coaches by fitness goal
   */
  static filterCoachesByGoal(coaches: Coach[], goal: string): Coach[] {
    // Validate input
    if (!goal || typeof goal !== 'string') {
      console.warn('⚠️ CoachService: Invalid goal provided to filterCoachesByGoal:', goal);
      return [];
    }
    
    // The frontend goals are already in the correct format (e.g., "Weight Loss", "Bodybuilding")
    // So we can use them directly, but let's also handle underscore format just in case
    let finalGoal = goal;
    
    // If goal contains underscores, transform it
    if (goal.includes('_')) {
      finalGoal = goal.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Handle common goal variations (same mapping as backend)
    const goalMapping: { [key: string]: string } = {
      "muscle_gain": "Bodybuilding",
      "muscle_growth": "Bodybuilding", 
      "build_muscle": "Bodybuilding",
      "weight_loss": "Weight Loss",
      "lose_weight": "Weight Loss",
      "fat_loss": "Weight Loss",
      "increase_strength": "Strength",
      "get_stronger": "Strength",
      "strength_training": "Strength"
    };
    
    // Use mapping if available, otherwise use the transformed goal
    finalGoal = goalMapping[goal.toLowerCase()] || finalGoal;
    
    // Filter coaches that match the goal
    const matchingCoaches = coaches.filter(coach => 
      coach.goal && coach.goal.toLowerCase() === finalGoal.toLowerCase()
    );
    
    console.log(`🔍 CoachService: Filtering coaches for goal: '${goal}' -> '${finalGoal}'`);
    console.log(`📊 CoachService: Found ${matchingCoaches.length} matching coaches out of ${coaches.length} total`);
    
    return matchingCoaches;
  }

  /**
   * Get coaches for a specific goal (combines fetch and filter)
   */
  static async getCoachesForGoal(goal: string): Promise<CoachServiceResponse<Coach[]>> {
    try {
      const allCoachesResult = await this.getAllCoaches();
      
      if (!allCoachesResult.success || !allCoachesResult.data) {
        return {
          success: false,
          error: allCoachesResult.error || 'Failed to fetch coaches',
        };
      }

      const filteredCoaches = this.filterCoachesByGoal(allCoachesResult.data, goal);
      
      return {
        success: true,
        data: filteredCoaches,
      };
    } catch (error) {
      console.error('💥 CoachService: Unexpected error getting coaches for goal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }
}
