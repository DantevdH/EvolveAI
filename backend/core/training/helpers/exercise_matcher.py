"""
Exercise Matcher Service for EvolveAI

This service matches AI-generated exercise suggestions to database exercises
using fuzzy matching and metadata filtering.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from logging_config import get_logger
from .exercise_selector import ExerciseSelector
import logging

# Try to use RapidFuzz for fast fuzzy matching, fallback to difflib
try:
    from rapidfuzz import fuzz, process
    HAS_RAPIDFUZZ = True
except ImportError:
    from difflib import SequenceMatcher
    HAS_RAPIDFUZZ = False

logger = get_logger(__name__)
# Keep INFO for step transitions, but reduce detailed logs
# Individual exercise matching details will be DEBUG


class ExerciseMatcher:
    """Matches AI-generated exercise suggestions to database exercises."""

    def __init__(self):
        """Initialize the exercise matcher."""
        self.exercise_selector = ExerciseSelector()
        logger.info("✅ Exercise Matcher initialized")

    def match_ai_exercise_to_database(
        self,
        ai_exercise_name: str,
        main_muscle: str,
        equipment: str,
        max_popularity: int = 2
    ) -> Tuple[Optional[Dict[str, Any]], float, str]:
        """
        Match an AI-generated exercise to a database exercise.
        
        Process:
        1. Filter database exercises by main_muscle, equipment, popularity
        2. Use fuzzy matching to find best name match
        3. Check alternative_names if primary match is low
        4. Return match with similarity score and status
        
        Args:
            ai_exercise_name: Exercise name from AI
            main_muscle: Main muscle group (e.g., "Pectoralis Major")
            equipment: Equipment type (e.g., "Dumbbell", "Barbell")
            max_popularity: Maximum popularity score (default: 2)
        
        Returns:
            Tuple of:
            - matched_exercise: Exercise dict from database or None
            - similarity_score: Float 0.0-1.0
            - status: "matched" | "low_confidence" | "no_match"
        """
        try:
            # Step 1: Filter database exercises by metadata
            candidates = self._get_candidates_by_metadata(
                main_muscle=main_muscle,
                equipment=equipment,
                max_popularity=max_popularity
            )
            
            if not candidates:
                logger.warning(
                    f"No candidates found for: {main_muscle}, {equipment}"
                )
                # FALLBACK 1: Try matching only on main_muscle + fuzzy name with high threshold
                logger.debug(f"Attempting fallback match on main_muscle + name only...")
                fallback_match, fallback_score, fallback_status = self._fallback_match_main_muscle_only(
                    ai_exercise_name=ai_exercise_name,
                    main_muscle=main_muscle,
                    max_popularity=max_popularity,
                    min_similarity=0.85  # High threshold for fallback
                )
                if fallback_match:
                    logger.debug(
                        f"Fallback match found: {ai_exercise_name} -> {fallback_match.get('name')} "
                        f"(score: {fallback_score:.3f}, status: {fallback_status})"
                    )
                    return fallback_match, fallback_score, fallback_status
                
                # FALLBACK 2: Try matching on name ONLY with high accuracy threshold
                logger.debug(f"Attempting final fallback match on name only (no metadata)...")
                name_only_match, name_only_score, name_only_status = self._fallback_match_name_only(
                    ai_exercise_name=ai_exercise_name,
                    max_popularity=max_popularity,
                    min_similarity=0.80  # High accuracy threshold for name-only matching
                )
                if name_only_match:
                    logger.debug(
                        f"Name-only fallback match found: {ai_exercise_name} -> {name_only_match.get('name')} "
                        f"(score: {name_only_score:.3f}, status: {name_only_status})"
                    )
                    return name_only_match, name_only_score, name_only_status
                
                return None, 0.0, "no_match"
            
            # Step 2: Find best match using fuzzy matching
            best_match, score = self._find_best_match(
                ai_exercise_name=ai_exercise_name,
                candidates=candidates
            )
            
            # Step 3: Determine status based on score
            # Map to valid database status values (valid_status constraint)
            if score >= 0.85:
                status = "matched"
            elif score >= 0.70:
                status = "low_confidence"
            else:
                # Low similarity but metadata matches - use "pending_review" for database constraint
                status = "pending_review"
            
            # Always return the match if we found one (metadata filtering ensures it's relevant)
            if best_match:
                logger.debug(
                    f"Match result: {ai_exercise_name} -> {best_match.get('name')} "
                    f"(score: {score:.3f}, status: {status})"
                )
            else:
                logger.warning(
                    f"No match found for: {ai_exercise_name} (main_muscle: {main_muscle}, equipment: {equipment})"
                )
            
            return best_match, score, status
            
        except Exception as e:
            logger.error(f"Error matching exercise: {e}")
            return None, 0.0, "no_match"

    def _get_candidates_by_metadata(
        self,
        main_muscle: str,
        equipment: str,
        max_popularity: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Get exercise candidates filtered by metadata in order: equipment -> main_muscle.
        
        Filtering order ensures we drill down properly:
        1. Equipment (TEXT column in database)
        2. Main muscle (array in database, uses contains check)
        3. Then fuzzy match on name
        
        Args:
            main_muscle: Main muscle filter
            equipment: Equipment filter
            max_popularity: Maximum popularity score
        
        Returns:
            List of candidate exercises
        """
        try:
            # Step 1: Filter by equipment first (equipment is TEXT column, not array)
            query = self.exercise_selector.supabase.table("exercises").select("*")
            
            if equipment:
                # Equipment is a TEXT column, so use .eq() for exact match
                query = query.eq("equipment", equipment)
            
            # Filter by popularity
            query = query.lte("popularity_score", max_popularity)
            
            # Execute to get equipment-filtered candidates
            equipment_response = query.execute()
            equipment_candidates = equipment_response.data if equipment_response.data else []
            
            logger.debug(f"Found {len(equipment_candidates)} candidates after equipment filter")
            
            # Step 2: Filter by main_muscle (which is an array, check if main_muscle is IN the array)
            main_muscle_candidates = []
            if main_muscle:
                for candidate in equipment_candidates:
                    candidate_main_muscles = candidate.get("main_muscles", [])
                    # Handle both list and string types
                    if isinstance(candidate_main_muscles, list):
                        if main_muscle in candidate_main_muscles:
                            main_muscle_candidates.append(candidate)
                    elif isinstance(candidate_main_muscles, str):
                        if candidate_main_muscles == main_muscle:
                            main_muscle_candidates.append(candidate)
            else:
                main_muscle_candidates = equipment_candidates
            
            logger.debug(
                f"Found {len(main_muscle_candidates)} candidates after metadata filtering "
                f"(equipment: {equipment}, main_muscle: {main_muscle})"
            )
            
            return main_muscle_candidates
            
        except Exception as e:
            error_msg = str(e)
            if "timed out" in error_msg.lower():
                logger.error(
                    f"Database query timed out while fetching exercise candidates "
                    f"(main_muscle: {main_muscle}, equipment: {equipment}). "
                    f"Possible causes: slow database, missing indexes, or network issues. "
                    f"Error: {error_msg}"
                )
            else:
                logger.error(f"Error getting candidates by metadata: {error_msg}")
            return []
    
    def _fallback_match_main_muscle_only(
        self,
        ai_exercise_name: str,
        main_muscle: str,
        max_popularity: int = 2,
        min_similarity: float = 0.70
    ) -> Tuple[Optional[Dict[str, Any]], float, str]:
        """
        Fallback matching strategy: Match ONLY on main_muscle + fuzzy name.
        Only accepts matches with high similarity score (default 0.85).
        
        This is used when primary matching (equipment + main_muscle) fails.
        
        Args:
            ai_exercise_name: Exercise name from AI
            main_muscle: Main muscle group to match
            max_popularity: Maximum popularity score
            min_similarity: Minimum similarity score to accept (default: 0.85)
        
        Returns:
            Tuple of (matched_exercise, similarity_score, status)
        """
        try:
            # Query exercises filtered only by main_muscle and popularity
            query = self.exercise_selector.supabase.table("exercises").select("*")
            
            # Filter by main_muscle (array column)
            if main_muscle:
                query = query.contains("main_muscles", [main_muscle])
            
            # Filter by popularity
            query = query.lte("popularity_score", max_popularity)
            
            response = query.execute()
            candidates = response.data if response.data else []
            
            if not candidates:
                logger.warning(f"Fallback: No candidates found for main_muscle: {main_muscle}")
                return None, 0.0, "no_match"
            
            logger.debug(f"Fallback: Found {len(candidates)} candidates by main_muscle only")
            
            # Find best match using fuzzy matching
            best_match, score = self._find_best_match(
                ai_exercise_name=ai_exercise_name,
                candidates=candidates
            )
            
            # Only accept if similarity is above threshold
            if best_match and score >= min_similarity:
                # Map score to status
                if score >= 0.85:
                    status = "matched"
                elif score >= 0.70:
                    status = "low_confidence"
                else:
                    status = "pending_review"
                logger.debug(
                    f"Fallback match accepted: {ai_exercise_name} -> {best_match.get('name')} "
                    f"(score: {score:.3f}, min_required: {min_similarity})"
                )
                return best_match, score, status
            else:
                logger.warning(
                    f"Fallback match rejected: {ai_exercise_name} -> "
                    f"{best_match.get('name') if best_match else 'None'} "
                    f"(score: {score:.3f}, required: {min_similarity})"
                )
                return None, 0.0, "no_match"
            
        except Exception as e:
            error_msg = str(e)
            if "timed out" in error_msg.lower():
                logger.error(
                    f"Database query timed out during fallback exercise matching "
                    f"(main_muscle: {main_muscle}). "
                    f"Possible causes: slow database, missing indexes, or network issues. "
                    f"Error: {error_msg}"
                )
            else:
                logger.error(f"Error in fallback matching: {error_msg}")
            return None, 0.0, "no_match"

    def _fallback_match_name_only(
        self,
        ai_exercise_name: str,
        max_popularity: int = 2,
        min_similarity: float = 0.80
    ) -> Tuple[Optional[Dict[str, Any]], float, str]:
        """
        Final fallback matching strategy: Match ONLY on name with high accuracy threshold (>0.8).
        No metadata filtering - purely name-based matching.
        
        This is used when both primary matching (equipment + main_muscle) 
        and main_muscle fallback fail.
        
        Args:
            ai_exercise_name: Exercise name from AI
            max_popularity: Maximum popularity score
            min_similarity: Minimum similarity score to accept (default: 0.80)
        
        Returns:
            Tuple of (matched_exercise, similarity_score, status)
        """
        try:
            # Query all exercises filtered only by popularity (no metadata filtering)
            query = self.exercise_selector.supabase.table("exercises").select("*")
            
            # Filter by popularity only
            query = query.lte("popularity_score", max_popularity)
            
            response = query.execute()
            candidates = response.data if response.data else []
            
            if not candidates:
                logger.warning(f"Name-only fallback: No candidates found (popularity <= {max_popularity})")
                return None, 0.0, "no_match"
            
            logger.debug(f"Name-only fallback: Found {len(candidates)} candidates (popularity filtered only)")
            
            # Find best match using fuzzy matching
            best_match, score = self._find_best_match(
                ai_exercise_name=ai_exercise_name,
                candidates=candidates
            )
            
            # Only accept if similarity is above threshold
            if best_match and score >= min_similarity:
                # Determine status based on score
                if score >= 0.85:
                    status = "matched"
                elif score >= 0.70:
                    status = "low_confidence"
                else:
                    status = "pending_review"
                
                logger.debug(
                    f"Name-only fallback match accepted: {ai_exercise_name} -> {best_match.get('name')} "
                    f"(score: {score:.3f}, min_required: {min_similarity}, status: {status})"
                )
                return best_match, score, status
            else:
                logger.warning(
                    f"Name-only fallback match rejected: {ai_exercise_name} -> "
                    f"{best_match.get('name') if best_match else 'None'} "
                    f"(score: {score:.3f}, required: {min_similarity})"
                )
                return None, 0.0, "no_match"
            
        except Exception as e:
            logger.error(f"Error in name-only fallback matching: {e}")
            return None, 0.0, "no_match"

    def _find_best_match(
        self,
        ai_exercise_name: str,
        candidates: List[Dict[str, Any]]
    ) -> Tuple[Optional[Dict[str, Any]], float]:
        """
        Find best matching exercise using fuzzy matching.
        
        Uses multiple strategies:
        1. Exact match (case-insensitive)
        2. Exact match in alternative_names
        3. Fuzzy string matching (RapidFuzz or SequenceMatcher)
        4. Token-based matching
        
        Args:
            ai_exercise_name: Name from AI
            candidates: List of candidate exercises
        
        Returns:
            Tuple of (best_match_exercise, similarity_score)
        """
        if not candidates:
            return None, 0.0
        
        ai_name_normalized = ai_exercise_name.strip().lower()
        best_match = None
        best_score = 0.0
        
        for candidate in candidates:
            candidate_name = (candidate.get('name') or '').strip().lower()
            
            # Strategy 1: Exact match
            if ai_name_normalized == candidate_name:
                return candidate, 1.0
            
            # Strategy 2: Exact match in alternative_names
            alternative_names = candidate.get('alternative_names', [])
            if alternative_names and isinstance(alternative_names, list):
                for alt_name in alternative_names:
                    if isinstance(alt_name, str) and ai_name_normalized == alt_name.strip().lower():
                        return candidate, 0.95
            
            # Strategy 3 & 4: Fuzzy matching + token matching
            fuzzy_score = self._calculate_fuzzy_score(ai_name_normalized, candidate_name)
            
            # Check alternative_names with fuzzy matching
            alt_fuzzy_score = 0.0
            if alternative_names and isinstance(alternative_names, list):
                for alt_name in alternative_names:
                    if isinstance(alt_name, str):
                        alt_score = self._calculate_fuzzy_score(ai_name_normalized, alt_name.strip().lower())
                        alt_fuzzy_score = max(alt_fuzzy_score, alt_score)
            
            # Use best score from main name or alternatives
            name_score = max(fuzzy_score, alt_fuzzy_score * 0.95)  # Slight penalty for alt names
            
            # Token-based score boost
            token_score = self._calculate_token_score(ai_name_normalized, candidate_name)
            
            # Combined weighted score
            combined_score = (name_score * 0.7) + (token_score * 0.3)
            
            if combined_score > best_score:
                best_score = combined_score
                best_match = candidate
        
        # If we have candidates but no match found (unlikely), use first candidate as fallback
        # Metadata filtering already ensures it's relevant
        if not best_match and candidates:
            best_match = candidates[0]
            best_score = 0.5  # Minimum score for metadata-matched fallback
        
        return best_match, best_score

    def _calculate_fuzzy_score(self, str1: str, str2: str) -> float:
        """
        Calculate fuzzy similarity score using RapidFuzz or SequenceMatcher.
        
        Args:
            str1: First string
            str2: Second string
        
        Returns:
            Similarity score 0.0-1.0
        """
        if not str1 or not str2:
            return 0.0
        
        if HAS_RAPIDFUZZ:
            # Use RapidFuzz ratio (best for general purpose)
            return fuzz.ratio(str1, str2) / 100.0
        else:
            # Fallback to SequenceMatcher
            return SequenceMatcher(None, str1, str2).ratio()

    def _calculate_token_score(self, str1: str, str2: str) -> float:
        """
        Calculate token-based similarity (Jaccard similarity on words).
        
        Args:
            str1: First string
            str2: Second string
        
        Returns:
            Token similarity score 0.0-1.0
        """
        if not str1 or not str2:
            return 0.0
        
        # Tokenize (split on whitespace and remove empty)
        tokens1 = set(re.findall(r'\w+', str1.lower()))
        tokens2 = set(re.findall(r'\w+', str2.lower()))
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Jaccard similarity
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        
        return intersection / union if union > 0 else 0.0

    def find_fallback_replacement(
        self,
        main_muscle: str,
        equipment: str,
        existing_exercise_names: List[str],
        max_popularity: int = 2
    ) -> Optional[Dict[str, Any]]:
        """
        Find a fallback replacement exercise for unmatched exercises.
        
        Criteria:
        1. Same equipment
        2. Same main_muscle
        3. popularity_score <= max_popularity
        4. Low fuzzy match compared to other exercises already in the plan (to avoid duplicates)
        
        Args:
            main_muscle: Main muscle group
            equipment: Equipment type
            existing_exercise_names: List of exercise names already in the day's plan (to avoid duplicates)
            max_popularity: Maximum popularity score
        
        Returns:
            Replacement exercise dict or None if no suitable replacement found
        """
        try:
            # Get candidates matching equipment and main_muscle
            candidates = self._get_candidates_by_metadata(
                main_muscle=main_muscle,
                equipment=equipment,
                max_popularity=max_popularity
            )
            
            if not candidates:
                logger.warning(
                    f"No fallback candidates found for equipment: {equipment}, main_muscle: {main_muscle}"
                )
                return None
            
            # Score each candidate by how different it is from existing exercises
            # Lower similarity to existing = better (we want variety)
            best_replacement = None
            best_diversity_score = 0.0  # We want the exercise most different from existing ones
            
            for candidate in candidates:
                candidate_name = candidate.get("name", "")
                if not candidate_name:
                    continue
                
                # Calculate maximum similarity to any existing exercise
                max_similarity_to_existing = 0.0
                for existing_name in existing_exercise_names:
                    if existing_name:
                        similarity = self._calculate_fuzzy_score(
                            candidate_name.lower(),
                            existing_name.lower()
                        )
                        max_similarity_to_existing = max(max_similarity_to_existing, similarity)
                
                # Diversity score = 1.0 - max_similarity (higher = more diverse)
                diversity_score = 1.0 - max_similarity_to_existing
                
                # Prefer exercises that are more different from existing ones
                if diversity_score > best_diversity_score:
                    best_diversity_score = diversity_score
                    best_replacement = candidate
            
            if best_replacement:
                logger.debug(
                    f"Found fallback replacement: '{best_replacement.get('name')}' "
                    f"(diversity score: {best_diversity_score:.3f}, equipment: {equipment}, main_muscle: {main_muscle})"
                )
            else:
                logger.warning("No suitable fallback replacement found")
            
            return best_replacement
            
        except Exception as e:
            logger.error(f"Error finding fallback replacement: {e}")
            return None

