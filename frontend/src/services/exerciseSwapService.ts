// Exercise Swap Service - Handles exercise recommendations and search
import { supabase } from '../config/supabase';
import { Exercise } from '../types/training';

// Constants
const DEFAULT_RECOMMENDATION_LIMIT = 3;
const MAX_RECOMMENDATION_LIMIT = 10;
const SIMILARITY_THRESHOLD = 0.7;
const SEARCH_DEBOUNCE_MS = 300;
const SIMILARITY_STOP_WORDS = ['exercise', 'movement', 'incline', 'decline', 'raise', 'press', 'pull'];

export interface ExerciseRecommendation {
  exercise: Exercise;
  similarityScore: number;
}

export interface ExerciseSearchFilters {
  target_area?: string;
  equipment?: string;
  difficulty?: string;
}

export interface ExerciseSearchResult {
  exercise: Exercise;
  relevanceScore: number;
}

interface DatabaseExercise {
  id: number;
  name: string;
  force: string;
  instructions: string;
  equipment: string;
  target_area: string;
  secondary_muscles: string[];
  main_muscles: string[];
  difficulty: string;
  exercise_tier: string;
  image_url?: string;
  video_url?: string;
  popularity_score?: number;
}

export class ExerciseSwapService {
  /**
   * Convert database exercise format to Exercise type
   */
  private static convertDatabaseExerciseToExercise(dbExercise: DatabaseExercise): Exercise {
    return {
      id: dbExercise.id.toString(),
      name: dbExercise.name,
      force: dbExercise.force,
      instructions: dbExercise.instructions,
      equipment: dbExercise.equipment,
      target_area: dbExercise.target_area,
      secondary_muscles: dbExercise.secondary_muscles,
      main_muscles: dbExercise.main_muscles,
      difficulty: dbExercise.difficulty as 'Beginner' | 'Intermediate' | 'Advanced' | undefined,
      exercise_tier: dbExercise.exercise_tier,
      imageUrl: dbExercise.image_url,
      videoUrl: dbExercise.video_url
    };
  }

  /**
   * Get AI-powered exercise recommendations based on primary muscle group
   */
  static async getExerciseRecommendations(
    currentExercise: Exercise,
    limit: number = DEFAULT_RECOMMENDATION_LIMIT,
    scheduledExerciseIds: string[] = [],
    scheduledExerciseNames: string[] = []
  ): Promise<{ success: boolean; data?: ExerciseRecommendation[]; error?: string }> {
    try {
      // Input validation
      if (!currentExercise) {
        return { success: false, error: 'Current exercise is required' };
      }
      
      if (!currentExercise.id || !currentExercise.name) {
        return { success: false, error: 'Invalid exercise data provided' };
      }
      
      if (limit < 1 || limit > MAX_RECOMMENDATION_LIMIT) {
        return { success: false, error: `Limit must be between 1 and ${MAX_RECOMMENDATION_LIMIT}` };
      }

      
      // Get the primary muscle group from the current exercise
      const primaryMuscle = currentExercise.main_muscles?.[0];
      const targetArea = currentExercise.target_area;
      
      if (!primaryMuscle) {
        return {
          success: false,
          error: 'Could not determine primary muscle group for recommendations'
        };
      }


      // Build query to exclude current exercise and scheduled exercises
      let query = supabase
        .from('exercises')
        .select('*')
        .neq('id', currentExercise.id)
        .contains('main_muscles', [primaryMuscle])
        .order('popularity_score', { ascending: false });

      // Exclude scheduled exercises for the day
      if (scheduledExerciseIds.length > 0) {
        query = query.not('id', 'in', `(${scheduledExerciseIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching exercise recommendations:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.log('❌ No exercises found with same primary muscle:', primaryMuscle);
        return { success: true, data: [] };
      }


      // Filter for diverse exercises (avoid similar names to current and scheduled exercises)
      const diverseExercises = this.selectDiverseExercises(data, currentExercise.name, limit, scheduledExerciseNames || []);
      

      // Convert to recommendations format
      const recommendations: ExerciseRecommendation[] = diverseExercises.map((exercise: DatabaseExercise) => {
        const exerciseData = this.convertDatabaseExerciseToExercise(exercise);
        return {
          exercise: exerciseData,
          similarityScore: 0.8 // High score since they share the same primary muscle
        };
      });

      return { success: true, data: recommendations };

    } catch (error) {
      console.error('💥 Error in getExerciseRecommendations:', error);
      return { success: false, error: 'Failed to get exercise recommendations' };
    }
  }

  /**
   * Search for exercises with filters
   */
  static async searchExercises(
    query: string,
    filters: ExerciseSearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ success: boolean; data?: ExerciseSearchResult[]; error?: string }> {
    try {
      console.log('🔍 Searching exercises with query:', query, 'filters:', filters, 'limit:', limit, 'offset:', offset);

      let supabaseQuery = supabase
        .from('exercises')
        .select('*');

      // Apply text search
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,target_area.ilike.%${query}%,equipment.ilike.%${query}%`);
      }

      // Apply filters
      if (filters.target_area) {
        supabaseQuery = supabaseQuery.eq('target_area', filters.target_area);
      }

      if (filters.equipment) {
        supabaseQuery = supabaseQuery.eq('equipment', filters.equipment);
      }

      if (filters.difficulty) {
        supabaseQuery = supabaseQuery.eq('difficulty', filters.difficulty);
      }

      // Order alphabetically by name, apply pagination
      supabaseQuery = supabaseQuery
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('❌ Error searching exercises:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: true, data: [] };
      }

      // Transform and score results
      const results: ExerciseSearchResult[] = data.map((exercise: any) => {
        const exerciseData: Exercise = {
          id: exercise.id.toString(),
          name: exercise.name,
          force: exercise.force,
          instructions: exercise.instructions,
          equipment: exercise.equipment,
          target_area: exercise.target_area,
          secondary_muscles: exercise.secondary_muscles,
          main_muscles: exercise.main_muscles,
          difficulty: exercise.difficulty,
          exercise_tier: exercise.exercise_tier,
          imageUrl: exercise.image_url,
          videoUrl: exercise.video_url
        };

        // Calculate relevance score based on query match
        const relevanceScore = this.calculateRelevanceScore(exerciseData, query, filters);

        return {
          exercise: exerciseData,
          relevanceScore
        };
      });

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`✅ Found ${results.length} exercise search results`);
      return { success: true, data: results };

    } catch (error) {
      console.error('💥 Error in searchExercises:', error);
      return { success: false, error: 'Failed to search exercises' };
    }
  }

  /**
   * Get available filter options (target areas and equipment)
   */
  static async getFilterOptions(): Promise<{
    success: boolean;
    data?: {
      targetAreas: string[];
      equipment: string[];
      difficulties: string[];
    };
    error?: string;
  }> {
    try {
      console.log('📋 Getting filter options for exercise search');

      // Get unique target areas
      const { data: targetAreas, error: targetError } = await supabase
        .from('exercises')
        .select('target_area')
        .not('target_area', 'is', null);

      if (targetError) {
        console.error('❌ Error fetching target areas:', targetError);
        return { success: false, error: targetError.message };
      }

      // Get unique equipment
      const { data: equipment, error: equipmentError } = await supabase
        .from('exercises')
        .select('equipment')
        .not('equipment', 'is', null);

      if (equipmentError) {
        console.error('❌ Error fetching equipment:', equipmentError);
        return { success: false, error: equipmentError.message };
      }

      // Get unique difficulties
      const { data: difficulties, error: difficultyError } = await supabase
        .from('exercises')
        .select('difficulty')
        .not('difficulty', 'is', null);

      if (difficultyError) {
        console.error('❌ Error fetching difficulties:', difficultyError);
        return { success: false, error: difficultyError.message };
      }

      const uniqueTargetAreas = [...new Set(targetAreas.map(item => item.target_area))].sort();
      const uniqueEquipment = [...new Set(equipment.map(item => item.equipment))].sort();
      const uniqueDifficulties = [...new Set(difficulties.map(item => item.difficulty))].sort();

      console.log(`✅ Found ${uniqueTargetAreas.length} target areas, ${uniqueEquipment.length} equipment types, and ${uniqueDifficulties.length} difficulty levels`);

      return {
        success: true,
        data: {
          targetAreas: uniqueTargetAreas,
          equipment: uniqueEquipment,
          difficulties: uniqueDifficulties
        }
      };

    } catch (error) {
      console.error('💥 Error in getFilterOptions:', error);
      return { success: false, error: 'Failed to get filter options' };
    }
  }

  /**
   * Select diverse exercises using rule-based scoring (same as backend)
   */
  private static selectDiverseExercises(exercises: any[], currentExerciseName: string, limit: number, scheduledExerciseNames: string[] = []): any[] {
    
    const currentName = currentExerciseName.toLowerCase().trim();
    const scoredExercises: Array<{
      exercise: any;
      score: number;
      diversity_score: number;
      equipment_score: number;
      popularity_score: number;
    }> = [];
    
    // Score each exercise
    for (const exercise of exercises) {
      const candidateName = exercise.name.toLowerCase().trim();
      const candidateEquipment = exercise.equipment?.toLowerCase() || '';
      
      // Skip exact same exercise
      if (candidateName === currentName) {
        continue;
      }
      
      // Calculate scores using same logic as backend
      const diversityScore = this.calculateDiversityScore(currentName, candidateName);
      const equipmentScore = this.calculateEquipmentVarietyScore('', candidateEquipment);
      const popularityScore = Math.min((exercise.popularity_score || 0) / 100.0, 1.0);
      
      // Combined score: diversity (40%) + equipment variety (20%) + popularity (40%)
      const finalScore = (
        diversityScore * 0.4 +
        equipmentScore * 0.2 +
        popularityScore * 0.4
      );
      
      
      scoredExercises.push({
        exercise,
        score: finalScore,
        diversity_score: diversityScore,
        equipment_score: equipmentScore,
        popularity_score: popularityScore
      });
    }
    
    // Sort by score and select diverse recommendations
    scoredExercises.sort((a, b) => b.score - a.score);
    
    const recommendations = this.selectDiverseRecommendations(scoredExercises, limit, scheduledExerciseNames);
    
    
    // Add recommendation reason to each exercise
    return recommendations.map(r => ({
      ...r.exercise,
      recommendation_reason: this.generateRecommendationReason(r),
      recommendation_score: r.score
    }));
  }

  /**
   * Select diverse recommendations ensuring they vary from each other
   */
  private static selectDiverseRecommendations(
    scoredExercises: Array<{
      exercise: any;
      score: number;
      diversity_score: number;
      equipment_score: number;
      popularity_score: number;
    }>,
    limit: number,
    scheduledExerciseNames: string[] = []
  ): Array<{
    exercise: any;
    score: number;
    diversity_score: number;
    equipment_score: number;
    popularity_score: number;
  }> {
    const diverseRecommendations: Array<{
      exercise: any;
      score: number;
      diversity_score: number;
      equipment_score: number;
      popularity_score: number;
    }> = [];
    
    
    for (const candidate of scoredExercises) {
      const candidateName = candidate.exercise.name.toLowerCase().trim();
      
      // Check if this candidate is too similar to any already selected recommendation
      let isTooSimilar = false;
      for (const selected of diverseRecommendations) {
        const selectedName = selected.exercise.name.toLowerCase().trim();
        const similarity = this.calculateNameSimilarity(candidateName, selectedName);
        
        if (similarity > SIMILARITY_THRESHOLD) {
          isTooSimilar = true;
          break;
        }
      }

      // Check if this candidate is too similar to any scheduled exercise
      if (!isTooSimilar && scheduledExerciseNames && scheduledExerciseNames.length > 0) {
        for (const scheduledName of scheduledExerciseNames) {
          const scheduledNameLower = scheduledName.toLowerCase().trim();
          const similarity = this.calculateNameSimilarity(candidateName, scheduledNameLower);
          
          if (similarity > SIMILARITY_THRESHOLD) {
            isTooSimilar = true;
            break;
          }
        }
      }
      
      if (!isTooSimilar) {
        diverseRecommendations.push(candidate);
        
        if (diverseRecommendations.length >= limit) {
          break;
        }
      }
    }
    
    
    return diverseRecommendations;
  }

  /**
   * Calculate diversity score (same logic as backend)
   */
  private static calculateDiversityScore(currentName: string, candidateName: string): number {
    const nameSimilarity = this.calculateNameSimilarity(currentName, candidateName);
    
    // If names are too similar, give low diversity score
    if (nameSimilarity > 0.8) {
      return 0.1;
    }
    
    // If names are completely different, give high diversity score
    if (nameSimilarity < 0.3) {
      return 1.0;
    }
    
    // Medium similarity gets medium score
    return 0.5;
  }

  /**
   * Calculate name similarity using Jaccard similarity (same as backend)
   */
  private static calculateNameSimilarity(name1: string, name2: string): number {
    // Remove common words that don't affect exercise type (same as backend)
    const stopWords = new Set(SIMILARITY_STOP_WORDS);
    
    const words1 = new Set(
      name1.replace(/[-()]/g, ' ').split(' ')
        .filter(word => word.length > 0)
        .filter(word => !stopWords.has(word))
    );
    
    const words2 = new Set(
      name2.replace(/[-()]/g, ' ').split(' ')
        .filter(word => word.length > 0)
        .filter(word => !stopWords.has(word))
    );
    
    if (words1.size === 0 || words2.size === 0) {
      console.log(`🔍 "${name1}" vs "${name2}": empty word sets → similarity: 0.0`);
      return 0.0;
    }
    
    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    console.log(`🔍 "${name1}" vs "${name2}": words1=[${Array.from(words1)}], words2=[${Array.from(words2)}], intersection=[${Array.from(intersection)}], union=[${Array.from(union)}] → similarity: ${similarity.toFixed(2)}`);
    
    return similarity;
  }

  /**
   * Calculate equipment variety score (same logic as backend)
   */
  private static calculateEquipmentVarietyScore(currentEquipment: string, candidateEquipment: string): number {
    if (!currentEquipment || !candidateEquipment) {
      return 0.5;
    }
    
    // If same equipment, give lower score
    if (currentEquipment === candidateEquipment) {
      return 0.3;
    }
    
    // If different equipment, give higher score
    return 0.8;
  }

  /**
   * Generate recommendation reason (same logic as backend)
   */
  private static generateRecommendationReason(scoreData: {
    diversity_score: number;
    equipment_score: number;
    popularity_score: number;
  }): string {
    const reasons: string[] = [];
    
    if (scoreData.diversity_score > 0.7) {
      reasons.push("Different exercise variation");
    }
    
    if (scoreData.equipment_score > 0.6) {
      reasons.push("Different equipment type");
    }
    
    if (scoreData.popularity_score > 0.7) {
      reasons.push("Popular choice");
    }
    
    if (reasons.length === 0) {
      reasons.push("Good alternative");
    }
    
    return reasons.join(" • ");
  }

  /**
   * Calculate similarity score between two exercises
   */
  private static calculateSimilarityScore(
    currentExercise: Exercise,
    candidateExercise: Exercise,
    primaryMuscle: string
  ): number {
    let score = 0;

    // Primary muscle match (highest weight)
    if (candidateExercise.main_muscles?.includes(primaryMuscle)) {
      score += 0.6;
    }

    // Secondary muscle overlap
    const currentSecondaryMuscles = currentExercise.secondary_muscles || [];
    const candidateSecondaryMuscles = candidateExercise.secondary_muscles || [];
    const secondaryOverlap = currentSecondaryMuscles.filter(muscle => 
      candidateSecondaryMuscles.includes(muscle)
    ).length;
    
    if (currentSecondaryMuscles.length > 0) {
      score += (secondaryOverlap / currentSecondaryMuscles.length) * 0.3;
    }

    // Target area match
    if (currentExercise.target_area === candidateExercise.target_area) {
      score += 0.2;
    }

    // Equipment similarity
    if (currentExercise.equipment === candidateExercise.equipment) {
      score += 0.1;
    }

    // Difficulty level similarity
    if (currentExercise.difficulty === candidateExercise.difficulty) {
      score += 0.1;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevanceScore(
    exercise: Exercise,
    query: string,
    filters: ExerciseSearchFilters
  ): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();

    // Name match (highest weight)
    if (exercise.name.toLowerCase().includes(lowerQuery)) {
      score += 0.5;
    }

    // Target area match
    if (exercise.target_area?.toLowerCase().includes(lowerQuery)) {
      score += 0.3;
    }

    // Equipment match
    if (exercise.equipment?.toLowerCase().includes(lowerQuery)) {
      score += 0.2;
    }

    // Apply filter bonuses
    if (filters.target_area && exercise.target_area === filters.target_area) {
      score += 0.2;
    }

    if (filters.equipment && exercise.equipment === filters.equipment) {
      score += 0.1;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

}

