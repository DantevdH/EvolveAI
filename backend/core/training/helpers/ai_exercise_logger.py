"""
AI Exercise Logger Service

Logs AI-generated exercises that don't match well to database exercises
for monitoring and potential database expansion.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from supabase import create_client, Client
from logging_config import get_logger
from settings import settings

# Use centralized environment loader (respects test environment)
try:
    from core.utils.env_loader import load_environment
    load_environment()  # Will automatically skip in test environment
except ImportError:
    # Fallback if core.utils not available
    from dotenv import load_dotenv
    load_dotenv()

logger = get_logger(__name__)
# Reduce log verbosity - only show warnings and errors
logger.setLevel(logging.WARNING)


class AIExerciseLogger:
    """Logs AI-generated exercises that need review."""

    def __init__(self, require_env_vars: bool = False):
        """
        Initialize the logger.
        
        Args:
            require_env_vars: If True, raises error when env vars are missing.
                             If False, logger works in disabled mode (default: False).
        """
        self._enabled = False
        self.supabase: Optional[Client] = None
        self.supabase_url: Optional[str] = None
        self.supabase_key: Optional[str] = None
        
        # Check if we're in a test environment
        is_test_env = (
            os.getenv("ENVIRONMENT", "").lower() == "test" or
            os.getenv("PYTEST_CURRENT_TEST") is not None or
            "pytest" in os.getenv("_", "").lower()
        )
        
        # Only require env vars if explicitly requested AND not in test environment
        if require_env_vars and not is_test_env:
            self._validate_environment()
        
        # Try to initialize, but don't fail if env vars are missing
        try:
            self._initialize_clients()
            if self.supabase is not None:
                self._enabled = True
                logger.info("✅ AI Exercise Logger initialized")
            else:
                logger.debug("AI Exercise Logger initialized in disabled mode (env vars not available)")
        except Exception as e:
            # In test environment or when env vars are optional, just log and continue
            if is_test_env or not require_env_vars:
                logger.debug(f"AI Exercise Logger initialized in disabled mode: {e}")
            else:
                raise

    def _validate_environment(self):
        """Validate environment variables."""
        # Use settings (which reads from environment dynamically)
        supabase_url = settings.SUPABASE_URL
        service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

        missing_vars = []
        if not supabase_url:
            missing_vars.append("SUPABASE_URL")
        if not service_role_key:
            missing_vars.append("SUPABASE_SERVICE_ROLE_KEY")

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

    def _initialize_clients(self):
        """Initialize Supabase client."""
        # Use settings (which reads from environment dynamically)
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        
        # Only create client if we have both URL and key
        if self.supabase_url and self.supabase_key:
            self.supabase = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None
    
    def is_enabled(self) -> bool:
        """Check if the logger is enabled and ready to use."""
        return self._enabled and self.supabase is not None

    def log_ai_exercise(
        self,
        ai_exercise_name: str,
        main_muscle: str,
        equipment: str,
        similarity_score: float,
        matched_exercise_id: Optional[int] = None,
        matched_exercise_name: Optional[str] = None,
        status: str = "pending_review"
    ) -> bool:
        """
        Log an AI-generated strength exercise for monitoring and review.
        
        This logs ALL strength exercises suggested by AI, regardless of similarity score,
        to track what AI is generating and identify patterns/missing exercises.
        
        Args:
            ai_exercise_name: Name suggested by AI
            main_muscle: Main muscle from AI
            equipment: Equipment from AI
            similarity_score: Best similarity score found (0.0-1.0)
            matched_exercise_id: ID of best match if found (optional)
            matched_exercise_name: Name of best match if found (optional)
            status: Status (default: "pending_review")
        
        Returns:
            True if logged successfully, False otherwise
        """
        if not self.is_enabled():
            logger.debug("AI Exercise Logger is disabled, skipping log_ai_exercise")
            return False
        
        try:
            record = {
                "ai_exercise_name": ai_exercise_name,
                "main_muscle": main_muscle,
                "equipment": equipment,
                "similarity_score": similarity_score,
                "matched_exercise_id": matched_exercise_id,
                "matched_exercise_name": matched_exercise_name,
                "status": status,
                "occurrence_count": 1  # Will be incremented if exists
            }
            
            # Check if this exercise already exists (by name + metadata)
            existing = (
                self.supabase.table("ai_exercises")
                .select("id, occurrence_count, similarity_score")
                .eq("ai_exercise_name", ai_exercise_name)
                .eq("main_muscle", main_muscle)
                .eq("equipment", equipment)
                .execute()
            )
            
            if existing.data and len(existing.data) > 0:
                # Update occurrence count and latest matching info
                existing_id = existing.data[0]["id"]
                existing_count = existing.data[0].get("occurrence_count", 1)
                
                # Update with latest similarity score and match info
                update_data = {
                    "occurrence_count": existing_count + 1,
                    "similarity_score": similarity_score,  # Update with latest score
                    "matched_exercise_id": matched_exercise_id,
                    "matched_exercise_name": matched_exercise_name,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                # Only update status if it's still pending_review (don't overwrite reviewed items)
                if existing.data[0].get("status") == "pending_review":
                    update_data["status"] = status
                
                self.supabase.table("ai_exercises").update(update_data).eq("id", existing_id).execute()
                
                logger.info(
                    f"Updated AI exercise log (ID: {existing_id}, count: {existing_count + 1}, "
                    f"score: {similarity_score:.3f})"
                )
            else:
                # Insert new record
                record["created_at"] = datetime.utcnow().isoformat()
                record["updated_at"] = datetime.utcnow().isoformat()
                
                result = self.supabase.table("ai_exercises").insert(record).execute()
                if result.data:
                    logger.info(
                        f"Logged new AI exercise: {ai_exercise_name} "
                        f"(score: {similarity_score:.3f}, match: {matched_exercise_name or 'None'})"
                    )
            
            return True
            
        except Exception as e:
            logger.error(f"Error logging AI exercise: {e}")
            return False

    def log_ai_exercises_bulk(
        self,
        exercises: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Log multiple AI-generated exercises in bulk for better performance.
        
        This method:
        1. Collects all exercises to log
        2. Fetches existing records in batch
        3. Separates into inserts and updates
        4. Performs bulk operations
        
        Args:
            exercises: List of exercise dicts with keys:
                - ai_exercise_name
                - main_muscle
                - equipment
                - similarity_score
                - matched_exercise_id (optional)
                - matched_exercise_name (optional)
                - status (optional, default: "pending_review")
        
        Returns:
            Dict with stats: {"inserted": int, "updated": int, "errors": int}
        """
        if not exercises:
            return {"inserted": 0, "updated": 0, "errors": 0}
        
        if not self.is_enabled():
            logger.debug(f"AI Exercise Logger is disabled, skipping bulk log of {len(exercises)} exercises")
            return {"inserted": 0, "updated": 0, "errors": 0}
        
        try:
            stats = {"inserted": 0, "updated": 0, "errors": 0}
            now = datetime.utcnow().isoformat()
            
            # Step 1: Deduplicate within the batch first
            # Group by (name, main_muscle, equipment) and count occurrences
            batch_groups = {}
            for exercise in exercises:
                key = (
                    exercise["ai_exercise_name"],
                    exercise["main_muscle"],
                    exercise["equipment"]
                )
                
                if key not in batch_groups:
                    batch_groups[key] = {
                    "ai_exercise_name": exercise["ai_exercise_name"],
                    "main_muscle": exercise["main_muscle"],
                    "equipment": exercise["equipment"],
                    "similarity_score": exercise.get("similarity_score", 0.0),
                    "matched_exercise_id": exercise.get("matched_exercise_id"),
                    "matched_exercise_name": exercise.get("matched_exercise_name"),
                    "status": exercise.get("status", "pending_review"),
                    "occurrence_count": 1,
                }
                else:
                    # Duplicate within batch - increment count and update with latest match info
                    batch_groups[key]["occurrence_count"] += 1
                    batch_groups[key]["similarity_score"] = exercise.get("similarity_score", 0.0)
                    batch_groups[key]["matched_exercise_id"] = exercise.get("matched_exercise_id")
                    batch_groups[key]["matched_exercise_name"] = exercise.get("matched_exercise_name")
            
            # Convert to list of deduplicated records
            records_to_check = list(batch_groups.values())
            
            if len(records_to_check) < len(exercises):
                logger.info(
                    f"Deduplicated batch: {len(exercises)} exercises → {len(records_to_check)} unique "
                    f"(removed {len(exercises) - len(records_to_check)} duplicates within batch)"
                )
            
            # Build a query to check for existing records
            # We'll use OR conditions to check all at once, then process in memory
            # Note: Supabase doesn't support complex WHERE IN with multiple columns easily,
            # so we fetch potential matches and filter in Python
            
            # Get unique combinations to check
            unique_keys = set()
            for record in records_to_check:
                key = (
                    record["ai_exercise_name"],
                    record["main_muscle"],
                    record["equipment"]
                )
                unique_keys.add(key)
            
            # Fetch only potentially matching records
            # Build OR conditions for each unique combination (more efficient than fetching all)
            all_existing = []
            try:
                # Get unique exercise names to filter by (reduces dataset size significantly)
                unique_names = list(set(r["ai_exercise_name"] for r in records_to_check))
                
                # Fetch records that match any of our exercise names
                # Then filter in Python by full key match (Supabase doesn't support multi-column IN easily)
                if unique_names:
                    # Use OR query for names (most selective field)
                    query = self.supabase.table("ai_exercises").select("*")
                    if len(unique_names) == 1:
                        query = query.eq("ai_exercise_name", unique_names[0])
                    elif len(unique_names) <= 10:
                        # Use .in_() for small lists
                        query = query.in_("ai_exercise_name", unique_names)
                    else:
                        # For large lists, fetch all and filter (still better than N queries)
                        logger.debug(f"Large name list ({len(unique_names)}), fetching all records for filtering")
                        query = self.supabase.table("ai_exercises").select("*")
                    
                    response = query.execute()
                    all_existing = response.data or []
                    logger.debug(f"Fetched {len(all_existing)} potentially matching records")
            except Exception as e:
                logger.warning(f"Error fetching existing records: {e}, proceeding with inserts only")
            
            # Build lookup map: (name, main_muscle, equipment) -> existing record
            existing_map = {}
            for existing in all_existing:
                key = (
                    existing.get("ai_exercise_name"),
                    existing.get("main_muscle"),
                    existing.get("equipment")
                )
                if key in unique_keys:
                    if key not in existing_map:
                        existing_map[key] = existing
                    else:
                        # If duplicate, keep the one with higher occurrence_count
                        if existing.get("occurrence_count", 0) > existing_map[key].get("occurrence_count", 0):
                            existing_map[key] = existing
            
            # Separate into inserts and updates
            records_to_insert = []
            updates_to_apply = []
            
            for record in records_to_check:
                key = (
                    record["ai_exercise_name"],
                    record["main_muscle"],
                    record["equipment"]
                )
                
                if key in existing_map:
                    # Update existing - ADD the batch occurrence count
                    existing = existing_map[key]
                    existing_id = existing["id"]
                    existing_count = existing.get("occurrence_count", 0)
                    batch_count = record["occurrence_count"]  # Get count from deduplicated batch
                    
                    update_data = {
                        "occurrence_count": existing_count + batch_count,  # Add batch count, not just +1
                        "similarity_score": record["similarity_score"],
                        "matched_exercise_id": record.get("matched_exercise_id"),
                        "matched_exercise_name": record.get("matched_exercise_name"),
                        "updated_at": now
                    }
                    
                    # Only update status if still pending_review
                    if existing.get("status") == "pending_review":
                        update_data["status"] = record["status"]
                    
                    updates_to_apply.append({
                        "id": existing_id,
                        "data": update_data
                    })
                else:
                    # Insert new
                    record["created_at"] = now
                    record["updated_at"] = now
                    records_to_insert.append(record)
            
            # Bulk insert new records
            if records_to_insert:
                try:
                    result = (
                        self.supabase.table("ai_exercises")
                        .insert(records_to_insert)
                        .execute()
                    )
                    stats["inserted"] = len(records_to_insert)
                    logger.info(f"Bulk inserted {stats['inserted']} new AI exercise records")
                except Exception as e:
                    logger.error(f"Error bulk inserting AI exercises: {e}")
                    stats["errors"] += len(records_to_insert)
            
            # Bulk update existing records (Supabase doesn't support bulk update natively,
            # but we can batch update calls or use upsert)
            if updates_to_apply:
                # For updates, we need to do them individually since Supabase doesn't support
                # bulk UPDATE with different WHERE conditions easily
                # But we can batch in chunks to reduce overhead
                chunk_size = 50
                for i in range(0, len(updates_to_apply), chunk_size):
                    chunk = updates_to_apply[i:i + chunk_size]
                    for update in chunk:
                        try:
                            self.supabase.table("ai_exercises").update(
                                update["data"]
                            ).eq("id", update["id"]).execute()
                            stats["updated"] += 1
                        except Exception as e:
                            logger.error(f"Error updating AI exercise ID {update['id']}: {e}")
                            stats["errors"] += 1
                
                if stats["updated"] > 0:
                    logger.info(f"Updated {stats['updated']} existing AI exercise records")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error in bulk logging AI exercises: {e}")
            return {"inserted": 0, "updated": 0, "errors": len(exercises)}

    def get_pending_reviews(self, limit: int = 100) -> list:
        """
        Get AI exercises pending review.
        
        Args:
            limit: Maximum number of records to return
        
        Returns:
            List of pending review records
        """
        if not self.is_enabled():
            logger.debug("AI Exercise Logger is disabled, returning empty list for get_pending_reviews")
            return []
        
        try:
            response = (
                self.supabase.table("ai_exercises")
                .select("*")
                .eq("status", "pending_review")
                .order("occurrence_count", desc=True)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error fetching pending reviews: {e}")
            return []


# Lazy singleton instance - only created when first accessed
_ai_exercise_logger_instance: Optional[AIExerciseLogger] = None


def get_ai_exercise_logger() -> AIExerciseLogger:
    """
    Get or create the singleton AIExerciseLogger instance.
    
    Uses lazy initialization - only creates the instance when first accessed.
    This prevents initialization errors during module import (e.g., in tests).
    
    Returns:
        AIExerciseLogger instance
    """
    global _ai_exercise_logger_instance
    if _ai_exercise_logger_instance is None:
        # Don't require env vars by default - allows graceful degradation
        _ai_exercise_logger_instance = AIExerciseLogger(require_env_vars=False)
    return _ai_exercise_logger_instance


# For backward compatibility, provide a module-level instance
# But it's lazily initialized on first access
class _LazyLoggerProxy:
    """Proxy that lazily initializes the logger on first access."""
    
    def __getattr__(self, name):
        return getattr(get_ai_exercise_logger(), name)


# Create a proxy instance that will lazily initialize the real logger
ai_exercise_logger = _LazyLoggerProxy()

