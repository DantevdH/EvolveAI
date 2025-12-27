"""
Helper methods for plan generation prompts.
These provide shared sections and instructions used across different plan prompts.
"""

from typing import Optional
from app.schemas.question_schemas import PersonalInfo


def get_app_scope_section() -> str:
    """Shared app scope description used across prompts."""
    return """
    **CRITICAL - APP SCOPE:**
    This app creates training programs (strength & conditioning).
    • ✅ We provide: Strength training, running, cycling, swimming, hiking, and general conditioning
    • ❌ We do NOT provide: Sport-specific drills, technical skill training, or team practice schedules
    • 🎯 For athletes: We create supportive strength/conditioning work to complement their existing sport training
    """


def render_modality_decision_summary(
    include_bodyweight_strength: bool,
    include_equipment_strength: bool,
    include_endurance: bool,
    rationale: str,
) -> str:
    """Render modality summary section for plan prompts."""
    return f"""
        **MODALITY DECISION (BASED ON CURRENT GOAL AND PLAYBOOK):**
        • Include Bodyweight Strength Sessions: {"Yes" if include_bodyweight_strength else "No"}
        • Include Equipment-Based Strength Sessions: {"Yes" if include_equipment_strength else "No"}
        • Include Endurance Sessions: {"Yes" if include_endurance else "No"}
        • Rationale: {rationale}
    """


def get_one_week_enforcement() -> str:
    """Shared section enforcing exactly 1-week output."""
    return """
        ⚠️ **CRITICAL: GENERATE EXACTLY 1 WEEK (7 DAYS)**
        • Provide a complete 7-day overview (Monday-Sunday) with each day labeled as training or rest. 
          If mentioned, respect the user's available training days from playbook lessons—only schedule active sessions on the days they can train.
        • Schema enforces: weekly_schedules array with exactly 1 WeeklySchedule (week_number: 1)
        • Schema enforces: daily_trainings array with exactly 7 days in Literal order (Monday-Sunday)
        • DO NOT generate multiple weeks or reference future weeks in your output
        • The system will handle repetition and progression downstream
    """


def get_modality_instructions(
    include_bodyweight_strength: bool = True,
    include_equipment_strength: bool = False,
    include_endurance: bool = True,
    personal_info: PersonalInfo = None,
) -> str:
    """Shared section with modality-specific instructions tailored to modality decisions."""
    weight_unit_text = personal_info.weight_unit if personal_info else "kg or lbs"
    include_any_strength = include_bodyweight_strength or include_equipment_strength
    include_mixed = include_any_strength and include_endurance

    sections = ["**MODALITY-SPECIFIC INSTRUCTIONS:**"]

    if include_any_strength:
        sections.append(
            """
        **STRENGTH (General Rules):**
        • Schema enforces: main_muscle and equipment must be valid Enum values, execution_order is required
        • DO NOT set exercise_id (will be matched automatically)
        
        **⚠️ CRITICAL: SETS vs REPS (MUST UNDERSTAND):**
        • SETS = Number of times you perform the exercise (e.g., 3 sets means you do the exercise 3 times)
          - Normal range: 1-6 sets per exercise (typically 3-5 sets) unless specified otherwise by the user
          - Example: If doing "Bench Press" with 3 sets of 10 reps, you perform 10 repetitions, rest, then do 10 more, rest, then 10 more (3 total sets)
        • REPS = Number of repetitions per set (e.g., 10 reps means you do the movement 10 times in one set)
          - Normal range: 1-30 reps per set (typically 6-15 reps for most exercises) unless specified otherwise by the user
          - Example: In "3 sets of 10 reps", the 10 is the reps (repetitions per set), the 3 is the sets (number of times)
        • IMPORTANT: The "sets" field must be an INTEGER (1-6), representing how many times you perform the exercise
        • IMPORTANT: The "reps" field must be an ARRAY of integers, with one value per set
        • IMPORTANT: The "weight" field must be an ARRAY of floats, with one value per set
        • IMPORTANT: reps and weight arrays MUST have the same length as the number of sets
        • IMPORTANT: The number of reps per set should typically be an even number (easier to track)
        
        **⚠️ CRITICAL: EXERCISE NAMING RULES (MUST FOLLOW):**
        • exercise_name: Use ONLY the standard/common exercise name WITHOUT any equipment prefix or suffix
        • Equipment type MUST appear ONLY in the 'equipment' field, NEVER in exercise_name
        • Use the most widely recognized, standard names that will match the exercise database
        • ✅ CORRECT examples: "Bench Press", "Row", "Squat", "Deadlift", "Lateral Raise", "Chest Fly", "Shoulder Press"
        • ❌ WRONG examples: "Barbell Row", "Dumbbell Lateral Raise", "Barbell Bench Press", "Overhead Press" (use "Shoulder Press" instead)
        • ❌ WRONG examples: "Seated Calf Raise (Machine)", "Cable Fly", "Barbell Squat"
        • The exercise matching system requires clean names without equipment - including equipment in the name will cause matching failures
        """
        )

    if include_bodyweight_strength:
        sections.append(
            f"""
        **BODYWEIGHT STRENGTH days:** Minimal or no equipment.
        • Use equipment="Body weight" (or bands/suspension only when confirmed).
        • Focus on tempo, pauses, unilateral work, range of motion, or volume to drive difficulty.
        • Skip weight prescriptions—leave weights empty or set to 0 since body weight is the resistance.
        • Provide sets/reps and clear execution_order for each movement.
        """
        )

    if include_equipment_strength:
        sections.append(
            f"""
        **EQUIPMENT-BASED STRENGTH days:** Loaded implements (barbells, dumbbells, machines) are available.
        • Provide sets, reps, weight, and execution_order for each exercise (weight in {weight_unit_text}).
        • Select movements that respect confirmed equipment access and the user's experience level.
        
        **WEIGHT GENERATION GUIDELINES:**
        • Extract benchmark lifts from assessment responses (if provided) - look for 1RM values for squat, bench press, deadlift, overhead press
        • Use benchmark lifts to assess the user's overall strength level (strength-to-body-weight ratios, relative strength capacity)
        • For exercises that match known benchmarks (e.g., user provided bench press 1RM, and plan includes bench press), calculate weights directly based on rep ranges:
          - 3-5 reps: 80-85% of 1RM
          - 6-8 reps: 75-80% of 1RM
          - 9-12 reps: 70-75% of 1RM
          - 12+ reps: 65-70% of 1RM
        • For all other exercises, use the benchmark-derived strength assessment to estimate appropriate weights relative to their strength level
        • If no benchmarks provided, estimate weights based on user's body weight, age, gender, experience level, and goal
        • Conservative estimates for beginners, progressive for experienced users
        """
        )

    if include_endurance:
        sections.append(
            """
        **ENDURANCE days:** Sessions with segment-based structure for interval workouts
        • Schema enforces: sport_type must be valid Enum, segments array required (min 1 segment)
        • Each session contains one or more SEGMENTS (not multiple endurance_sessions for intervals)
        • All segments within a session share the same sport_type

        **SEGMENT STRUCTURE:**
        • segment_order: Sequence within session (1, 2, 3...)
        • segment_type: warmup, work, recovery, rest, cooldown (for auto-naming and visual distinction)
        • target_type: 'time' (seconds), 'distance' (meters), or 'open' (manual advance)
        • target_value: Duration in seconds OR distance in meters (null for 'open')
        • target_heart_rate_zone: 1-5 (optional per segment)
        • target_pace: seconds per km (optional)

        **SEGMENT TYPES:**
        - warmup: Low-intensity preparation (typically Zone 1-2)
        - work: Active effort intervals (Zone 3-5 depending on intensity)
        - recovery: Active recovery between work intervals (Zone 1-2)
        - rest: Standing/walking rest between hard sets (Zone 1)
        - cooldown: Low-intensity wind-down (Zone 1-2)

        **HEART RATE ZONES:**
        - Zone 1: Very Easy (50-60% max HR) - Recovery/warm-up
        - Zone 2: Easy (60-70% max HR) - Aerobic base building
        - Zone 3: Moderate (70-80% max HR) - Aerobic endurance
        - Zone 4: Hard (80-90% max HR) - Threshold/tempo
        - Zone 5: Very Hard (90-100% max HR) - Maximum effort/intervals

        **REPEAT_COUNT FOR INTERVALS:**
        • Use `repeat_count` to avoid repetitive segment definitions
        • Consecutive segments with the same repeat_count are grouped and repeated together
        • Default is 1 (no repetition), max is 20
        • Example: work + recovery with repeat_count: 4 creates 4 work/recovery pairs

        **EXAMPLES:**

        Simple session (single segment):
        ```json
        {
          "name": "Easy Run",
          "sport_type": "running",
          "segments": [
            {"segment_order": 1, "segment_type": "work", "target_type": "time", "target_value": 1800, "target_heart_rate_zone": 2}
          ]
        }
        ```

        Interval session using repeat_count (PREFERRED - compact):
        ```json
        {
          "name": "4x1km Intervals",
          "sport_type": "running",
          "segments": [
            {"segment_order": 1, "segment_type": "warmup", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2},
            {"segment_order": 2, "segment_type": "work", "target_type": "distance", "target_value": 1000, "target_heart_rate_zone": 5, "repeat_count": 4},
            {"segment_order": 3, "segment_type": "recovery", "target_type": "time", "target_value": 90, "target_heart_rate_zone": 2, "repeat_count": 4},
            {"segment_order": 4, "segment_type": "cooldown", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2}
          ]
        }
        ```
        This creates: warmup → (work + recovery) × 4 → cooldown = 10 segments during tracking

        Pyramid intervals (varied repeat counts):
        ```json
        {
          "name": "Pyramid Intervals",
          "sport_type": "running",
          "segments": [
            {"segment_order": 1, "segment_type": "warmup", "target_type": "time", "target_value": 600, "target_heart_rate_zone": 2},
            {"segment_order": 2, "segment_type": "work", "target_type": "distance", "target_value": 400, "target_heart_rate_zone": 4, "repeat_count": 2},
            {"segment_order": 3, "segment_type": "recovery", "target_type": "time", "target_value": 60, "target_heart_rate_zone": 2, "repeat_count": 2},
            {"segment_order": 4, "segment_type": "work", "target_type": "distance", "target_value": 800, "target_heart_rate_zone": 5},
            {"segment_order": 5, "segment_type": "recovery", "target_type": "time", "target_value": 120, "target_heart_rate_zone": 2},
            {"segment_order": 6, "segment_type": "cooldown", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2}
          ]
        }
        ```

        • Vary session complexity (simple for easy days, multi-segment for structured workouts)
        • Choose sport_type based on user's goal, equipment, and preferences
        • Use repeat_count to keep interval definitions compact and readable
        """
        )

    if include_mixed:
        sections.append(
            """
        **MIXED days:** strength exercises + endurance session(s)
        • Balance modalities to avoid interference
        • Consider recovery demands
        • Use execution_order to sequence training: strength exercises first (typically 1, 2, 3...), then endurance sessions (continue numbering)
        • Example: Bench Press (1), Cable Fly (2), Long Run (3) - strength first, then endurance
        """
        )

    sections.append(
        """
        **REST days:** training_type="rest", is_rest_day=true, empty exercise/session arrays
        """
    )

    return "\n".join(section.strip("\n") for section in sections if section)


def get_justification_requirements() -> str:
    """Shared section with all justification length requirements."""
    return """
        **JUSTIFICATION TEXT REQUIREMENTS (BE CONCISE):**
        
        • **Plan title (3-5 words):**
          - Short phase name (e.g., "Foundation Building Phase", "Base Endurance Development")
        
        • **Plan summary (MAX 25 words, 2 sentences):**
          - Brief overview of what this training phase accomplishes
          
        • **Plan justification (MAX 40 words, ~3 sentences):**
          - Explain the training approach and philosophy
          - How this week's training accomplishes their goal
          - Keep it focused and actionable
          
        • **Weekly justification (MAX 30 words, ~2 sentences):**
          - This week's training focus and purpose
          - How it progresses toward their goal
          
        • **Daily justification (MAX 20 words, 1 sentence):**
          - Today's specific training focus and what it develops
    """


def get_training_principles() -> str:
    """Shared section with core training principles."""
    return """
        **TRAINING PRINCIPLES:**
        ✓ Progressive Overload - gradual difficulty increases
        ✓ Variety - prevent plateaus, vary exercises and sessions week-to-week
        ✓ Specificity - matches goal requirements
        ✓ Recovery - adequate rest between hard sessions
        ✓ Individualization - respects constraints/preferences
    """


def get_exercise_metadata_requirements(
    include_strength_elements: bool = True,
    personal_info: PersonalInfo = None,
) -> str:
    """
    Get the exercise metadata requirements section for prompts.
    
    Note: main_muscle, equipment, sport_type, unit are all enforced by Pydantic schema
    (via Literal types for Gemini). Only the exercise_name formatting guidance is needed.
    """
    if not include_strength_elements:
        return ""

    return """
        **EXERCISE METADATA REQUIREMENTS:**
        
        When creating or modifying STRENGTH exercises:
        
        **⚠️ CRITICAL: EXERCISE NAME FORMATTING (MUST FOLLOW TO AVOID MATCHING FAILURES):**
        • exercise_name: Use ONLY the standard, widely recognized exercise name WITHOUT any equipment prefix, suffix, or modifier
        • Equipment type MUST be specified separately in the 'equipment' field - NEVER include it in the exercise name
        • Use the most common, standard names that will successfully match exercises in the database
        • ✅ CORRECT examples: 
          - "Bench Press" (NOT "Barbell Bench Press" or "Dumbbell Bench Press")
          - "Row" (NOT "Barbell Row" or "Cable Row")
          - "Squat" (NOT "Barbell Squat" or "Back Squat" unless that's the standard name)
          - "Deadlift" (NOT "Barbell Deadlift")
          - "Lateral Raise" (NOT "Dumbbell Lateral Raise")
          - "Chest Fly" (NOT "Dumbbell Fly" or "Cable Fly")
          - "Shoulder Press" (NOT "Overhead Press" or "Barbell Overhead Press")
        • ❌ WRONG examples (will cause matching failures):
          - "Barbell Row" → Use "Row" instead
          - "Dumbbell Lateral Raise" → Use "Lateral Raise" instead
          - "Barbell Bench Press" → Use "Bench Press" instead
          - "Overhead Press" → Use "Shoulder Press" instead
          - "Seated Calf Raise (Machine)" → Use "Calf Raise" instead
          - "Cable Fly" → Use "Chest Fly" instead
        • The exercise matching system searches by name and equipment separately - including equipment in the name prevents successful matching
        • main_muscle and equipment: Schema validation ensures only valid Enum values are accepted
    """


def get_supplemental_training_scheduling() -> str:
    """Shared section for scheduling around existing sport commitments."""
    return """
        **SUPPLEMENTAL TRAINING SCHEDULING (for sport athletes):**
        If user has existing sport training commitments (e.g., "football practice Tuesday & Saturday", "tennis matches on Wednesdays"):
        • MARK those days as REST days in our program (training_type="rest", is_rest_day=true)
        • Their sport training IS their training for that day - we don't add to it
        • Schedule our strength/conditioning work on their OFF days from sport
        • Example: If they have football Tuesday/Saturday → Mark Tuesday/Saturday as rest → Schedule our training on the other days
        • Keep total weekly volume manageable to support (not interfere with) sport performance
        • Do NOT schedule high-intensity strength work the day before games/matches
    """
