"""
Helper module for loading and merging question themes.

This module handles loading question theme JSON files and merging them
based on athlete type classification.
"""

import os
import json
from typing import List, Dict, Any
from logging_config import get_logger
from core.training.schemas.question_schemas import PersonalInfo

# Module-level cache for loaded themes (static files, load once)
_checklist_cache: Dict[str, Dict[str, Any]] = {}

logger = get_logger(__name__)


def load_question_checklist(checklist_type: str) -> Dict[str, Any]:
    """
    Load a question theme checklist from JSON file.
    
    Args:
        checklist_type: Type of theme ('strength', 'endurance', 'sport_specific')
        
    Returns:
        Dictionary with 'what_to_ask' list
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
            # Cache it
            _checklist_cache[checklist_type] = checklist
            return checklist
    except FileNotFoundError:
        logger.warning(f"Theme file not found: {checklist_path}, using empty checklist")
        empty_checklist = {"what_to_ask": []}
        _checklist_cache[checklist_type] = empty_checklist
        return empty_checklist
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing theme JSON {checklist_path}: {e}")
        empty_checklist = {"what_to_ask": []}
        _checklist_cache[checklist_type] = empty_checklist
        return empty_checklist


def merge_question_checklists(
    primary_type: str,
    secondary_types: List[str],
    confidence: float,
    personal_info: PersonalInfo
) -> List[str]:
    """
    Load and merge question themes based on athlete type.
    
    Args:
        primary_type: Primary athlete type ('strength', 'endurance', 'sport_specific')
        secondary_types: List of secondary types
        confidence: Classification confidence (0.0-1.0)
        personal_info: User's personal info for filtering
        
    Returns:
        Unified checklist (list of strings)
    """
    unified_checklist = []
    
    # If confidence is low, return empty list (general items are covered in static prompt)
    if confidence < 0.7:
        logger.info(f"Low confidence ({confidence:.2f}), using athlete-type specific themes only")
        # Still load primary type, but with awareness that general info is in static prompt
    
    # Load primary type theme
    try:
        primary_checklist = load_question_checklist(primary_type)
        unified_checklist.extend(primary_checklist.get("what_to_ask", []))
    except Exception as e:
        logger.warning(f"Failed to load primary theme {primary_type}: {e}")
    
    # Load secondary type themes
    for sec_type in secondary_types:
        if sec_type != primary_type:  # Avoid duplicates
            try:
                secondary_checklist = load_question_checklist(sec_type)
                unified_checklist.extend(secondary_checklist.get("what_to_ask", []))
            except Exception as e:
                logger.warning(f"Failed to load secondary theme {sec_type}: {e}")
    
    # Remove duplicates (case-insensitive)
    seen = set()
    deduplicated = []
    for item in unified_checklist:
        item_lower = item.lower().strip()
        if item_lower and item_lower not in seen:
            seen.add(item_lower)
            deduplicated.append(item)
    
    # Pre-merge related items (code-level preprocessing)
    # Example: Combine "Equipment access" + "Equipment preferences" into single item
    merged = []
    skip_indices = set()
    for i, item in enumerate(deduplicated):
        if i in skip_indices:
            continue
        # Simple heuristic: if two items share key words, merge them
        item_lower = item.lower()
        merged_item = item
        for j, other_item in enumerate(deduplicated[i+1:], start=i+1):
            if j in skip_indices:
                continue
            other_lower = other_item.lower()
            # Check for related items (simple keyword matching)
            if "equipment" in item_lower and "equipment" in other_lower:
                merged_item = f"{item} and preferences"
                skip_indices.add(j)
                break
        merged.append(merged_item)
    
    # Filter based on user info (e.g., skip advanced questions for beginners)
    filtered = []
    for item in merged:
        # Skip advanced questions for beginners
        if personal_info.experience_level.lower() in ["beginner", "novice"]:
            if any(word in item.lower() for word in ["advanced", "1rm", "pr", "max"]):
                continue
        filtered.append(item)
    
    return filtered

