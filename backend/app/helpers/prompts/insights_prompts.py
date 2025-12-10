"""
Insights summary generation prompts.
"""

from typing import Dict, Any


def generate_insights_summary_prompt(metrics: Dict[str, Any]) -> str:
    """
    Generate prompt for AI insights summary.

    Args:
        metrics: Dictionary with volume_progress, training_frequency, training_intensity,
                weak_points, top_exercises
    """
    prompt = f"""
        You are a friendly training coach. Generate insights EXCLUSIVELY from the data below.

        **TRAINING DATA:**
        Volume: {metrics.get('volume_progress', 'N/A')}
        Frequency: {metrics.get('training_frequency', 'N/A')}
        Intensity: {metrics.get('training_intensity', 'N/A')}
    """

    weak_points = metrics.get('weak_points', [])
    if weak_points:
        prompt += "Weak Points:\n"
        for wp in weak_points[:3]:
            prompt += f"- {wp.get('muscle_group', 'Unknown')}: {wp.get('issue', 'N/A')} ({wp.get('severity', 'N/A')})\n"
    else:
        prompt += "Weak Points: None\n"

    top_exercises = metrics.get('top_exercises', [])
    if top_exercises:
        prompt += "Top Exercises:\n"
        for ex in top_exercises[:3]:
            prompt += f"- {ex.get('name', 'Unknown')}: {ex.get('trend', 'N/A')}"
            if ex.get('change'):
                prompt += f" ({ex.get('change')})"
            prompt += "\n"
    else:
        prompt += "Top Exercises: None\n"

    prompt += """
        **CRITICAL RULES:**
        • ALL insights MUST come directly from the data above - no assumptions
        • Use NON-TECHNICAL, everyday language - write as if talking to a friend
        • Avoid ALL numbers, percentages, and technical metrics in the output
        • Use descriptive words instead: "more", "less", "better", "consistent", "improving", "stable", "increasing", "decreasing"
        • Only mention exercises/muscles listed in the data
        • Forbidden: "likely", "probably", "might be" - only state facts
        • Forbidden: Numbers, percentages, specific values - use descriptive language instead

        **Language Examples:**
        ✅ "Your training volume is looking great and consistent" (non-technical, no numbers)
        ✅ "You've been training more frequently lately" (descriptive, no numbers)
        ✅ "Your intensity feels manageable" (friendly, no numbers)
        ❌ "Volume increased 20% this week" (has numbers - FORBIDDEN)
        ❌ "You likely need more volume" (uses "likely" - FORBIDDEN)
        ❌ "Your frequency is 4.2 sessions/week" (has numbers - FORBIDDEN)

        **OUTPUT FORMAT:**
        Generate a friendly, conversational insights summary (2-4 sentences) that:
        • Highlights what's going well
        • Mentions any areas that need attention (if weak points exist)
        • Encourages continued progress
        • Uses ONLY the data provided - no assumptions or external knowledge
        • Stays completely non-technical and number-free
    """

    return prompt
