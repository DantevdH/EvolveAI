"""
Reflector component for the ACE pattern.

The Reflector analyzes various inputs and generates actionable lessons:
- Training outcomes (completion, feedback, performance)
- Onboarding responses (initial constraints and preferences)
- Outline feedback (user preferences on proposed plans)
- Plan generation (tracking which lessons were applied)

All lesson generation happens through the Reflector to maintain
consistency and enable the ACE learning loop.
"""

import os
import uuid
import openai
from typing import List, Optional, Dict, Any
from logging_config import get_logger

from core.base.schemas.playbook_schemas import (
    TrainingOutcome,
    ReflectorAnalysis,
    PlaybookLesson,
)
from core.training.schemas.question_schemas import PersonalInfo
from pydantic import BaseModel, Field


class Reflector:
    """
    Analyzes various inputs and generates personalized lessons for the ACE pattern.

    The Reflector is responsible for ALL lesson generation:
    - Training outcomes: completion rates, feedback, physiological data
    - Onboarding responses: constraints, preferences, equipment, schedule
    - Outline feedback: user preferences on proposed training plans
    - Plan analysis: tracking which lessons were actually applied

    All lesson generation flows through the Reflector to maintain consistency
    and enable the full ACE learning loop.
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
        Analyze a training outcome and generate lessons (DEPRECATED - use analyze_daily_outcome).

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
                        "content": "You are an expert training coach analyzing training outcomes to generate actionable lessons for athletic development.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysisList,
                temperature=os.getenv("OPENAI_TEMPERATURE", 1.0),  # Lower temperature for consistent analysis
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

    def analyze_daily_outcome(
        self,
        outcome: "DailyTrainingOutcome",
        personal_info: PersonalInfo,
        session_context: str,
        modifications_summary: str,
        previous_lessons: List[PlaybookLesson] = None,
    ) -> List[ReflectorAnalysis]:
        """
        Analyze a DAILY training outcome and generate lessons.
        
        This provides richer, more immediate learning compared to weekly aggregates.
        
        Args:
            outcome: DailyTrainingOutcome data from completed session
            personal_info: User's personal information
            session_context: Context about this specific training session
            modifications_summary: Formatted summary of user modifications
            previous_lessons: Existing lessons in the playbook for context
            
        Returns:
            List of ReflectorAnalysis objects (0-3 lessons per session)
        """
        try:
            self.logger.info(
                f"Analyzing daily outcome: plan {outcome.plan_id}, week {outcome.week_number}, {outcome.day_of_week}"
            )

            # Build the daily analysis prompt
            prompt = self._build_daily_analysis_prompt(
                outcome, personal_info, session_context, modifications_summary, previous_lessons
            )

            # Call OpenAI to analyze the outcome
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert training coach analyzing daily training outcomes to generate actionable, personalized lessons.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysisList,
                temperature=0.3,
            )

            # Parse the response
            analysis_list = completion.choices[0].message.parsed

            self.logger.info(
                f"Generated {len(analysis_list.analyses)} lessons from daily session"
            )

            return analysis_list.analyses

        except Exception as e:
            self.logger.error(f"Error analyzing daily outcome: {e}")
            return []

    @staticmethod
    def _format_client_information(personal_info: PersonalInfo) -> str:
        """Format client information for prompts (consistent with PromptGenerator)."""
        return f"""
        **USER PROFILE:**
        - Name: {personal_info.username}
        - Age: {personal_info.age}
        - Goal: {personal_info.goal_description}
        - Experience: {personal_info.experience_level}
        """

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
                    f"        - {lesson.text} (confidence: {lesson.confidence:.0%}, helpful: {lesson.helpful_count}x, harmful: {lesson.harmful_count}x)"
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
            hr_analysis = f"\n        - Heart Rate: Avg {outcome.avg_heart_rate} bpm (Target: {outcome.target_heart_rate_zone})"
        elif outcome.avg_heart_rate:
            hr_analysis = f"\n        - Heart Rate: Avg {outcome.avg_heart_rate} bpm"

        injury_warning = ""
        if outcome.injury_reported:
            injury_warning = f"\n        ⚠️ **INJURY REPORTED:** {outcome.injury_description}"

        prompt = f"""
            {self._format_client_information(personal_info)}
            
            **WORKFLOW STATUS:**
            ✅ Onboarding → ✅ Plan Generated → ✅ Week {outcome.week_number} Completed
            🎯 **CURRENT STEP:** Analyze Outcome & Generate Lessons
            
            **TRAINING PLAN CONTEXT:**
            {plan_context}
            
            **OUTCOME DATA - Week {outcome.week_number}:**
            - Completion: {outcome.sessions_completed}/{outcome.sessions_planned} sessions ({outcome.completion_rate*100:.0f}%) - {completion_status}
            {f"- User Rating: {outcome.user_rating}/5 - {rating_status}" if outcome.user_rating else ""}
            {f"- User Feedback: {outcome.user_feedback}" if outcome.user_feedback else ""}
            {hr_analysis}
            {f"- Energy Level: {outcome.energy_level}/5" if outcome.energy_level else ""}
            {f"- Soreness: {outcome.soreness_level}/5" if outcome.soreness_level else ""}
            {injury_warning}
            {f"- Performance Metrics: {outcome.performance_metrics}" if outcome.performance_metrics else ""}
            {f"- Additional Notes: {outcome.notes}" if outcome.notes else ""}
            
            **EXISTING PLAYBOOK LESSONS:**
            {lessons_context}
            
            **YOUR TASK:**
            Analyze the outcome data and generate 1-3 specific, actionable lessons that should guide future training plans.
            
            **LESSON GENERATION STRATEGY:**
            
            **Step 1: Evaluate Outcome Quality**
            • Completion ≥80% + Rating ≥4 → Generate 1 positive reinforcement lesson
            • Completion <60% or Rating ≤2 → Generate 1-2 warning lessons
            • Injury reported → Generate 1 critical warning lesson
            • Mixed signals → Generate balanced lessons addressing both
            
            **Step 2: Identify Patterns**
            • What worked well? (high completion, positive feedback)
            • What didn't work? (low completion, negative feedback, injury)
            • What adaptations are evident? (energy, soreness, performance)
            
            **Step 3: Generate Lessons**
            • Reference specific outcome data
            • Make actionable for future plans
            • Avoid repeating existing lessons
            
            **LESSON CATEGORIES & EXAMPLES:**
            
            **1. Positive Patterns** (positive=true)
            • Successful strategies to repeat across all training modalities
            • Strength example: "{personal_info.username} adapts well to progressive overload - increase load 5-10% weekly"
            • Endurance example: "{personal_info.username} responds well to 3x/week running frequency with steady mileage increases"
            • Sport example: "{personal_info.username} benefits from sport-specific skill work 2x/week alongside conditioning"
            • Priority: medium-high
            
            **2. Warning Lessons** (positive=false)
            • Issues to avoid or correct across any training type
            • Volume example: "Reduce training volume by 20% - user reported high soreness (4/5) and low energy (2/5)"
            • Intensity example: "Delay high-intensity intervals until week 4+ - premature introduction caused fatigue"
            • Frequency example: "Limit to 3 training days per week - 4+ days led to poor recovery"
            • Priority: high-critical (especially for injuries)
            
            **3. Adaptation Insights** (positive=true)
            • How user responds to specific training stimuli
            • Recovery example: "Recovery adequate with 48-hour rest between high-intensity sessions"
            • Progression example: "Can handle 10% weekly volume increases without negative symptoms"
            • Modality example: "Adapts better to mixed training (strength + endurance) than single-modality focus"
            • Priority: medium
            
            **LESSON QUALITY CRITERIA:**
            ✓ **Specific**: Reference concrete data (completion %, rating, feedback, HR, soreness)
            ✓ **Actionable**: Provide clear guidance (e.g., "Reduce volume by 20%", "Add rest day mid-week")
            ✓ **Personalized**: Tailored to {personal_info.username}'s response pattern, not generic
            ✓ **Evidence-based**: Directly supported by the outcome signals
            ✓ **Concise**: 1-2 sentences maximum per lesson
            
            **PRIORITY ASSIGNMENT GUIDE:**
            • **critical**: Injury reported, safety concerns requiring immediate action
            • **high**: Major issues preventing goal achievement (low completion, dissatisfaction)
            • **medium**: Optimization opportunities (good but could be better)
            • **low**: Minor tweaks or secondary observations
            
        **TAG SELECTION:**
        Choose 2-4 relevant tags from:
        • Experience: beginner, intermediate, advanced
        • Training load: volume, intensity, frequency, progression
        • Modality: strength, endurance, mixed, sport_specific
        • Recovery: recovery, adaptation, rest
        • Resources: equipment, schedule, timing, environment
        • Safety: injury_prevention, limitations, safety
        • Other: motivation, preferences, training_style
        
        **IMPORTANT RULES:**
        ✓ Don't repeat existing lessons unless new evidence significantly changes them
        ✓ Focus on lessons that will actually impact future plan generation
        ✓ If outcome is excellent (>80% completion, ≥4 rating), generate 1 positive lesson only
        ✓ If outcome has problems, prioritize 1-2 warning lessons to prevent repetition
        ✓ Maximum 3 lessons total - quality over quantity
        
        **OUTPUT FORMAT:**
        Return in ReflectorAnalysisList format with 1-3 lessons.
        Each lesson must include: lesson, tags, confidence, positive, reasoning, priority.
        """

        return prompt

    def _build_daily_analysis_prompt(
        self,
        outcome: "DailyTrainingOutcome",
        personal_info: PersonalInfo,
        session_context: str,
        modifications_summary: str,
        previous_lessons: Optional[List[PlaybookLesson]],
    ) -> str:
        """Build the prompt for daily outcome analysis."""
        from core.base.schemas.playbook_schemas import DailyTrainingOutcome  # Import here to avoid circular dependency

        # Format previous lessons
        lessons_context = "None yet - this is early in their training journey."
        if previous_lessons:
            lessons_context = "\n".join(
                [
                    f"        - {lesson.text} (confidence: {lesson.confidence:.0%}, helpful: {lesson.helpful_count}x, harmful: {lesson.harmful_count}x)"
                    for lesson in previous_lessons
                ]
            )

        # Determine session quality signals
        completion_status = "completed" if outcome.session_completed else "incomplete"
        
        rating_status = ""
        if outcome.user_rating:
            rating_status = (
                "very positive"
                if outcome.user_rating >= 4
                else "neutral" if outcome.user_rating == 3 else "negative"
            )

        # Build feedback section
        feedback_section = ""
        if outcome.feedback_provided:
            feedback_section = f"""
            **USER FEEDBACK PROVIDED:**
            • Rating: {outcome.user_rating}/5 - {rating_status}
            {f"• Comments: {outcome.user_feedback}" if outcome.user_feedback else ""}
            {f"• Energy after: {outcome.energy_level}/5" if outcome.energy_level else ""}
            {f"• Difficulty: {outcome.difficulty}/5" if outcome.difficulty else ""}
            {f"• Enjoyment: {outcome.enjoyment}/5" if outcome.enjoyment else ""}
            {f"• Soreness: {outcome.soreness_level}/5" if outcome.soreness_level else ""}
            """
        else:
            feedback_section = """
            **USER SKIPPED FEEDBACK** (still learn from modifications and completion status)
            """

        # Build modifications section
        modifications_section = f"""
        **TRAINING MODIFICATIONS:**
        {modifications_summary}
        """

        # Injury warning
        injury_warning = ""
        if outcome.injury_reported:
            injury_warning = f"""
        ⚠️  **INJURY/PAIN REPORTED:** {outcome.injury_description}
        Location: {outcome.pain_location}
        """

        prompt = f"""
        {self._format_client_information(personal_info)}
            
            **WORKFLOW STATUS:**
            ✅ Onboarding → ✅ Plan Generated → ✅ Session Completed → ✅ Daily Feedback
            🎯 **CURRENT STEP:** Analyze Daily Session & Generate Immediate Lessons
            
            **SESSION CONTEXT:**
            {session_context}
            
            **SESSION OUTCOME - {outcome.day_of_week}, Week {outcome.week_number}:**
            • Training Type: {outcome.training_type}
            • Completion: {completion_status} ({outcome.completion_percentage*100:.0f}%)
            • Date: {outcome.training_date}
            
            {modifications_section}
            {feedback_section}
            {injury_warning}
            
            **EXISTING PLAYBOOK LESSONS:**
            {lessons_context}
            
            **YOUR TASK:**
            Analyze this SINGLE training session and generate 0-2 specific, actionable lessons.
            Daily feedback enables immediate learning - focus on signals that indicate needed adjustments.
            
            **LESSON GENERATION STRATEGY:**
            
            **When to Generate Lessons (Be Selective):**
            
            ✅ **Generate 1-2 lessons if:**
            • User made significant modifications (reduced weight/reps/sets/distance by >15%)
            • Injury/pain reported (CRITICAL - always generate warning lesson)
            • Very negative feedback (rating ≤2, difficulty 5/5, very low energy)
            • Very positive signals with modifications (increased load - user ready for more)
            • Completion issues (didn't finish planned session)
            
            ❌ **Generate 0 lessons if:**
            • Session went as planned with neutral/positive feedback (no lessons needed)
            • Feedback skipped AND no modifications (insufficient signal)
            • Minor modifications (<10% changes)
            • Everything normal/expected
            
            **DAILY LESSON CATEGORIES & EXAMPLES:**
            
            **1. Load/Intensity Adjustments** (most common)
            • Reductions → "Reduce prescribed weight by 10-15% on squat variations - user struggled today"
            • Increases → "Can increase upper body volume - user added extra sets and reported feeling strong"
            • Endurance → "Shorten endurance sessions to 20-25min - user consistently reducing planned distance"
            • Priority: high-medium
            
            **2. Immediate Safety Concerns** (always generate if applicable)
            • Injuries → "Avoid high-impact plyometrics - knee pain reported during box jumps"
            • Pain patterns → "Reduce overhead pressing volume - shoulder discomfort during workout"
            • Fatigue → "Add extra rest day after high-intensity sessions - very low energy reported"
            • Priority: critical
            
            **3. Exercise Preferences** (from modifications)
            • Substitutions → "User prefers dumbbell press over barbell - switched exercises twice this week"
            • Skipped exercises → "User skips deadlift variations - address technique concerns or substitute"
            • Added exercises → "User enjoys accessory arm work - consistently adding extra sets"
            • Priority: medium
            
            **4. Progression Insights** (positive signals)
            • Readiness → "Ready for progression - rated 4/5 and described as 'easy' with high enjoyment"
            • Adaptations → "Recovering well from high-volume sessions - energy levels good next day"
            • Capacity → "Can handle 4 training days per week - completing all sessions with positive feedback"
            • Priority: medium
            
            **LESSON QUALITY CRITERIA:**
            ✓ **Immediate**: Based on THIS session's data (not general observations)
            ✓ **Specific**: Reference exact exercises, weights, distances, or session details
            ✓ **Actionable**: Clear guidance for NEXT similar session (e.g., "Reduce weight by 10kg on bench press")
            ✓ **Evidence-based**: Direct link to modifications, feedback, or completion data
            ✓ **Concise**: 1 sentence per lesson
            
            **PRIORITY ASSIGNMENT:**
            • **critical**: Injury/pain, safety issues requiring immediate action
            • **high**: Significant modifications indicating mismatched prescription (>20% changes)
            • **medium**: Moderate adjustments, preferences, progression opportunities
            • **low**: Minor optimizations (rare in daily feedback - usually just skip lesson)
            
            **TAG SELECTION:**
            Choose 2-3 relevant tags:
            • Modality: strength, endurance, mixed, sport_specific
            • Load: volume, intensity, weight, sets, reps, distance, duration
            • Response: recovery, fatigue, adaptation, soreness
            • Safety: injury_prevention, pain, limitations
            • Behavior: preferences, motivation, adherence, modifications
            
            **CRITICAL RULES:**
            ✓ Be SELECTIVE - Most sessions don't need lessons (0 lessons is valid!)
            ✓ Only generate lessons when there's a CLEAR SIGNAL requiring action
            ✓ Don't repeat existing lessons unless new evidence contradicts them
            ✓ Focus on ACTIONABLE insights for future similar sessions
            ✓ Maximum 2 lessons per session (usually 0-1)
            
            **OUTPUT FORMAT:**
            Return in ReflectorAnalysisList format with 0-2 lessons.
            Each lesson must include: lesson, tags, confidence, positive, reasoning, priority.
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

    def extract_initial_lessons(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
        formatted_follow_up_responses: str,
    ) -> List[PlaybookLesson]:
        """
        Extract initial "seed" lessons from onboarding Q&A responses.

        This creates the foundation of the user's playbook based on constraints,
        preferences, and context gathered during the onboarding process.

        Args:
            personal_info: User's personal information
            formatted_initial_responses: Formatted responses from initial questions
            formatted_follow_up_responses: Formatted responses from follow-up questions

        Returns:
            List of PlaybookLesson objects representing initial constraints/preferences
        """
        try:
            self.logger.info("Extracting initial lessons from onboarding responses...")

            # Build the prompt
            combined_responses = f"{formatted_initial_responses}\n\n{formatted_follow_up_responses}"

            prompt = f"""
                {self._format_client_information(personal_info)}
                
                **WORKFLOW STATUS:**
                ✅ Initial Questions → ✅ Follow-up Questions → ✅ Responses Collected
                🎯 **CURRENT STEP:** Extract Seed Lessons from Onboarding
                
                **COMPLETE ONBOARDING RESPONSES:**
                {combined_responses}
                
                **YOUR TASK:**
                Extract 3-7 actionable lessons from these responses that will guide ALL future training plans.
                These are "seed lessons" - fundamental constraints, preferences, and context learned during onboarding.
                
                **LESSON CATEGORIES & EXAMPLES:**
                
                **1. Physical Constraints** (priority: critical | positive: false)
                • Injuries, pain, medical limitations requiring accommodation across all training types
                • Strength example: "Avoid overhead pressing movements - shoulder injury recovery ongoing"
                • Endurance example: "Avoid high-impact activities (running, jumping) due to chronic knee pain"
                • Sport example: "No contact drills - concussion protocol in effect"
                • Tags: injury_prevention, limitations, safety
                
                **2. Equipment & Resources** (priority: high | positive: true/false)
                • Available/unavailable equipment and training environments
                • Strength example: "Limited to dumbbells (5-20kg) and bodyweight exercises only"
                • Endurance example: "No pool access available - use running/cycling for cardio work"
                • Sport athlete example: "Has existing sport training schedule - provide supplemental strength/conditioning work only"
                • Mixed example: "Full gym access plus outdoor running routes available"
                • Tags: equipment, resources, environment, supplemental_training
                
                **3. Schedule Constraints** (priority: high | positive: true)
                • Training availability, session duration, timing preferences
                • Time example: "Can train Monday/Wednesday/Friday only, 45 minutes maximum per session"
                • Timing example: "Prefers early morning sessions (6-7 AM) before work"
                • Frequency example: "Available 4-5 days per week for training"
                • Tags: schedule, timing, frequency, availability
                
                **4. Experience-Based Guidelines** (priority: medium | positive: true)
                • Skill level, training history, appropriate progressions
                • Beginner example: "Beginner level - prioritize fundamental movement patterns and technique"
                • Intermediate example: "Intermediate athlete - ready for structured periodization and moderate volume"
                • Advanced example: "Advanced competitor - can handle high frequency and complex programming"
                • Tags: experience_level, progression, beginner/intermediate/advanced
                
                **5. Preferences & Motivations** (priority: medium | positive: true)
                • Training style, enjoyment factors, modality preferences
                • Variety example: "Prefers varied sessions to prevent boredom - rotate activities and formats weekly"
                • Modality example: "Enjoys strength training more than endurance work - emphasize accordingly"
                • Format example: "Prefers structured workouts over open-ended training"
                • Tags: preferences, motivation, variety, training_style
                
                **6. Goal-Specific Context** (priority: high | positive: true)
                • Specific requirements for their athletic goal or sport
                • Endurance example: "Marathon preparation - prioritize progressive distance with 10% weekly increases"
                • Strength example: "Powerlifting focus - emphasize main lifts with appropriate accessories"
                • Sport athlete example: "Football player with Mon/Wed/Fri practice + Saturday games - schedule strength work Tue/Thu/Sun only"
                • Sport athlete example: "Cyclist with existing training plan - focus on supplemental core/upper body strength 2x/week"
                • Mixed example: "General fitness - balance strength, endurance, and mobility work"
                • Tags: goal_specific, sport_specific, training_focus, supplemental_training
                
                **FORMATTING REQUIREMENTS:**
                ✓ Each lesson must be **specific** and **actionable** (not generic advice like "eat healthy")
                ✓ Use **imperative language**: "Avoid...", "Focus on...", "Include...", "Limit to...", "Prioritize..."
                ✓ Reference **specific constraints** mentioned in user responses
                ✓ Mark **physical constraints/warnings/limitations** as positive=false
                ✓ Mark **preferences/capabilities/guidelines/strengths** as positive=true
                ✓ Assign appropriate **priority levels**: critical, high, medium, low
                ✓ Add **relevant tags**: 2-4 tags per lesson from the categories shown above
                ✓ Keep lessons **concise**: 1-2 sentences maximum
                
                **QUALITY STANDARDS:**
                ✓ Focus on **unchanging constraints** (injuries, equipment, schedule) - these persist
                ✓ Extract **strong preferences** only - not weak or uncertain mentions
                ✓ Lessons should apply to **ALL future plans**, not just the first one
                ✓ Don't create lessons for temporary/variable factors (current energy, mood, weather)
                ✓ Extract 3-7 lessons total - **quality over quantity**
                
                **CONFIDENCE ASSIGNMENT:**
                • Critical constraints (injuries, equipment): 0.8-0.9
                • Explicit strong preferences: 0.7-0.8
                • Implied preferences or moderate constraints: 0.5-0.7
                • Weak signals or assumptions: 0.3-0.5
                
                **OUTPUT FORMAT:**
                Return in ReflectorAnalysisList format with 3-7 lessons.
                Each lesson must include: lesson (text), tags (array), confidence (0.0-1.0), positive (boolean), reasoning (why extracted), priority (string).
            """

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting actionable training constraints and preferences from user responses.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysisList,
                temperature=0.3,
            )

            analyses = completion.choices[0].message.parsed.analyses

            # Convert analyses to PlaybookLessons
            lessons = []
            for analysis in analyses:
                lesson = PlaybookLesson(
                    id=f"onboarding_{uuid.uuid4().hex[:8]}",
                    text=analysis.lesson,
                    tags=analysis.tags + ["onboarding", "initial_constraint"],
                    helpful_count=0,
                    harmful_count=0,
                    confidence=analysis.confidence,
                    positive=analysis.positive,
                    source_plan_id="onboarding",
                )
                lessons.append(lesson)

            self.logger.info(f"Extracted {len(lessons)} initial lessons from onboarding")
            for lesson in lessons:
                self.logger.info(f"  - [{('✅' if lesson.positive else '⚠️ ')}] {lesson.text}")

            return lessons

        except Exception as e:
            self.logger.error(f"Error extracting initial lessons: {e}")
            return []

    def extract_outline_feedback_lesson(
        self, personal_info: PersonalInfo, outline: dict, feedback: str
    ) -> Optional[PlaybookLesson]:
        """
        Extract a preference lesson from user's outline feedback.

        When users review their training plan outline and provide feedback,
        this extracts a specific preference lesson to guide the detailed plan.

        Args:
            personal_info: User's personal information
            outline: The training plan outline they reviewed
            feedback: User's feedback on the outline

        Returns:
            PlaybookLesson or None if feedback is too vague
        """
        try:
            if not feedback or not feedback.strip():
                return None

            self.logger.info(f"Extracting lesson from outline feedback: {feedback[:50]}...")

            prompt = f"""
                {self._format_client_information(personal_info)}
                
                **WORKFLOW STATUS:**
                ✅ Onboarding → ✅ Outline Generated → ✅ User Reviewed Outline → ✅ Feedback Received
                🎯 **CURRENT STEP:** Extract Preference Lesson from Feedback
                
                **OUTLINE THEY REVIEWED:**
                • Title: {outline.get('title', 'N/A')}
                • Duration: {outline.get('duration_weeks', 'N/A')} weeks
                • Approach: {outline.get('explanation', 'N/A')}
                
                **USER FEEDBACK:**
                "{feedback}"
                
                **YOUR TASK:**
                Extract ONE actionable preference lesson from this feedback to apply to the detailed training plan.
                Focus on specific requests, preferences, or concerns that will impact plan design.
                
                **EXTRACTION EXAMPLES (Good Cases):**
                
                **Example 1: Modality Preference**
                • Feedback: "I prefer cycling over running"
                • Lesson: "Prioritize cycling for endurance sessions instead of running"
                • Tags: ["endurance", "preferences", "cycling", "modality"]
                • Confidence: 0.7 | Positive: true | Priority: medium
                
                **Example 2: Training Volume Adjustment**
                • Feedback: "Can we do more upper body work?"
                • Lesson: "Increase upper body training frequency - user wants more upper body emphasis"
                • Tags: ["upper_body", "frequency", "preferences", "volume"]
                • Confidence: 0.7 | Positive: true | Priority: medium
                
                **Example 3: Intensity Concern**
                • Feedback: "This looks too intense for me"
                • Lesson: "Reduce training intensity and volume - user prefers moderate conservative progression"
                • Tags: ["intensity", "volume", "preferences", "conservative"]
                • Confidence: 0.7 | Positive: true | Priority: medium
                
                **Example 4: Training Focus Shift**
                • Feedback: "I want to focus more on running and less on strength"
                • Lesson: "Prioritize endurance volume over strength work - shift emphasis to running development"
                • Tags: ["running", "endurance", "preferences", "sport_specific"]
                • Confidence: 0.8 | Positive: true | Priority: high
                
                **Example 5: Session Duration**
                • Feedback: "Sessions seem too long, I can't do more than 30 minutes"
                • Lesson: "Limit all training sessions to 30 minutes maximum - time constraint from user"
                • Tags: ["duration", "schedule", "time_constraint"]
                • Confidence: 0.8 | Positive: true | Priority: high
                
                **Example 6: Sport-Specific**
                • Feedback: "I'd like more technical skill work for basketball"
                • Lesson: "Include dedicated basketball skill sessions 2x/week alongside conditioning"
                • Tags: ["sport_specific", "basketball", "skills", "preferences"]
                • Confidence: 0.7 | Positive: true | Priority: high
                
                **NON-EXTRACTION EXAMPLES (Return Empty):**
                
                • Feedback: "Looks great!" → No specific change requested
                • Feedback: "Perfect!" → Just approval, no preference
                • Feedback: "Good" → Too vague, no actionable insight
                • Feedback: "When do we start?" → Question, not preference
                
                **EXTRACTION RULES:**
                ✓ **Only extract** if feedback contains a specific preference, concern, or modification request
                ✓ Make it **actionable and specific** - clear guidance for plan generator
                ✓ Set **confidence to 0.7-0.8** (medium-high - based on explicit user statement)
                ✓ Mark as **positive=true** (preferences are guidance, not warnings about safety)
                ✓ Set **priority** based on impact:
                • high: Major changes to plan structure (focus shift, time constraints)
                • medium: Preferences that affect plan details (exercise selection, modality choices)
                ✓ Add appropriate **tags**: preferences + specific area (cardio, strength, volume, etc.)
                
                **WHEN TO RETURN EMPTY (lesson=""):**
                • Feedback is just approval ("Great!", "Looks good!", "Perfect!", "OK")
                • Feedback is too vague to extract specific action
                • Feedback is a question without expressing preference
                • Feedback is conversational without actionable content
                
                **OUTPUT FORMAT:**
                Return in ReflectorAnalysis format with ONE lesson.
                If no actionable lesson can be extracted, set lesson to empty string "".
                Include: lesson, tags, confidence, positive, reasoning, priority.
            """

            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting actionable training preferences from user feedback.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysis,
                temperature=0.3,
            )

            analysis = completion.choices[0].message.parsed

            # Check if we got a valid lesson
            if not analysis.lesson or analysis.lesson.strip() == "":
                self.logger.info("No actionable lesson from outline feedback (too vague or just approval)")
                return None

            # Convert to PlaybookLesson
            lesson = PlaybookLesson(
                id=f"outline_feedback_{uuid.uuid4().hex[:8]}",
                text=analysis.lesson,
                tags=analysis.tags + ["outline_feedback", "user_preference"],
                helpful_count=0,
                harmful_count=0,
                confidence=0.7,
                positive=True,
                source_plan_id="outline_feedback",
            )

            self.logger.info(f"Extracted outline feedback lesson: {lesson.text}")
            return lesson

        except Exception as e:
            self.logger.error(f"Error extracting outline feedback lesson: {e}")
            return None

    def extract_lessons_from_outline_feedback(
        self,
        personal_info: PersonalInfo,
        plan_outline: dict,
        outline_feedback: str,
    ) -> List[PlaybookLesson]:
        """
        Extract multiple actionable lessons from user's outline feedback.
        
        When users provide feedback on the training plan outline, this extracts
        1-3 specific preferences or concerns to incorporate into the detailed plan.
        
        Args:
            personal_info: User's personal information
            plan_outline: The training plan outline they reviewed
            outline_feedback: User's feedback on the outline
            
        Returns:
            List of PlaybookLesson objects (0-3 lessons depending on feedback complexity)
        """
        try:
            if not outline_feedback or not outline_feedback.strip():
                self.logger.info("No outline feedback provided - returning empty lessons list")
                return []
            
            self.logger.info(f"Extracting lessons from outline feedback: {outline_feedback[:80]}...")
            
            prompt = f"""
                {self._format_client_information(personal_info)}
                
                **WORKFLOW STATUS:**
                ✅ Onboarding → ✅ Outline Generated → ✅ User Reviewed Outline → ✅ Feedback Received
                🎯 **CURRENT STEP:** Extract Preference Lessons from Feedback
                
                **OUTLINE THEY REVIEWED:**
                • Title: {plan_outline.get('title', 'N/A')}
                • Duration: {plan_outline.get('duration_weeks', 'N/A')} weeks
                • Approach: {plan_outline.get('explanation', 'N/A')}
                
                **USER FEEDBACK:**
                "{outline_feedback}"
                
                **YOUR TASK:**
                Extract 1-3 actionable preference lessons from this feedback to apply to the detailed training plan.
                Focus on specific requests, preferences, or concerns that will impact plan design.
                
                **EXTRACTION GUIDELINES:**
                
                ✅ **Extract If Feedback Contains:**
                • Specific training preferences (modality, volume, intensity, duration)
                • Concerns about the proposed approach
                • Requests for modifications or emphasis shifts
                • Time/schedule constraints not captured in Q&A
                • Focus area preferences (more upper body, less cardio, etc.)
                
                ❌ **Do NOT Extract If Feedback Is:**
                • Simple approval ("Looks great!", "Perfect!", "Good!")
                • General excitement ("Can't wait to start!")
                • Questions only ("When do we start?")
                • Too vague to be actionable
                
                **LESSON FORMATTING:**
                • Make lessons **specific and actionable** - clear guidance for plan generator
                • Use **imperative language**: "Prioritize...", "Limit to...", "Include...", "Reduce..."
                • Set **confidence to 0.7-0.8** (user explicitly stated preference)
                • Mark as **positive=true** (preferences are guidance, not safety warnings)
                • Set **priority** based on impact:
                  - high: Major structure changes (focus shift, time constraints, frequency changes)
                  - medium: Modality preferences, exercise selection, volume adjustments
                  - low: Minor style preferences
                • Add relevant **tags**: preferences + specific area (endurance, strength, volume, modality, etc.)
                
                **EXAMPLES:**
                
                **Example 1: Simple modality preference**
                Feedback: "I prefer cycling over running"
                → Lesson: "Prioritize cycling for endurance sessions instead of running"
                   Tags: ["preferences", "endurance", "cycling", "modality"]
                   Priority: medium | Confidence: 0.7 | Positive: true
                
                **Example 2: Multiple concerns**
                Feedback: "This looks too intense and the sessions seem long. Can we do more upper body work?"
                → Lesson 1: "Reduce training intensity and volume - user prefers conservative progression"
                   Tags: ["preferences", "intensity", "volume", "conservative"]
                → Lesson 2: "Limit session duration to 45 minutes or less"
                   Tags: ["duration", "schedule", "time_constraint"]
                → Lesson 3: "Increase upper body training frequency and volume"
                   Tags: ["preferences", "upper_body", "frequency", "volume"]
                
                **Example 3: Training focus shift**
                Feedback: "I want to focus more on running and less on strength"
                → Lesson: "Prioritize endurance volume over strength work - shift emphasis to running development"
                   Tags: ["preferences", "running", "endurance", "focus_shift"]
                   Priority: high | Confidence: 0.8 | Positive: true
                
                **Example 4: Just approval (return empty)**
                Feedback: "Looks perfect! Let's do this!"
                → No lessons (just approval, no modifications needed)
                
                **OUTPUT FORMAT:**
                Return in ReflectorAnalysisList format with 0-3 lessons.
                Each lesson must include: lesson (text), tags (array), confidence (0.7-0.8), positive (true), reasoning (why extracted), priority (string).
                Return empty analyses array if feedback is just approval or too vague.
            """
            
            completion = self.openai_client.chat.completions.parse(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting actionable training preferences from user feedback.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format=ReflectorAnalysisList,
                temperature=0.3,
            )
            
            analyses = completion.choices[0].message.parsed.analyses
            
            # Convert analyses to PlaybookLessons
            lessons = []
            for analysis in analyses:
                if not analysis.lesson or not analysis.lesson.strip():
                    continue  # Skip empty lessons
                    
                lesson = PlaybookLesson(
                    id=f"outline_feedback_{uuid.uuid4().hex[:8]}",
                    text=analysis.lesson,
                    tags=analysis.tags + ["outline_feedback", "user_preference"],
                    helpful_count=0,
                    harmful_count=0,
                    confidence=analysis.confidence,
                    positive=analysis.positive,
                    source_plan_id="outline_feedback",
                )
                lessons.append(lesson)
            
            if lessons:
                self.logger.info(f"Extracted {len(lessons)} lessons from outline feedback")
                for lesson in lessons:
                    self.logger.info(f"  - [{('✅' if lesson.positive else '⚠️ ')}] {lesson.text}")
            else:
                self.logger.info("No actionable lessons extracted from feedback (likely just approval)")
            
            return lessons
            
        except Exception as e:
            self.logger.error(f"Error extracting lessons from outline feedback: {e}")
            return []

    def identify_applied_lessons(
        self, training_plan: dict, playbook_lessons: List[dict], personal_info: PersonalInfo
    ) -> List[str]:
        """
        Identify which playbook lessons were applied during plan generation.

        This closes the ACE feedback loop by tracking which lessons actually
        influenced the generated training plan.

        Args:
            training_plan: The generated training plan
            playbook_lessons: List of lesson dicts that were available during generation
            personal_info: User's personal information

        Returns:
            List of lesson IDs that were applied
        """
        if not playbook_lessons or len(playbook_lessons) == 0:
            return []

        try:
            self.logger.info(f"Identifying which of {len(playbook_lessons)} lessons were applied to plan")

            # Format lessons for analysis
            lessons_text = "\n".join([
                f"{i+1}. [{lesson.get('id', lesson.get('lesson_id', f'lesson_{i}'))}] {lesson.get('text', 'N/A')}"
                for i, lesson in enumerate(playbook_lessons)
            ])

            # Create plan summary
            plan_summary = f"""
        Title: {training_plan.get('title', 'N/A')}
        Duration: {training_plan.get('duration_weeks', 'N/A')} weeks
        Frequency: {training_plan.get('sessions_per_week', 'N/A')} sessions/week

        Weekly Schedule Example:"""

            if training_plan.get('weekly_schedules'):
                first_week = training_plan['weekly_schedules'][0]
                for day in first_week.get('daily_trainings', [])[:3]:
                    plan_summary += f"\n        - Day {day.get('day_of_week', 'N/A')}: {day.get('training_type', 'N/A')}"

            prompt = f"""
                {self._format_client_information(personal_info)}
                
                **WORKFLOW STATUS:**
                ✅ Onboarding → ✅ Outline → ✅ Plan Generated → ✅ Lessons Available
                🎯 **CURRENT STEP:** Identify Which Lessons Were Applied
                
                **AVAILABLE PLAYBOOK LESSONS:**
                {lessons_text}
                
                **GENERATED TRAINING PLAN:**
                {plan_summary}
                
                **YOUR TASK:**
                Review each playbook lesson and determine if it was **ACTUALLY APPLIED** in the generated plan.
                This closes the ACE feedback loop by tracking which lessons influenced plan decisions.
                
                **APPLIED CRITERIA (Must Show Evidence):**
                
                ✓ **Equipment/Resource Constraints Respected**
                • Strength lesson: "Limited to dumbbells and bodyweight only"
                • Evidence: Plan uses only dumbbell and bodyweight exercises (no barbell, machines, cables)
                
                • Endurance lesson: "No pool access available"
                • Evidence: Plan uses running/cycling, no swimming sessions
                
                ✓ **Schedule Preferences Honored**
                • Lesson: "Can train Monday/Wednesday/Friday only"
                • Evidence: Plan schedules all training sessions on those exact days
                
                • Lesson: "Maximum 45 minutes per session"
                • Evidence: All sessions designed to fit within 45-minute timeframe
                
                ✓ **Training Adaptations Implemented**
                • Lesson: "Progressive overload weekly by 5-10%"
                • Evidence: Plan shows volume/intensity increasing 5-10% each week
                
                • Lesson: "Can handle 4 sessions/week comfortably"
                • Evidence: Plan includes exactly 4 training days
                
                ✓ **Warnings/Limitations Avoided**
                • Lesson: "Avoid high-impact activities due to knee pain"
                • Evidence: Plan has no jumping, running, or plyometric movements
                
                • Lesson: "No overhead pressing - shoulder injury"
                • Evidence: Plan includes no overhead press variations
                
                ✓ **Modality/Activity Preferences Followed**
                • Lesson: "Prefers cycling over running for endurance work"
                • Evidence: Plan includes cycling sessions, no running
                
                • Lesson: "Enjoys strength training more than cardio"
                • Evidence: Plan emphasizes strength work with minimal endurance volume
                
                **NOT APPLIED CRITERIA:**
                
                ✗ No evidence the lesson influenced the plan structure
                ✗ Plan contradicts or ignores the lesson
                ✗ Lesson is not relevant to this training phase
                
                **ANALYSIS APPROACH:**
                1. Read each lesson carefully
                2. Check if the plan structure/content reflects that lesson
                3. Look for specific evidence (exercise selection, schedule, volume, progression, etc.)
                4. Only mark as applied if there's **clear, observable evidence**
                5. When uncertain, err on the side of NOT applied
                
                **OUTPUT REQUIREMENTS:**
                • Return **ONLY** the lesson IDs that were clearly applied
                • Format: Comma-separated list (no brackets, no quotes, no spaces after commas)
                • Example: lesson_abc123,lesson_def456,lesson_xyz789
                • If NO lessons were applied, return exactly: none
                
                **DO NOT:**
                • Don't include explanations or reasoning
                • Don't add extra text or commentary
                • Don't format with brackets, quotes, or extra punctuation
                • Don't assume - only mark if evidence clearly exists
                • Don't be generous - require actual evidence
                
                Return the comma-separated list of applied lesson IDs or "none".
            """

            completion = self.openai_client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing training plans and identifying which constraints/preferences were applied.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=500,
            )

            response = completion.choices[0].message.content.strip()

            if response.lower() == "none":
                self.logger.info("No lessons were identified as applied")
                return []

            # Parse lesson IDs
            applied_ids = [lid.strip() for lid in response.split(",")]
            self.logger.info(f"Identified {len(applied_ids)} applied lessons: {applied_ids}")

            return applied_ids

        except Exception as e:
            self.logger.error(f"Error identifying applied lessons: {e}")
            # Default: assume all lessons were applied (conservative approach)
            return [lesson.get("id", lesson.get("lesson_id", "")) for lesson in playbook_lessons]


# Wrapper class for list of analyses (for structured output)
class ReflectorAnalysisList(BaseModel):
    """Container for multiple reflector analyses."""

    analyses: List[ReflectorAnalysis] = Field(
        ..., description="List of 1-3 lessons learned from this outcome"
    )
