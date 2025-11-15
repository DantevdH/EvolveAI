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
import time
from typing import List, Optional, Dict, Any
from logging_config import get_logger

from core.base.schemas.playbook_schemas import (
    TrainingOutcome,
    ReflectorAnalysis,
    PlaybookLesson,
)
from core.training.schemas.question_schemas import PersonalInfo
from pydantic import BaseModel, Field


from core.training.helpers.llm_client import LLMClient
from core.training.helpers.database_service import db_service


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

    def __init__(self, openai_client: Optional[Any] = None):
        """
        Initialize the Reflector.

        Args:
            openai_client: OpenAI client instance (creates new one if not provided)
        """
        self.logger = get_logger(__name__)
        # Keep for backward compatibility if explicitly passed
        self.openai_client = openai_client
        # Unified LLM client (OpenAI or Gemini)
        self.llm = LLMClient()

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

    async def extract_initial_lessons(
        self,
        personal_info: PersonalInfo,
        formatted_initial_responses: str,
    ) -> List[ReflectorAnalysis]:
        """
        Extract initial "seed" lessons from onboarding Q&A responses.

        This creates the foundation of the user's playbook based on constraints,
        preferences, and context gathered during the onboarding process.

        Returns ReflectorAnalysis objects that should be passed through Curator
        for deduplication before being saved to the playbook.

        Args:
            personal_info: User's personal information
            formatted_initial_responses: Formatted responses from initial questions

        Returns:
            List of ReflectorAnalysis objects (will be processed by Curator)
        """
        try:
            self.logger.info("Extracting initial lessons from onboarding responses...")

            goal_experience_question = "Q: What is your ultimate training goals and your accompanying experience level"
            goal_experience_response = f"A: My goal is; {personal_info.goal_description} and I have experience_level {personal_info.experience_level}"
            fake_question_response = f"{goal_experience_question}: {goal_experience_response}"
            
            # Build the prompt with combined initial responses including the fake question
            combined_responses = f"{fake_question_response}\n\n{formatted_initial_responses}"

            prompt = f"""
                {self._format_client_information(personal_info)}
                
                **WORKFLOW STATUS:**
                ✅ Initial Questions → ✅ Responses Collected
                🎯 **CURRENT STEP:** Extract Seed Lessons from Onboarding
                
                **YOUR ROLE IN THE ACE FRAMEWORK:**
                You are the Reflector - responsible for generating actionable lessons from user interactions. These lessons will be curated by the Curator and stored in the user's playbook, which guides the TrainingCoach to create personalized training plans. Focus on extracting long-term, persistent insights - not temporary states or daily fluctuations.
                
                **THE LESSON'S PURPOSE:**
                - **Institutional Memory:** These lessons become part of the user's playbook that guides ALL future plan generation
                - **Long-Term Focus:** Extract persistent patterns, constraints, and preferences - not temporary states or daily changes
                - **Actionable Knowledge:** Each lesson should be specific and actionable for future plan generation
                - **Quality over Quantity:** Better to extract fewer high-quality, unique lessons than many overlapping ones
                
                **COMPLETE ONBOARDING RESPONSES:**
                {combined_responses}
                
                **YOUR TASK:**
                Extract 3-7 **UNIQUE, ACTIONABLE, LONG-TERM** lessons from these responses that will guide ALL future training plans.
                These are "seed lessons" - fundamental constraints, preferences, and context learned during onboarding.
                
                **CRITICAL FILTER: LONG-TERM LESSONS ONLY**
                - Focus on persistent patterns, not temporary states
                - Capture long-term constraints (injuries, equipment access, schedule patterns, etc.)
                - Capture proven preferences that are likely to persist over time
                - Avoid lessons about daily fluctuations, one-time events, or temporary situations
                - If a potential lesson seems temporary or situation-specific, it may not belong in the playbook
                
                **UNIQUENESS REQUIREMENT:**
                ✓ Each lesson MUST be DISTINCT and NON-OVERLAPPING with other extracted lessons
                ✓ Avoid extracting multiple lessons that convey the same or similar meaning
                ✓ If two potential lessons overlap significantly → merge them or pick the most comprehensive one
                ✓ Focus on extracting DIFFERENT aspects of the user (schedule, equipment, constraints, preferences, etc.)
                ✓ Each lesson should cover a UNIQUE dimension of the user's profile
                
                **WHAT TO EXTRACT (DISTINCT LESSONS):**
                • One lesson about schedule/availability (e.g., "can train Monday/Wednesday/Friday")
                • One lesson about equipment constraints (e.g., "limited to dumbbells only")
                • One lesson about physical limitations (e.g., "avoids overhead pressing due to shoulder")
                • One lesson about preferences (e.g., "prefers strength over endurance")
                • One lesson about experience level (e.g., "beginner - focus on fundamentals")
                • Each lesson should cover a DIFFERENT aspect - avoid overlap
                
                **WHAT NOT TO EXTRACT (OVERLAPS/DUPLICATES):**
                ✗ Multiple lessons that say the same thing in different ways
                ✗ Lessons that significantly overlap in meaning
                ✗ Redundant lessons about the same constraint/preference
                ✗ Lessons that could be combined into one comprehensive lesson
                
                **DUPLICATE AVOIDANCE:**
                Before extracting each lesson, ask yourself:
                1. "Does this lesson overlap with another lesson I'm extracting?"
                2. "Can I combine this with another lesson instead?"
                3. "Does this cover the same constraint/preference as an existing lesson?"
                
                If YES to any → **MERGE OR SKIP**. Only extract truly distinct, unique lessons.
                
                {self._get_shared_lesson_extraction_sections()}
                
                Extract 3-7 **UNIQUE, NON-OVERLAPPING** lessons total - **quality and uniqueness over quantity**.
                Remember: Each lesson should cover a different dimension of the user's profile.
            """

            ai_start = time.time()
            analyses_list, completion = self.llm.chat_parse(prompt, ReflectorAnalysisList)
            ai_duration = time.time() - ai_start
            
            # Track latency
            await db_service.log_latency_event("reflector_extract_initial", ai_duration, completion)
            
            analyses = analyses_list.analyses

            self.logger.info(f"Extracted {len(analyses)} initial lesson analyses from onboarding")
            for analysis in analyses:
                self.logger.info(f"  - [{('✅' if analysis.positive else '⚠️ ')}] {analysis.lesson} (confidence: {analysis.confidence:.0%})")

            # Return ReflectorAnalysis objects (will be processed by Curator)
            return analyses

        except Exception as e:
            self.logger.error(f"Error extracting initial lessons: {e}")
            return []

    async def extract_lessons_from_conversation_history(
        self,
        conversation_history: List[Dict[str, str]],
        personal_info: PersonalInfo,
        accepted_training_plan: Dict[str, Any],
        existing_playbook: "UserPlaybook",
    ) -> List[ReflectorAnalysis]:
        """
        Extract lessons from conversation history when user accepts the plan.
        
        This extracts additional insights from the conversation that occurred
        during plan preview/review. The Curator automatically prevents duplicates
        by comparing against all existing lessons (including onboarding lessons).
        
        Args:
            conversation_history: List of conversation messages [{role, content}, ...]
            personal_info: User's personal information
            accepted_training_plan: The training plan that satisfied the user
            existing_playbook: User's current playbook (for context only)
            
        Returns:
            List of ReflectorAnalysis objects extracted from conversation
            (Curator will process these and convert to PlaybookLesson)
        """
        try:
            self.logger.info("Extracting lessons from conversation history...")
            
            # Format conversation history
            conversation_text = self._format_conversation_history(conversation_history)
            
            # Format accepted training plan summary
            plan_summary = self._format_training_plan_summary(accepted_training_plan)
            
            # Format existing playbook context (what we already know)
            existing_lessons_context = self._format_existing_lessons_context(existing_playbook)
            
            prompt = f"""
                {self._format_client_information(personal_info)}
                
                **WORKFLOW STATUS:**
                ✅ Initial Questions → ✅ Follow-up Questions → ✅ Plan Generated → ✅ Plan Accepted
                🎯 **CURRENT STEP:** Extract Lessons from Conversation History
                
                **YOUR ROLE IN THE ACE FRAMEWORK:**
                You are the Reflector - responsible for generating actionable lessons from user interactions. These lessons will be curated by the Curator and stored in the user's playbook, which guides the TrainingCoach to create personalized training plans. Focus on extracting long-term, persistent insights - not temporary states or daily fluctuations.
                
                **THE LESSON'S PURPOSE:**
                - **Institutional Memory:** These lessons become part of the user's playbook that guides ALL future plan generation
                - **Long-Term Focus:** Extract persistent patterns, constraints, and preferences - not temporary states or daily changes
                - **Actionable Knowledge:** Each lesson should be specific and actionable for future plan generation
                - **Quality over Quantity:** Better to extract fewer high-quality, unique lessons than many overlapping ones
                
                **ACCEPTED TRAINING PLAN:**
                {plan_summary}
                
                **CONVERSATION HISTORY:**
                {conversation_text}
                
                **EXISTING PLAYBOOK CONTEXT (What We Already Know):**
                {existing_lessons_context}
                
                **YOUR TASK:**
                Extract 1-5 **UNIQUE, ACTIONABLE, LONG-TERM** lessons from the conversation history that will guide future training plans.
                **CRITICAL:** Only extract lessons that are TRULY NEW and NOT already covered in the existing playbook.
                
                **CRITICAL FILTER: LONG-TERM LESSONS ONLY**
                - Focus on persistent patterns, not temporary states
                - Capture long-term constraints (injuries, equipment access, schedule patterns, etc.)
                - Capture proven preferences that are likely to persist over time
                - Avoid lessons about daily fluctuations, one-time events, or temporary situations
                - If a potential lesson seems temporary or situation-specific, it may not belong in the playbook
                
                **UNIQUENESS REQUIREMENT:**
                ✓ Each lesson MUST add NEW value not already present in existing playbook
                ✓ Compare each potential lesson against ALL existing lessons before extracting
                ✓ If a lesson is similar/duplicate of existing lesson → DO NOT EXTRACT IT
                ✓ Focus on insights that COMPLEMENT or EXTEND existing knowledge, not repeat it
                
                **WHAT TO EXTRACT (UNIQUE INSIGHTS ONLY):**
                • **New** preferences mentioned during conversation (not in onboarding or existing playbook)
                • **Novel** clarifications or elaborations that add new context
                • **Unique** questions that revealed important new context
                • **Distinct** feedback patterns or preferences shown through conversation style
                • **Additional** training philosophy or approach preferences not yet captured
                • **New** constraints or limitations mentioned for the first time
                
                **WHAT NOT TO EXTRACT (DUPLICATES/IRRELEVANT/TEMPORARY):**
                ✗ Lessons already covered in existing playbook (even if slightly different wording)
                ✗ Generic compliments ("I like it", "Looks good")
                ✗ Temporary preferences or mood-based statements (daily fluctuations)
                ✗ One-off questions without actionable insights
                ✗ Lessons that are essentially the same as existing lessons (different wording, same meaning)
                ✗ Lessons that overlap significantly with existing playbook content
                ✗ Temporary states or situation-specific insights that won't persist
                ✗ Daily fluctuations, one-time events, or context-dependent preferences
                
                **DUPLICATE DETECTION:**
                Before extracting a lesson, ask yourself:
                1. "Does this lesson already exist in the playbook (same or similar meaning)?"
                2. "Does this add truly new information, or is it just restating what we know?"
                3. "Would this be redundant with existing lessons?"
                
                If YES to any → **DO NOT EXTRACT IT**. Only extract if it's genuinely unique.
                
                {self._get_shared_lesson_extraction_sections()}
                
                Extract 1-5 **UNIQUE** lessons total - **quality and uniqueness over quantity**.
                Remember: It's better to extract fewer truly unique lessons than many duplicate ones.
            """
            
            ai_start = time.time()
            analyses_list, completion = self.llm.chat_parse(prompt, ReflectorAnalysisList)
            ai_duration = time.time() - ai_start
            
            # Track latency
            await db_service.log_latency_event("reflector_extract_conversation", ai_duration, completion)
            
            analyses = analyses_list.analyses

            # Store analyses for curator processing (return both for flexibility)
            # Note: Curator expects ReflectorAnalysis, so we'll process those directly
            # The caller can convert to PlaybookLesson after curator processing
            
            self.logger.info(f"Extracted {len(analyses)} lesson analyses from conversation history")
            for analysis in analyses:
                self.logger.info(f"  - [{('✅' if analysis.positive else '⚠️ ')}] {analysis.lesson} (priority: {analysis.priority})")
            
            # Return ReflectorAnalysis directly (Curator expects this format)
            # This preserves priority and all analysis metadata
            return analyses
            
        except Exception as e:
            self.logger.error(f"Error extracting lessons from conversation history: {e}")
            return []
    
    def _format_conversation_history(self, conversation_history: List[Dict[str, str]]) -> str:
        """Format conversation history for prompt."""
        if not conversation_history:
            return "No conversation history available."
        
        formatted = []
        for i, msg in enumerate(conversation_history, 1):
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            formatted.append(f"**{role.upper()} {i}:** {content}")
        
        return "\n\n".join(formatted)
    
    def _format_training_plan_summary(self, training_plan: Dict[str, Any]) -> str:
        """Format training plan summary for prompt."""
        if not training_plan:
            return "Training plan details not available."
        
        title = training_plan.get("title", "Unknown")
        summary = training_plan.get("summary", "No summary available")
        justification = training_plan.get("justification", "No justification available")
        
        return f"""
                **Title:** {title}

                **Summary:** {summary}

                **Justification:** {justification}
        """
    
    def _format_existing_lessons_context(self, playbook: "UserPlaybook") -> str:
        """Format existing playbook lessons as context (what we already know)."""
        if not playbook or not playbook.lessons:
            return "No existing lessons - this is a new playbook."
        
        formatted = []
        for i, lesson in enumerate(playbook.lessons, 1):
            formatted.append(
                f"{i}. [{('✅' if lesson.positive else '⚠️ ')}] {lesson.text} (confidence: {lesson.confidence:.0%})"
            )
        
        return "\n".join(formatted)
    
    def _get_shared_lesson_extraction_sections(self) -> str:
        """
        Get shared lesson extraction prompt sections (categories, formatting, quality, confidence, output).
        
        This is used by both extract_initial_lessons and extract_lessons_from_conversation_history
        to avoid duplication.
        
        Returns:
            String containing the shared prompt sections
        """
        return """
                **LESSON CATEGORIES & EXAMPLES:**
                
                **1. Physical Constraints** (priority: critical | positive: false)
                • Injuries, pain, medical limitations requiring accommodation across all training types
                • Strength example: "The user avoids overhead pressing movements due to shoulder injury recovery."
                • Endurance example: "The user avoids high-impact activities (running, jumping) due to chronic knee pain."
                • Sport example: "The user cannot perform contact drills due to concussion protocol."
                • Tags: injury_prevention, limitations, safety
                
                **2. Equipment & Resources** (priority: high | positive: true/false)
                • Available/unavailable equipment and training environments
                • Strength example: "The user is limited to dumbbells (5-20kg) and bodyweight exercises only."
                • Endurance example: "The user has no pool access available - use running/cycling for cardio work."
                • Sport athlete example: "The user has an existing sport training schedule - provide supplemental strength/conditioning work only."
                • Mixed example: "The user has full gym access plus outdoor running routes available."
                • Tags: equipment, resources, environment, supplemental_training
                
                **3. Schedule & Recovery** (priority: high | positive: true)
                • Training availability, session duration, timing preferences, and recovery patterns
                • Schedule example: "The user can train Monday/Wednesday/Friday only, 45 minutes maximum per session."
                • Timing example: "The user prefers early morning sessions (6-7 AM) before work."
                • Frequency example: "The user is available 4-5 days per week for training."
                • Recovery example: "The user needs at least one full rest day per week and prefers Sunday."
                • Recovery example: "The user enjoys active recovery days with light mobility work or walking."
                • Recovery example: "The user requires 48 hours between intense strength sessions for optimal recovery."
                • Tags: schedule, timing, frequency, availability, recovery, rest, active_recovery, rest_days
                
                **4. Experience-Based Guidelines** (priority: medium | positive: true)
                • Skill level, training history, appropriate progressions
                • Beginner example: "The user is a beginner and should prioritize fundamental movement patterns and technique."
                • Intermediate example: "The user is an intermediate athlete ready for structured periodization and moderate volume."
                • Advanced example: "The user is an advanced competitor and can handle high frequency and complex programming."
                • Tags: experience_level, progression, beginner/intermediate/advanced
                
                **5. Goal-Specific Context** (priority: high | positive: true)
                • Specific requirements for their athletic goal or sport
                • Endurance example: "The user is preparing for a marathon and needs progressive distance with 10% weekly increases."
                • Strength example: "The user has a powerlifting focus and needs emphasis on main lifts with appropriate accessories."
                • Sport athlete example: "The user is a football player with Mon/Wed/Fri practice and Saturday games - schedule strength work Tue/Thu/Sun only."
                • Sport athlete example: "The user is a cyclist with an existing training plan and needs supplemental core/upper body strength 2x/week."
                • Mixed example: "The user has a general fitness goal and needs balance between strength, endurance, and mobility work."
                • Tags: goal_specific, sport_specific, training_focus, supplemental_training
                
                **6. Training Load & Progression** (priority: medium | positive: true)
                • Preferences for intensity, volume, and how training should progress over time
                • Intensity example: "The user prefers moderate-intensity steady-state cardio over high-intensity intervals."
                • Intensity example: "The user enjoys high-intensity training sessions (RPE 8-9) 2-3x per week."
                • Intensity example: "The user prefers conservative intensity (RPE 6-7) with focus on form and consistency."
                • Volume example: "The user prefers minimal effective dose - quality over quantity approach."
                • Volume example: "The user thrives on higher training volumes and can handle 5-6 sessions per week."
                • Volume example: "The user prefers fewer, longer sessions over many short sessions."
                • Progression example: "The user prefers conservative, gradual progression and avoids aggressive increases."
                • Progression example: "The user responds well to linear progression with structured overload."
                • Progression example: "The user enjoys varied progression with periodized intensity and volume changes."
                • Tags: intensity, volume, progression, rpe, training_intensity, training_volume, periodization, training_load
                
                **7. Preferences & Exercise Selection** (priority: medium | positive: true)
                • Training style preferences, enjoyment factors, and exercise/movement pattern preferences
                • Style example: "The user prefers varied sessions to prevent boredom - rotate activities and formats weekly."
                • Modality example: "The user enjoys strength training more than endurance work - emphasize accordingly."
                • Format example: "The user prefers structured workouts over open-ended training."
                • Exercise example: "The user prefers free weights over machines for strength training."
                • Exercise example: "The user avoids specific exercises (e.g., deadlifts) due to form concerns."
                • Exercise example: "The user enjoys compound movements - prioritize multi-joint exercises."
                • Exercise example: "The user prefers bodyweight exercises when equipment is unavailable."
                • Tags: preferences, motivation, variety, training_style, exercise_selection, movement_patterns, compound_isolation
                
                **FORMATTING REQUIREMENTS:**
                ✓ Each lesson must be **specific** and **actionable** (not generic advice like "eat healthy")
                ✓ **CRITICAL - Lesson Text Format:** Always write lessons in third person starting with "The user...":
                  • ✅ CORRECT: "The user avoids overhead pressing movements due to shoulder injury recovery."
                  • ✅ CORRECT: "The user prefers compound movements for upper body strength development."
                  • ✅ CORRECT: "The user can train Monday/Wednesday/Friday only, 45 minutes maximum per session."
                  • ❌ WRONG: "Avoid overhead pressing movements..."
                  • ❌ WRONG: "Focus on compound movements..."
                  • ❌ WRONG: "Train Monday/Wednesday/Friday only..."
                ✓ Reference **specific constraints** or insights mentioned
                ✓ Mark **physical constraints/warnings/limitations** as positive=false
                ✓ Mark **preferences/capabilities/guidelines/strengths** as positive=true
                ✓ Assign appropriate **priority levels**: critical, high, medium, low
                ✓ Add **relevant tags**: 2-4 tags per lesson from the categories shown above
                ✓ Keep lessons **concise**: 1-2 sentences maximum
                
                **QUALITY STANDARDS (LONG-TERM FOCUS):**
                ✓ Focus on **unchanging constraints** (injuries, equipment, schedule, etc.) - these persist over time
                ✓ Extract **strong, persistent preferences** only - not weak, uncertain, or temporary mentions
                ✓ Lessons should apply to **ALL future plans**, not just the current one
                ✓ Don't create lessons for temporary/variable factors (current energy, mood, weather, daily fluctuations)
                ✓ Extract lessons that represent **long-term patterns** - not one-time events or situation-specific insights
                ✓ Each lesson should be **actionable** and **specific** - something the TrainingCoach can use to guide future plan generation
                ✓ Extract lessons with focus on quality over quantity - better to extract fewer high-value lessons
                
                **CONFIDENCE ASSIGNMENT:**
                Assign confidence based on how clearly and explicitly the preference/constraint was stated:
                
                **0.9-1.0 (Highest Confidence - Towards 1):** User made an extremely clear, definitive statement with multiple reinforcements leaving no room for interpretation.
                
                **0.8-0.9 (Very High Confidence):** User explicitly stated a critical constraint or limitation with clear, direct language and minimal ambiguity.
                
                **0.7-0.8 (High Confidence):** User explicitly stated a strong preference with clear reasoning, though may allow for minor variation.
                
                **0.5-0.7 (Medium Confidence):** User mentioned something in passing or implied a preference through context, requiring interpretation to understand.
                
                **0.3-0.5 (Low Confidence):** Very vague mentions or assumptions based on limited information, with ambiguous or multiple possible interpretations.
                
                **OUTPUT FORMAT:**
                Return in ReflectorAnalysisList format.
                Each lesson must include: lesson (text), tags (array), confidence (0.0-1.0), positive (boolean), reasoning (why extracted), priority (string)."""

    async def identify_applied_lessons(
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

            ai_start = time.time()
            response = self.llm.chat_text([
                {
                    "role": "system",
                    "content": "You are an expert at analyzing training plans and identifying which constraints/preferences were applied.",
                },
                {"role": "user", "content": prompt},
            ]).strip()
            ai_duration = time.time() - ai_start
            
            # Track latency (chat_text doesn't return completion object, so pass None)
            await db_service.log_latency_event("reflector_identify_applied", ai_duration, None)

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
