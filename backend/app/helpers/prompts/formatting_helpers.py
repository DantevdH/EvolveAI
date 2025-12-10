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


def format_current_week_readable(
    current_week: Dict[str, Any],
    include_header: bool = True,
) -> str:
    """
    Format the current week in a concise, human-readable layout for prompts.

    Used by chat/RAG prompts and can be reused by week update/create prompts
    when a readable (non-JSON) view is preferred.
    """
    if not current_week:
        return ""

    week_number = current_week.get("week_number", "Unknown")
    daily_trainings = current_week.get("daily_trainings") or []

    if not daily_trainings:
        return ""

    lines: List[str] = []
    if include_header:
        lines.append(f"Week {week_number} Schedule:")

    for day in daily_trainings:
        day_name = day.get("day_of_week", "Unknown")
        is_rest = day.get("is_rest_day", False)
        training_type = (day.get("training_type") or "unknown").lower()

        if is_rest or training_type == "rest":
            lines.append(f"{day_name}: REST DAY")
            continue

        lines.append(f"{day_name}: {training_type.upper()}")

        strength_exercises = day.get("strength_exercises") or []
        if strength_exercises:
            for ex in strength_exercises:
                ex_name = str(ex.get("exercise_name", "Unknown")).replace("{", "{{").replace("}", "}}")
                sets = ex.get("sets")
                reps = ex.get("reps", [])

                set_part = f"{sets} sets" if sets else ""
                reps_part = f"{reps} reps" if reps else ""
                details = ", ".join([p for p in [set_part, reps_part] if p])

                if details:
                    lines.append(f"  - {ex_name} ({details})")
                else:
                    lines.append(f"  - {ex_name}")

        endurance_sessions = day.get("endurance_sessions") or []
        if endurance_sessions:
            for session in endurance_sessions:
                session_name = str(session.get("name", "Endurance")).replace("{", "{{").replace("}", "}}")
                volume = session.get("training_volume")
                unit = session.get("unit", "")
                hr_zone = session.get("heart_rate_zone")

                parts = []
                if volume and unit:
                    parts.append(f"{volume}{unit}")
                if hr_zone:
                    parts.append(f"Zone {hr_zone}")

                detail = ", ".join(parts)
                if detail:
                    lines.append(f"  - {session_name} ({detail})")
                else:
                    lines.append(f"  - {session_name}")

    return "\n".join(lines)


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
