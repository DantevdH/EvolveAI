"""
ACE Telemetry Service

Tracks key metrics about the ACE pattern performance:
- Lesson generation rates
- User feedback participation
- Modification detection
- Playbook growth
- System performance

This data can be sent to analytics platforms (Mixpanel, Amplitude, etc.)
or stored in a simple telemetry table for analysis.
"""

import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Literal
from logging_config import get_logger
from supabase import create_client, Client

logger = get_logger(__name__)

# Create Literal type for telemetry events
# This generates JSON Schema with inline enum constraints, forcing ALL providers to use only valid values
ACETelemetryEventLiteral = Literal[
    "ace_feedback_provided",
    "ace_feedback_skipped",
    "ace_lessons_generated",
    "ace_lesson_added",
    "ace_lesson_merged",
    "ace_lesson_updated",
    "ace_lesson_rejected",
    "ace_contradiction_resolved",
    "ace_modifications_detected",
    "ace_deduplication_time",
    "ace_reflection_time",
    "ace_playbook_updated",
    "ace_playbook_cleanup"
]

# Initialize Supabase client for telemetry
try:
    supabase_url = os.getenv("SUPABASE_URL")
    # Try service role key first, fallback to anon key
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if supabase_url and supabase_key:
        supabase: Client = create_client(supabase_url, supabase_key)
    else:
        logger.warning("Supabase credentials not found - telemetry will only log to console")
        supabase = None
except Exception as e:
    logger.warning(f"Failed to initialize Supabase for telemetry: {e}")
    supabase = None


class ACETelemetry:
    """
    Telemetry service for ACE pattern.
    
    Tracks key metrics about ACE system performance by:
    - Storing all events in Supabase telemetry_events table
    - Ready to integrate with analytics services (Mixpanel, Amplitude, etc.)
    
    All tracking is non-blocking and failures won't break the application.
    Only errors are logged to console.
    """
    
    @staticmethod
    def track_event(
        event: ACETelemetryEventLiteral,
        user_id: str,
        properties: Optional[Dict[str, Any]] = None
    ):
        """
        Track an ACE telemetry event.
        
        Args:
            event: Type of event (string literal)
            user_id: User identifier
            properties: Additional event properties
        """
        # Store in database (if Supabase is available)
        if supabase:
            try:
                supabase.table('telemetry_events').insert({
                    'event': event,
                    'user_id': user_id,
                    'properties': properties or {}
                }).execute()
            except Exception as e:
                # Don't let telemetry errors break the application
                logger.error(f"Failed to store telemetry event '{event}': {e}")
        else:
            logger.warning(f"Telemetry event '{event}' not tracked - Supabase not configured")
        
        # Future: Can also send to analytics services
        # mixpanel.track(user_id, event.value, properties)
        # amplitude.track(user_id, event.value, properties)
    
    @staticmethod
    def track_feedback_session(
        user_id: str,
        feedback_provided: bool,
        lessons_generated: int,
        lessons_added: int,
        lessons_updated: int,
        modifications_detected: int,
        session_duration_ms: Optional[int] = None
    ):
        """Track a complete feedback session"""
        
        event = "ace_feedback_provided" if feedback_provided else "ace_feedback_skipped"
        
        ACETelemetry.track_event(
            event=event,
            user_id=user_id,
            properties={
                "lessons_generated": lessons_generated,
                "lessons_added": lessons_added,
                "lessons_updated": lessons_updated,
                "modifications_detected": modifications_detected,
                "session_duration_ms": session_duration_ms,
                "has_modifications": modifications_detected > 0,
                "learned_from_mods_only": not feedback_provided and modifications_detected > 0
            }
        )
    
    @staticmethod
    def track_lesson_decision(
        user_id: str,
        decision_type: str,  # "add_new", "merge", "update", "reject"
        similarity_score: float,
        lesson_tags: List[str],
        is_contradiction: bool = False
    ):
        """Track a curator decision"""
        
        event_map = {
            "add_new": "ace_lesson_added",
            "merge_with_existing": "ace_lesson_merged",
            "update_existing": "ace_lesson_updated",
            "reject": "ace_lesson_rejected"
        }
        
        event = event_map.get(decision_type, "ace_lesson_added")
        
        ACETelemetry.track_event(
            event=event,
            user_id=user_id,
            properties={
                "decision": decision_type,
                "similarity_score": similarity_score,
                "tags": lesson_tags,
                "is_contradiction": is_contradiction
            }
        )
    
    @staticmethod
    def track_playbook_state(
        user_id: str,
        total_lessons: int,
        positive_lessons: int,
        warning_lessons: int,
        avg_confidence: float,
        most_applied_lesson_times: int
    ):
        """Track current playbook state"""
        
        ACETelemetry.track_event(
            event="ace_playbook_updated",
            user_id=user_id,
            properties={
                "total_lessons": total_lessons,
                "positive_lessons": positive_lessons,
                "warning_lessons": warning_lessons,
                "avg_confidence": avg_confidence,
                "most_applied_times": most_applied_lesson_times,
                "playbook_health": "healthy" if total_lessons < 20 else "needs_cleanup"
            }
        )
    
    @staticmethod
    def track_performance(
        user_id: str,
        operation: str,  # "deduplication", "reflection", "curation"
        duration_ms: int,
        success: bool
    ):
        """Track performance metrics"""
        
        event_map = {
            "deduplication": "ace_deduplication_time",
            "reflection": "ace_reflection_time"
        }
        
        event = event_map.get(operation, "ace_reflection_time")
        
        ACETelemetry.track_event(
            event=event,
            user_id=user_id,
            properties={
                "operation": operation,
                "duration_ms": duration_ms,
                "success": success,
                "performance_tier": "fast" if duration_ms < 1000 else "slow" if duration_ms > 3000 else "normal"
            }
        )


# Example queries you can run to analyze ACE performance:

"""
-- Most common curator decisions
SELECT 
    properties->>'decision' as decision_type,
    COUNT(*) as count,
    AVG((properties->>'similarity_score')::float) as avg_similarity
FROM telemetry_events
WHERE event = 'ace_lesson_added' OR event = 'ace_lesson_merged'
GROUP BY decision_type;

-- Feedback participation rate
SELECT 
    DATE(timestamp) as date,
    COUNT(CASE WHEN event = 'ace_feedback_provided' THEN 1 END) as provided_count,
    COUNT(CASE WHEN event = 'ace_feedback_skipped' THEN 1 END) as skipped_count,
    ROUND(
        COUNT(CASE WHEN event = 'ace_feedback_provided' THEN 1 END)::float / 
        COUNT(*)::float * 100, 2
    ) as participation_rate
FROM telemetry_events
WHERE event IN ('ace_feedback_provided', 'ace_feedback_skipped')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Average lessons generated per user
SELECT 
    user_id,
    COUNT(*) as feedback_sessions,
    SUM((properties->>'lessons_generated')::int) as total_lessons,
    AVG((properties->>'lessons_generated')::float) as avg_lessons_per_session
FROM telemetry_events
WHERE event = 'ace_feedback_provided'
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY avg_lessons_per_session DESC;

-- Modification detection effectiveness
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as sessions_with_mods,
    AVG((properties->>'modifications_detected')::int) as avg_modifications,
    COUNT(CASE WHEN (properties->>'learned_from_mods_only')::bool = true THEN 1 END) as learned_without_feedback
FROM telemetry_events
WHERE event IN ('ace_feedback_provided', 'ace_feedback_skipped')
    AND (properties->>'modifications_detected')::int > 0
GROUP BY DATE(timestamp)
ORDER BY date DESC;
"""

