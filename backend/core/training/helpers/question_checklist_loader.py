"""
Helper module for loading and merging question themes.

This module handles loading question theme JSON files and merging them
based on athlete type classification.
"""

import os
import json
from typing import List, Dict, Any, Optional
from logging_config import get_logger
from core.training.schemas.question_schemas import PersonalInfo

# Module-level cache for loaded themes (static files, load once)
_checklist_cache: Dict[str, Dict[str, Any]] = {}

logger = get_logger(__name__)

_BEGINNER_LEVELS = {"beginner", "novice"}
_EVENT_KEYWORDS = [
    "race",
    "marathon",
    "triathlon",
    "competition",
    "tournament",
    "meet",
    "match",
    "game",
    "event",
]
_CARDIO_KEYWORDS = [
    "cardio",
    "conditioning",
    "aerobic",
    "stamina",
    "endurance",
    "hiit",
    "crossfit",
    "functional",
    "bootcamp",
    "weight loss",
    "lose weight",
    "fat loss",
]


def load_question_checklist(checklist_type: str) -> Dict[str, Any]:
    """
    Load a question theme checklist from JSON file.
    
    Args:
        checklist_type: Type of theme ('strength', 'endurance', 'functional_fitness', 'sport_specific')
        
    Returns:
        Dictionary with 'intents' list
    """
    # Check cache first
    if checklist_type in _checklist_cache:
        return _checklist_cache[checklist_type]
    
    # Get the directory of this file's parent (training module)
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    checklist_path = os.path.join(
        current_dir, "data", "themes", f"{checklist_type}.json"
    )
    
    try:
        with open(checklist_path, "r", encoding="utf-8") as f:
            checklist = json.load(f)
            if "intents" not in checklist or not isinstance(checklist["intents"], list):
                logger.warning(
                    "Theme file %s missing 'intents' list; defaulting to empty list",
                    checklist_path,
                )
                checklist = {"intents": []}
            _checklist_cache[checklist_type] = checklist
            return checklist
    except FileNotFoundError:
        logger.warning(f"Theme file not found: {checklist_path}, using empty checklist")
        empty_checklist = {"intents": []}
        _checklist_cache[checklist_type] = empty_checklist
        return empty_checklist
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing theme JSON {checklist_path}: {e}")
        empty_checklist = {"intents": []}
        _checklist_cache[checklist_type] = empty_checklist
        return empty_checklist


def _normalize_intents(
    raw_intents: List[Dict[str, Any]],
    checklist_type: str,
) -> List[Dict[str, Any]]:
    """Attach source metadata and sanitize intent entries."""
    normalized: List[Dict[str, Any]] = []
    for idx, intent in enumerate(raw_intents):
        if not isinstance(intent, dict):
            logger.debug(
                "Skipping non-dict intent at index %s in checklist %s", idx, checklist_type
            )
            continue
        intent_id = intent.get("intent_id") or f"{checklist_type}.intent_{idx}"
        normalized.append(
            {
                "intent_id": intent_id,
                "description": intent.get("description", "").strip(),
                "experience_modifiers": intent.get("experience_modifiers", {}),
                "applicability_conditions": intent.get("applicability_conditions", []),
                "tags": intent.get("tags", []),
                "source": checklist_type,
            }
        )
    return normalized


def _determine_priority(
    tags: List[str],
    goal_text: str,
    experience_level: str,
) -> str:
    goal_lower = goal_text.lower()
    experience_lower = experience_level.lower()

    if "advanced_only" in tags and experience_lower in _BEGINNER_LEVELS:
        return "optional"

    if "event_prep" in tags:
        if any(keyword in goal_lower for keyword in _EVENT_KEYWORDS):
            return "primary"
        return "optional"

    if "cardio_support" in tags:
        if any(keyword in goal_lower for keyword in _CARDIO_KEYWORDS):
            return "primary"
        return "optional"

    # Equipment and environment constraints are nearly always essential
    if any(tag in tags for tag in ("equipment_access", "environment")):
        return "primary"

    return "primary"


def _extract_experience_note(
    experience_modifiers: Dict[str, str],
    experience_level: str,
) -> Optional[str]:
    if not isinstance(experience_modifiers, dict):
        return None
    return experience_modifiers.get(experience_level.lower())


def merge_question_checklists(
    primary_type: str,
    secondary_types: List[str],
    confidence: float,
    personal_info: PersonalInfo
) -> List[Dict[str, Any]]:
    """
    Load and merge question themes based on athlete type.
    
    Args:
        primary_type: Primary athlete type ('strength', 'endurance', 'functional_fitness', 'sport_specific')
        secondary_types: List of secondary types
        confidence: Classification confidence (0.0-1.0)
        personal_info: User's personal info for filtering
        
    Returns:
        Unified checklist of intent objects with personalization metadata
    """
    combined_intents: List[Dict[str, Any]] = []
    
    # If confidence is low, return empty list (general items are covered in static prompt)
    if confidence < 0.7:
        logger.info(f"Low confidence ({confidence:.2f}), using athlete-type specific themes only")
        # Still load primary type, but with awareness that general info is in static prompt
    
    # Load primary type theme
    try:
        primary_checklist = load_question_checklist(primary_type)
        combined_intents.extend(
            _normalize_intents(primary_checklist.get("intents", []), primary_type)
        )
    except Exception as e:
        logger.warning(f"Failed to load primary theme {primary_type}: {e}")
    
    # Load secondary type themes
    for sec_type in secondary_types:
        if sec_type != primary_type:  # Avoid duplicates
            try:
                secondary_checklist = load_question_checklist(sec_type)
                combined_intents.extend(
                    _normalize_intents(secondary_checklist.get("intents", []), sec_type)
                )
            except Exception as e:
                logger.warning(f"Failed to load secondary theme {sec_type}: {e}")
    
    # Deduplicate by intent_id, keeping first occurrence (primary intent preferred)
    seen_intents = set()
    deduped_intents: List[Dict[str, Any]] = []
    for intent in combined_intents:
        intent_id = intent["intent_id"]
        if intent_id in seen_intents:
            continue
        seen_intents.add(intent_id)
        deduped_intents.append(intent)
    
    goal_text = personal_info.goal_description or ""
    experience_level = personal_info.experience_level or ""
    
    enriched_intents: List[Dict[str, Any]] = []
    for intent in deduped_intents:
        experience_note = _extract_experience_note(
            intent.get("experience_modifiers", {}),
            experience_level,
        )
        priority = _determine_priority(
            intent.get("tags", []),
            goal_text,
            experience_level,
        )
        enriched_intents.append(
            {
                "intent_id": intent["intent_id"],
                "source": intent.get("source"),
                "description": intent.get("description", ""),
                "tags": intent.get("tags", []),
                "applicability_conditions": intent.get("applicability_conditions", []),
                "experience_note": experience_note,
                "experience_modifiers": intent.get("experience_modifiers", {}),
                "priority": priority,
            }
        )
    
    logger.info(
        "Merged %s unique intents for %s (experience=%s)",
        len(enriched_intents),
        personal_info.goal_description,
        experience_level,
    )
    
    return enriched_intents

