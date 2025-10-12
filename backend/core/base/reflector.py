"""
Reflector component for the ACE pattern.

The Reflector analyzes training outcomes and generates actionable lessons
that can be added to the user's playbook for future plan generation.
"""

import os
import openai
from typing import List, Optional
from logging_config import get_logger

from core.base.schemas.playbook_schemas import (
    TrainingOutcome,
    ReflectorAnalysis,
    PlaybookLesson,
)
from core.training.schemas.question_schemas import PersonalInfo


class Reflector:
    """
    Analyzes training outcomes and generates personalized lessons.

    The Reflector examines completion rates, user feedback, physiological data,
    and other signals to identify patterns and generate actionable insights.
    """

    def __init__(self, openai_client: Optional[openai.OpenAI] = None):
        """
        Initialize the Reflector.

        Args:
            openai_client: OpenAI client instance (creates new one if not provided)
        """
        self.logger = get_logger(__name__)
        self.openai_client = openai_client or openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    def analyze_outcome(
        self,
        outcome: TrainingOutcome,
        personal_info: PersonalInfo,
        plan_context: str,
        previous_lessons: List[PlaybookLesson] = None,
    ) -> List[ReflectorAnalysis]:
        """
        Analyze a training outcome and generate lessons.

        Args:
            outcome: The training outcome data to analyze
            personal_info: User's personal information
            plan_context: Context about the training plan that was executed
            previous_lessons: Existing lessons in the playbook for context

        Returns:
            List of ReflectorAnalysis objects (lessons learned)
        """
        try:
            self.logger.info(
                f"Analyzing outcome for plan {outcome.plan_id}, week {outcome.week_number}"
            )

            # Build the analysis prompt
            prompt = self._build_analysis_prompt(
                outcome, personal_info, plan_context, previous_lessons
            )

            # Call OpenAI to analyze the outcome
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert fitness coach analyzing training outcomes to generate actionable lessons.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysisList,
                temperature=0.3,  # Lower temperature for consistent analysis
            )

            # Parse the response
            analysis_list = completion.choices[0].message.parsed

            self.logger.info(
                f"Generated {len(analysis_list.analyses)} lessons from outcome"
            )

            return analysis_list.analyses

        except Exception as e:
            self.logger.error(f"Error analyzing outcome: {e}")
            return []

    def _build_analysis_prompt(
        self,
        outcome: TrainingOutcome,
        personal_info: PersonalInfo,
        plan_context: str,
        previous_lessons: Optional[List[PlaybookLesson]],
    ) -> str:
        """Build the prompt for outcome analysis."""

        # Format previous lessons
        lessons_context = "None yet - this is the first training cycle."
        if previous_lessons:
            lessons_context = "\n".join(
                [
                    f"- {lesson.text} (confidence: {lesson.confidence:.2f}, helpful: {lesson.helpful_count}, harmful: {lesson.harmful_count})"
                    for lesson in previous_lessons
                ]
            )

        # Analyze outcome signals
        completion_status = (
            "excellent"
            if outcome.completion_rate >= 0.8
            else "good" if outcome.completion_rate >= 0.6 else "poor"
        )

        rating_status = ""
        if outcome.user_rating:
            rating_status = (
                "very satisfied"
                if outcome.user_rating >= 4
                else "neutral" if outcome.user_rating == 3 else "dissatisfied"
            )

        # Heart rate analysis (optional - may not be available)
        hr_analysis = ""
        if outcome.avg_heart_rate and outcome.target_heart_rate_zone:
            hr_analysis = f"\n- Heart Rate: Avg {outcome.avg_heart_rate} bpm (Target: {outcome.target_heart_rate_zone})"
        elif outcome.avg_heart_rate:
            hr_analysis = f"\n- Heart Rate: Avg {outcome.avg_heart_rate} bpm"

        injury_warning = ""
        if outcome.injury_reported:
            injury_warning = f"\n⚠️ INJURY REPORTED: {outcome.injury_description}"

        prompt = f"""
Analyze this training outcome and generate 1-3 actionable lessons for future training plans.

**USER PROFILE:**
- Name: {personal_info.username}
- Age: {personal_info.age}
- Goal: {personal_info.goal_description}
- Experience: {personal_info.experience_level}

**TRAINING PLAN CONTEXT:**
{plan_context}

**OUTCOME DATA - Week {outcome.week_number}:**
- Completion: {outcome.sessions_completed}/{outcome.sessions_planned} sessions ({outcome.completion_rate*100:.0f}%) - {completion_status}
{f"- User Rating: {outcome.user_rating}/5 - {rating_status}" if outcome.user_rating else ""}
{f"- User Feedback: {outcome.user_feedback}" if outcome.user_feedback else ""}
{hr_analysis if hr_analysis else ""}
{f"- Energy Level: {outcome.energy_level}/5" if outcome.energy_level else ""}
{f"- Soreness: {outcome.soreness_level}/5" if outcome.soreness_level else ""}
{injury_warning}
{f"- Performance: {outcome.performance_metrics}" if outcome.performance_metrics else ""}
{f"- Notes: {outcome.notes}" if outcome.notes else ""}

**NOTE:** Heart rate data is not available for this outcome. Base analysis on completion rate, user feedback, ratings, and other available signals.

**EXISTING PLAYBOOK LESSONS:**
{lessons_context}

**YOUR TASK:**
Analyze the outcome data and identify 1-3 specific, actionable lessons that should guide future training plans.

**LESSON CRITERIA:**
1. **Specific**: Reference concrete data (completion %, HR, distances, exercises, feedback)
2. **Actionable**: Provide clear guidance for future plans (e.g., "Reduce volume by 20%", "Delay intervals until week 8")
3. **Personalized**: Tailored to {personal_info.username}'s response pattern, not generic advice
4. **Evidence-based**: Directly supported by the outcome signals

**LESSON TYPES:**
- **Positive lessons** (positive=true): Successful patterns to repeat
  - Example: "Alex adapts well to 3x/week schedule with steady progression"
  
- **Warning lessons** (positive=false): Issues to avoid or correct
  - Example: "Avoid intervals until 8+ weeks base to prevent knee pain"

**PRIORITY LEVELS:**
- **critical**: Injury prevention, safety concerns
- **high**: Major adjustments needed to achieve goals
- **medium**: Optimization opportunities
- **low**: Minor tweaks or preferences

**TAGS:**
Use relevant tags: beginner/intermediate/advanced, progression, recovery, injury_prevention, 
volume, intensity, frequency, equipment, motivation, timing, sport-specific, etc.

**IMPORTANT:**
- Don't repeat existing lessons unless new evidence significantly changes them
- Focus on lessons that will actually impact future plan generation
- If outcome is excellent and no issues, generate 1 positive reinforcement lesson
- If outcome has problems, prioritize warning lessons to prevent repeating mistakes
- Keep lesson text concise (1-2 sentences max)

Generate lessons in ReflectorAnalysisList format.
"""

        return prompt

    def quick_analyze_signals(self, outcome: TrainingOutcome) -> dict:
        """
        Quick analysis of outcome signals without AI (for logging/debugging).

        Returns:
            Dictionary with simple signal analysis
        """
        analysis = {
            "completion_status": (
                "good" if outcome.completion_rate >= 0.75 else "needs_improvement"
            ),
            "satisfaction": (
                "high"
                if outcome.user_rating and outcome.user_rating >= 4
                else (
                    "low"
                    if outcome.user_rating and outcome.user_rating <= 2
                    else "neutral"
                )
            ),
            "injury_risk": "high" if outcome.injury_reported else "low",
            "adaptation": (
                "positive"
                if outcome.completion_rate >= 0.75
                and (not outcome.user_rating or outcome.user_rating >= 3)
                else "negative"
            ),
            "flags": [],
        }

        # Add flags
        if outcome.completion_rate < 0.5:
            analysis["flags"].append("Low completion rate")

        if outcome.injury_reported:
            analysis["flags"].append("Injury reported")

        if outcome.soreness_level and outcome.soreness_level >= 4:
            analysis["flags"].append("High soreness")

        # Heart rate analysis (optional)
        if outcome.avg_heart_rate and outcome.target_heart_rate_zone:
            try:
                # Simple check if HR seems too high (basic heuristic)
                target_hr = int(
                    outcome.target_heart_rate_zone.replace("<", "")
                    .replace(">", "")
                    .replace("bpm", "")
                    .strip()
                    .split()[0]
                )
                if outcome.avg_heart_rate > target_hr + 10:
                    analysis["flags"].append("Heart rate above target")
            except (ValueError, AttributeError):
                # If target HR zone format is unexpected, skip this check
                pass

        return analysis


# Wrapper class for list of analyses (for structured output)
class ReflectorAnalysisList(BaseModel):
    """Container for multiple reflector analyses."""

    from pydantic import BaseModel

    analyses: List[ReflectorAnalysis] = Field(
        ..., description="List of 1-3 lessons learned from this outcome"
    )


# Import at the end to avoid circular imports
from pydantic import BaseModel, Field
