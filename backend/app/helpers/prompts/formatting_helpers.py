"""
Formatting helper functions for prompts.
These utilities format user data, playbook lessons, and plan summaries for inclusion in prompts.
"""

from typing import Optional, Dict, Any, List
from app.schemas.question_schemas import PersonalInfo


def format_client_information(personal_info: PersonalInfo) -> str:
    """Format client information for prompts."""
    return f"""
        **USER PROFILE:**
        - Name: {personal_info.username}
        - Age: {personal_info.age}
        - Weight: {personal_info.weight} {personal_info.weight_unit}
        - Height: {personal_info.height} {personal_info.height_unit}
        - Gender: {personal_info.gender}
        - Experience Level: {personal_info.experience_level}
        - Primary Goal: {personal_info.goal_description}
        - Measurement System: {personal_info.measurement_system}
        """


def format_playbook_lessons(
    playbook, personal_info: PersonalInfo, context: str = "training"
) -> str:
    """
    Format playbook lessons for inclusion in prompts.

    Args:
        playbook: UserPlaybook object or list of lesson dicts
        personal_info: PersonalInfo object for personalization
        context: Context for the prompt ("outline" or "training")

    Returns:
        Formatted playbook context string
    """
    if not playbook:
        return ""

    # Handle both UserPlaybook objects and list of dicts
    if hasattr(playbook, "lessons"):
        lessons = playbook.lessons
    elif isinstance(playbook, list):
        lessons = playbook
    else:
        return ""

    if not lessons or len(lessons) == 0:
        return ""

    # Choose header based on context
    if context == "outline":
        header = f"""
            **🧠 PERSONALIZED CONSTRAINTS & PREFERENCES:**
            
            Based on {personal_info.username}'s onboarding responses, these are the key constraints and preferences to follow:
        
            """
        footer = f"""
            **IMPORTANT:** These are fundamental constraints extracted from the onboarding assessment.
            The outline MUST respect these limitations and preferences.
            """
    else:  # context == "training"
        header = f"""
            **🧠 PERSONALIZED PLAYBOOK - LESSONS FROM {personal_info.username.upper()}'S TRAINING HISTORY:**
            
            These are proven insights from {personal_info.username}'s previous training outcomes. 
            YOU MUST follow these lessons when creating this plan:
            """

        footer = f"""
            **CRITICAL:** These lessons are based on real outcomes from {personal_info.username}'s training.
            Ignoring them may lead to poor adherence, injury, or failure to achieve goals.
            """

    # Separate positive lessons and warnings
    positive_lessons = [
        l
        for l in lessons
        if (l.positive if hasattr(l, "positive") else l.get("positive", True))
    ]
    warning_lessons = [
        l
        for l in lessons
        if not (l.positive if hasattr(l, "positive") else l.get("positive", True))
    ]

    # Build the content
    content = ""

    if positive_lessons:
        if context == "outline":
            content += f"        ✅ **Capabilities & Preferences:**\n"
        else:
            content += f"        ✅ **What Works for {personal_info.username}:**\n"

        for lesson in positive_lessons:
            if hasattr(lesson, "text"):
                text = lesson.text
                confidence = lesson.confidence
                helpful = lesson.helpful_count
                lesson_context = getattr(lesson, "context", None)
            else:
                text = lesson.get("text", "")
                confidence = lesson.get("confidence", 0.5)
                helpful = lesson.get("helpful_count", 0)
                lesson_context = lesson.get("context", None)
            
            # Escape curly braces in lesson text to prevent format errors
            safe_text = str(text).replace("{", "{{").replace("}", "}}")

            if context == "outline":
                content += f"        - {safe_text}\n"
            else:
                content += f"        - {safe_text} (confidence: {confidence:.0%}, proven {helpful}x)\n"
            
            # Include context if available and not "context not found"
            if lesson_context and lesson_context != "context not found":
                # Escape curly braces in context too
                safe_context = str(lesson_context).replace("{", "{{").replace("}", "}}")
                content += f"\n        📚 **Best Practices Context:**\n        {safe_context}\n"

    if warning_lessons:
        if context == "outline":
            content += f"\n        ⚠️  **Constraints & Limitations:**\n"
        else:
            content += f"\n        ⚠️  **What to Avoid:**\n"

        for lesson in warning_lessons:
            if hasattr(lesson, "text"):
                text = lesson.text
                confidence = lesson.confidence
                harmful = lesson.harmful_count
                lesson_context = getattr(lesson, "context", None)
            else:
                text = lesson.get("text", "")
                confidence = lesson.get("confidence", 0.5)
                harmful = lesson.get("harmful_count", 0)
                lesson_context = lesson.get("context", None)
            
            # Escape curly braces in lesson text to prevent format errors
            safe_text = str(text).replace("{", "{{").replace("}", "}}")

            if context == "outline":
                content += f"        - {safe_text}\n"
            else:
                content += f"        - {safe_text} (confidence: {confidence:.0%}, learned from {harmful} negative outcome(s))\n"
            
            # Include context if available and not "context not found"
            if lesson_context and lesson_context != "context not found":
                # Escape curly braces in context too
                safe_context = str(lesson_context).replace("{", "{{").replace("}", "}}")
                content += f"\n        📚 **Best Practices Context:**\n        {safe_context}\n"

    return header + content + footer


def format_onboarding_responses(formatted_responses: Optional[str]) -> str:
    """Format onboarding Q&A responses for inclusion in prompts."""
    if not formatted_responses:
        return "No onboarding responses captured yet."

    safe_responses = str(formatted_responses).replace("{", "{{").replace("}", "}}")
    return f"""
        **ONBOARDING RESPONSE SUMMARY (Q → A):**
        {safe_responses}
        """


def format_current_plan_summary(current_plan: Dict[str, Any]) -> str:
    """
    Create a token-optimized summary using Matrix Schema pattern for context in prompts.
    
    Uses Header-Values JSON format to reduce token usage:
    - Schema defined once at top
    - Data stored as arrays matching schema order
    - Eliminates repeated field names
    
    Args:
        current_plan: Current training plan dictionary
        
    Returns:
        JSON string with Matrix Schema format
    """
    import json
    try:
        weekly_schedules = current_plan.get("weekly_schedules", [])
        if not weekly_schedules:
            return json.dumps({"error": "Empty plan - no weekly schedules found."})
        
        week = weekly_schedules[0]
        daily_trainings = week.get("daily_trainings", [])
        
        if not daily_trainings:
            return json.dumps({"error": "Plan structure exists but no daily trainings found."})
        
        # Define schema once (reused for all exercises)
        exercise_schema = ["order", "id", "name", "equipment", "sets", "weights", "target", "muscles", "movement_pattern"]
        
        plan_data = {
            "schema": exercise_schema,
            "days": {}
        }
        
        for day in daily_trainings:
            day_name = day.get("day_of_week", "Unknown")
            training_type = day.get("training_type", "unknown").lower()
            is_rest = day.get("is_rest_day", False)
            
            if is_rest or training_type == "rest":
                plan_data["days"][day_name] = {"type": "REST", "exercises": []}
                continue
            
            # Strength exercises
            strength_exercises = day.get("strength_exercises", [])
            exercises = []
            
            if strength_exercises:
                for ex in strength_exercises:
                    # Get exercise data
                    ex_name = ex.get("exercise_name", "Unknown Exercise")
                    equipment = ex.get("equipment", "Unknown")
                    target_area = ex.get("target_area", "")
                    main_muscles = ex.get("main_muscles", [])
                    if not main_muscles:
                        # Fallback to main_muscle if main_muscles not available
                        main_muscle = ex.get("main_muscle", "")
                        main_muscles = [main_muscle] if main_muscle else []
                    pattern = ex.get("force", "")  # "force" field from DB represents movement pattern (Push/Pull/Push & Pull)
                    
                    # Exercise details
                    exercise_id = ex.get("exercise_id")
                    if exercise_id:
                        try:
                            exercise_id = int(exercise_id)
                        except (ValueError, TypeError):
                            exercise_id = None
                    else:
                        exercise_id = None
                    
                    execution_order = ex.get("execution_order", 0)
                    try:
                        execution_order = int(execution_order)
                    except (ValueError, TypeError):
                        execution_order = 0
                    
                    # Get sets (reps) and weights (backend format: sets is int, reps/weight are arrays)
                    sets_data = ex.get("sets", 0)
                    reps = ex.get("reps", [])
                    weight = ex.get("weight", [])
                    
                    # Format sets: reps array (matches user's example where "sets" = reps array)
                    if isinstance(reps, list) and len(reps) > 0:
                        sets_array = reps
                    elif sets_data:
                        # If sets is an int but no reps, duplicate it to match expected format
                        sets_array = [sets_data] if isinstance(sets_data, int) else []
                    else:
                        sets_array = []
                    
                    # Format weights: weight array (ensure all weights are numbers)
                    weights_array = []
                    if isinstance(weight, list) and len(weight) > 0:
                        weights_array = [float(w) if w and w > 0 else None for w in weight]
                        weights_array = [w for w in weights_array if w is not None]  # Remove None values
                    elif weight and weight > 0:
                        # Single weight value
                        weights_array = [float(weight)]
                    
                    # Build exercise array matching schema order:
                    # ["order", "id", "name", "equipment", "sets", "weights", "target", "muscles", "pattern"]
                    # Only include fields that have values (omit None to save tokens)
                    exercise_row = []
                    exercise_row.append(execution_order if execution_order > 0 else None)
                    exercise_row.append(exercise_id)
                    exercise_row.append(ex_name)
                    exercise_row.append(equipment)
                    exercise_row.append(sets_array if sets_array else None)
                    exercise_row.append(weights_array if weights_array else None)
                    exercise_row.append(target_area if target_area else None)
                    exercise_row.append(main_muscles if main_muscles else None)
                    exercise_row.append(pattern if pattern else None)
                    
                    exercises.append(exercise_row)
            
            # Endurance sessions (append to exercises array with extended schema if needed)
            endurance_sessions = day.get("endurance_sessions", [])
            if endurance_sessions:
                for session in endurance_sessions:
                    session_name = session.get("name", "Endurance Session")
                    sport_type = session.get("sport_type", "")
                    training_volume = session.get("training_volume")
                    unit = session.get("unit", "")
                    heart_rate_zone = session.get("heart_rate_zone")
                    execution_order = session.get("execution_order", 0)
                    try:
                        execution_order = int(execution_order)
                    except (ValueError, TypeError):
                        execution_order = 0
                    
                    # Format volume
                    volume_str = f"{training_volume}{unit}" if training_volume and unit else None
                    
                    # Endurance session as exercise row (using same schema, adapting fields)
                    # For endurance: sets=volume, weights=HR zone, target=sport_type
                    endurance_row = [
                        execution_order if execution_order > 0 else None,
                        None,  # No exercise ID for endurance
                        session_name,
                        sport_type if sport_type else None,
                        [volume_str] if volume_str else None,  # Volume in sets position
                        [heart_rate_zone] if heart_rate_zone else None,  # HR zone in weights position
                        None,
                        None,
                        "Endurance"
                    ]
                    exercises.append(endurance_row)
            
            plan_data["days"][day_name] = {
                "type": training_type.upper(),
                "exercises": exercises
            }
        
        # Use simple approach: convert to matrix format, then format with JSON
        # The plan_data already has the correct structure, just need proper formatting
        json_str = json.dumps(plan_data, indent=2, separators=(',', ':'), ensure_ascii=False)
        
        # Post-process to match exact format:
        # 1. Remove indentation from root-level keys ("schema" and "days")
        # 2. Keep all other indentation as-is (indent=2 handles it correctly)
        lines = json_str.split('\n')
        formatted_lines = []
        
        for line in lines:
            stripped = line.strip()
            # Remove 2-space indentation from root-level keys
            if stripped.startswith('"schema"') or stripped.startswith('"days"'):
                if line.startswith('  '):
                    formatted_lines.append(line[2:])
                else:
                    formatted_lines.append(line)
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
        
    except Exception as e:
        return json.dumps({"error": f"Error summarizing plan: {str(e)}"})


def format_exercise_info(exercises: List[Dict]) -> str:
    """Format exercise information for prompts."""
    if not exercises:
        return "No exercises available."
    
    formatted_exercises = []
    for exercise in exercises:
        equipment_str = ", ".join(exercise.get("equipment", []))
        formatted_exercises.append(
            f"ID: {exercise.get('id', 'N/A')} | {exercise.get('name', 'Unknown')} | "
            f"Equipment: {equipment_str} | Difficulty: {exercise.get('difficulty', 'Unknown')}"
        )
    
    return "\n".join(formatted_exercises)
