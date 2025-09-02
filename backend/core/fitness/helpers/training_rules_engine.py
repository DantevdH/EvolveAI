"""
Training Rules Engine

A comprehensive system for generating rule-based training prompts based on user experience level,
fitness goals, and training parameters. This engine provides evidence-based training guidelines
that can be integrated into workout plan generation.
"""

from typing import Dict, Any
from .schemas import UserProfileSchema


class TrainingRulesEngine:
    """
    Engine for generating evidence-based training rules and guidelines.
    
    This class provides specific training parameters, periodization strategies,
    and exercise recommendations based on user profiles and fitness goals.
    """
    
    def __init__(self):
        """Initialize the Training Rules Engine."""
        pass
    
    def get_experience_level_rules(self, experience_level: str) -> str:
        """
        Get specific training rules and guidelines based on experience level.
        
        Args:
            experience_level: User's experience level (Beginner, Intermediate, Advanced)
            
        Returns:
            Formatted string with experience-specific rules
        """
        rules = {
            "Beginner": """
**BEGINNER TRAINING RULES (0-6 months experience):**

🎯 **Training Focus:**
- Learn proper exercise technique and form
- Build general conditioning and work capacity
- Establish consistent training habits
- Focus on full-body movements and basic strength

📊 **Training Parameters:**
- **Training Structure**: Full-body routines targeting all major muscle groups
- **Exercise Count**: 3-4 exercises per workout (minimum 3)
- **Sets**: 2-3 sets per exercise

🔄 **Progression Strategy:**
- Start with bodyweight or very light weights
- Focus on mastering movement patterns
- Progress by adding weight when 12 reps are achievable for all sets
- Increase weight by 2.5-5% when progression criteria are met
- Use simple linear progression (add weight each week)

🏋️ **Exercise Selection & Structure:**
- **Primary**: Compound movements (multi-joint exercises)
- **Secondary**: Bodyweight exercises for foundation
- **Accessory**: Machine-based exercises for isolation
- **Full-Body Structure Examples**:
  * Day 1: Squat, Bench Press, Row, Plank
  * Day 2: Deadlift, Overhead Press, Pull-up, Crunches
  * Day 3: Lunges, Push-ups, Dips, Side Planks

⚠️ **Beginner Exercise Combination Rules:**
- **ALLOWED**: Combine different movement types (upper + lower body)
  * Example: Bench Press (upper) + Leg Press (lower) = ✅ GOOD
  * Example: Squat (lower) + Overhead Press (upper) = ✅ GOOD
- **FOCUS**: One major movement per muscle group per workout

**WORKOUT STRUCTURE REQUIREMENTS:**
- **Exercise Balance**: 70% big muscle groups, 30% smaller muscles/variations
- **Big Muscles (70%)**: Chest, Back, Quadriceps, Hamstrings, Shoulders
- **Smaller Muscles (30%)**: Biceps, Triceps, Neck, Calves, or muscle variations
- **Rest Day Distribution**: Rest days MUST be evenly distributed throughout the week
- **Example**: Monday (Full Body), Tuesday (Rest), Wednesday (Full Body), Thursday (Rest), Friday (Full Body)

⚠️ **Beginner Limitations:**
- Avoid complex exercises or advanced techniques
- No periodization needed - focus on consistency
- Emphasize form over weight or speed
- Keep workouts simple and manageable
""",
            
            "Intermediate": """
**INTERMEDIATE TRAINING RULES (6+ months experience):**

🎯 **Training Focus:**
- Introduce periodization concepts
- Develop training variety and specialization
- Improve exercise selection and programming
- Build work capacity and recovery ability

📊 **Training Parameters:**
- **Training Structure**: Push/Pull/Legs (PPL) split
- **Exercise Count**: 4-6 exercises per workout (minimum 4)
- **Sets**: 3-4 sets per exercise

🔄 **Progression Strategy:**
- Use weekly undulating periodization (WUP) or linear progression
- Cycle through different rep ranges within the week
- Implement block periodization (4-8 week phases)
- Progress by adding weight when rep goals are exceeded
- Use deload weeks every 4-6 weeks

🏋️ **Exercise Selection & Structure:**
- **Primary**: Compound movements with variations
- **Secondary**: Isolation exercises for weak points
- **Advanced Techniques**: Can include drop sets, supersets for variety

⚠️ **Intermediate Training Guidelines:**
- Can combine different movement types (upper + lower body exercises)
- Avoid combining major compound movements that target same muscle groups
- Focus on progressive overload and technique refinement
- Include variety to prevent plateaus

""",
            
            "Advanced": """
**ADVANCED TRAINING RULES (Years of experience):**

🎯 **Training Focus:**
- Maximize performance and specialization
- Fine-tune periodization and programming
- Optimize recovery and adaptation
- Target specific muscle groups and movement patterns

📊 **Training Parameters:**
- **Training Structure**: Push/Pull/Legs (PPL) split
- **Exercise Count**: 6-8 exercises per workout (minimum 6)
- **Sets**: 4-6 sets per exercise

🔄 **Progression Strategy:**
- Use block periodization with focused phases
- Implement daily undulating periodization (DUP)
- Use advanced techniques (drop sets, supersets, rest-pause)
- Monitor and adjust based on performance metrics
- Use planned deloads and tapering periods

📈 **Training Phases (Block Periodization):**
- Accumulation Phase: High volume, moderate loads (50-70% 1RM, 8-12 reps)
- Transmutation Phase: Higher loads, lower volume (75-90% 1RM, 3-6 reps)
- Realization Phase: Peak performance (90-100% 1RM, 1-3 reps)

🏋️ **Exercise Selection & Structure:**
- **Primary Movements**: 2-3 compound exercises per muscle group
- **Secondary Movements**: 2-3 assistance/isolation exercises
- **Advanced Techniques**: Chains, bands, specialty bars, tempo variations
- **PPL Training Structure** (6-8 exercises per workout):
  * Push Day: Chest, Shoulders, Triceps
  * Pull Day: Back, Biceps
  * Legs Day: Quadriceps, Hamstrings, Glutes
- **Advanced Options**: Can repeat PPL cycle twice per week (PPLPPL) for higher frequency

⚠️ **CRITICAL RULES FOR ADVANCED TRAINING:**
1. **NEVER combine major compound movements** (squat + bench) on same day
2. **Separate push and pull movements** across different days
3. **Use proper exercise sequencing** (compound → isolation)
4. **Implement adequate rest periods** between similar movement patterns
5. **Focus on movement quality** over quantity


"""
        }
        
        # Add consolidated workout structure rules for all levels
        experience_rules = rules.get(experience_level, rules["Intermediate"])
        
        # Add unified PPL structure for intermediate and advanced
        if experience_level in ["Intermediate", "Advanced"]:
            ppl_structure = """

**🔄 PUSH/PULL/LEGS (PPL) SPLIT STRUCTURE:**
- **(Push)**: Chest, Shoulders, Triceps
- **(Pull)**: Back, Biceps  
- **(Legs)**: Quadriceps, Hamstrings, Glutes (and occasionally Calves)

**📋 UNIVERSAL WORKOUT STRUCTURE REQUIREMENTS:**
- **Exercise Balance**: 70% big muscle groups, 30% smaller muscles/variations
- **Big Muscles (70%)**: Chest, Back, Quadriceps, Hamstrings, Shoulders
- **Smaller Muscles (30%)**: Biceps, Triceps, Neck, Calves, or muscle variations
- **Rest Day Distribution**: Rest days MUST be evenly distributed throughout the week
"""
            experience_rules += ppl_structure
        else:  # Beginner - add just the workout structure requirements
            workout_structure = """

**📋 UNIVERSAL WORKOUT STRUCTURE REQUIREMENTS:**
- **Exercise Balance**: 70% big muscle groups, 30% smaller muscles/variations
- **Big Muscles (70%)**: Chest, Back, Quadriceps, Hamstrings, Shoulders
- **Smaller Muscles (30%)**: Biceps, Triceps, Neck, Calves, or muscle variations
- **Rest Day Distribution**: Rest days MUST be evenly distributed throughout the week
"""
            experience_rules += workout_structure
            
        return experience_rules
    
    def get_goal_specific_rules(self, primary_goal: str, experience_level: str) -> str:
        """
        Get goal-specific training rules and guidelines.
        
        Args:
            primary_goal: User's primary fitness goal
            experience_level: User's experience level
            
        Returns:
            Formatted string with goal-specific rules
        """
        goal_rules = {
            "Increase Strength": {
                "Beginner": """
**STRENGTH TRAINING FOR BEGINNERS:**

🎯 **Primary Focus:**
- Build foundational strength through compound movements
- Develop proper lifting technique and form
- Establish neural pathways for strength development

📊 **Training Parameters:**
- Reps: 5-8 reps per set (builds strength without excessive fatigue)
- Load: 70-80% of 1RM (challenging but manageable)
- Sets: 3-4 sets per exercise
- Rest: 1-2 minutes between sets (adequate recovery)


🔄 **Progression:**
- Add weight when 8 reps are achieved for all sets
- Increase by 2.5-5% per progression
- Focus on consistent form over weight increases
""",
                
                "Intermediate": """
**STRENGTH TRAINING FOR INTERMEDIATES:**

🎯 **Primary Focus:**
- Maximize strength gains through periodization
- Develop power and explosive strength
- Build work capacity and recovery ability

📊 **Training Parameters:**
- Reps: 3-6 reps per set (optimal for strength development)
- Load: 80-90% of 1RM (heavy but sustainable)
- Sets: 4-5 sets per exercise
- Rest: 1-2 minutes between sets (full recovery)

🔄 **Progression:**
- Use weekly undulating periodization
- Implement deload weeks every 4-6 weeks
- Progress by adding weight when rep goals are exceeded
""",
                
                "Advanced": """
**STRENGTH TRAINING FOR ADVANCED:**

🎯 **Primary Focus:**
- Peak strength performance
- Optimize neural efficiency
- Maximize force production
- Develop sport-specific or competition strength

📊 **Training Parameters:**
- **Reps**: 1-5 reps per set (maximal strength focus)
- **Load**: 85-100% of 1RM (near maximal loads)
- **Sets**: 5-6 sets per exercise
- **Rest**: 1-3 minutes between sets (complete recovery)
- **Frequency**: 4-5 days per week with proper recovery


🔄 **Progression Strategy:**
- Use block periodization with focused strength phases
- Implement daily undulating periodization (DUP)
- Use advanced techniques (chains, bands, specialty bars)
- Monitor performance metrics and adjust accordingly
- Implement tapering periods for peak performance
"""
            },
            
            "Muscle Building": {
                "Beginner": """
**HYPERTROPHY TRAINING FOR BEGINNERS:**

🎯 **Primary Focus:**
- Build muscle mass through progressive overload
- Learn proper exercise execution
- Establish training consistency

📊 **Training Parameters:**
- Reps: 8-12 reps per set (optimal for muscle growth)
- Load: 65-75% of 1RM (moderate intensity)
- Sets: 3 sets per exercise
- Rest: 60-90 seconds between sets

🔄 **Progression:**
- Add weight when 12 reps are achieved
- Increase by 2.5-5% per progression
- Focus on feeling the muscle work
""",
                
                "Intermediate": """
**HYPERTROPHY TRAINING FOR INTERMEDIATES:**

🎯 **Primary Focus:**
- Maximize muscle growth through varied stimuli
- Develop training variety and specialization
- Optimize volume and intensity balance

📊 **Training Parameters:**
- Reps: 6-12 reps per set (hypertrophy range)
- Load: 70-85% of 1RM (moderate to heavy)
- Sets: 4-5 sets per exercise
- Rest: 1-2 minutes between sets

🔄 **Progression:**
- Use weekly undulating periodization
- Vary rep ranges within the week
- Implement deload weeks every 4-6 weeks
""",
                
                "Advanced": """
**HYPERTROPHY TRAINING FOR ADVANCED:**

🎯 **Primary Focus:**
- Maximize muscle growth through advanced techniques
- Optimize training stimulus and recovery
- Target specific muscle groups and weak points

📊 **Training Parameters:**
- Reps: 6-15 reps per set (full hypertrophy spectrum)
- Load: 60-90% of 1RM (varies by technique)
- Sets: 5-6 sets per exercise
- Rest: 1-2 minutes between sets (varies by technique)

🔄 **Progression:**
- Use block periodization with hypertrophy focus
- Implement advanced intensity techniques
- Monitor and adjust based on recovery and progress
"""
            },
            
            "Weight Loss": {
                "Beginner": """
**WEIGHT LOSS TRAINING FOR BEGINNERS:**

🎯 **Primary Focus:**
- Build lean muscle mass to boost metabolism
- Learn proper exercise form
- Establish consistent training habits

📊 **Training Parameters:**
- Reps: 10-15 reps per set (higher reps for calorie burn)
- Load: 60-70% of 1RM (moderate intensity)
- Sets: 2-3 sets per exercise
- Rest: 30-60 seconds between sets (shorter rest for intensity)

🔄 **Progression:**
- Focus on increasing reps before weight
- Add weight gradually when 15 reps are achieved
- Emphasize consistency over intensity initially
""",
                
                "Intermediate": """
**WEIGHT LOSS TRAINING FOR INTERMEDIATES:**

🎯 **Primary Focus:**
- Maximize calorie burn and muscle preservation
- Improve cardiovascular fitness
- Develop training variety and intensity

📊 **Training Parameters:**
- Reps: 8-15 reps per set (varies by exercise)
- Load: 65-80% of 1RM (moderate to heavy)
- Sets: 3-4 sets per exercise
- Rest: 45-90 seconds between sets

🔄 **Progression:**
- Use circuit training for higher intensity
- Implement supersets to reduce rest time
- Progress by increasing weight and reducing rest
""",
                
                "Advanced": """
**WEIGHT LOSS TRAINING FOR ADVANCED:**

🎯 **Primary Focus:**
- Optimize fat loss while preserving muscle
- Maximize training efficiency and intensity
- Target specific body composition goals

📊 **Training Parameters:**
- Reps: 6-15 reps per set (varies by technique)
- Load: 60-85% of 1RM (varies by technique)
- Sets: 4-5 sets per exercise
- Rest: 30-90 seconds between sets (varies by technique)

🏋️ **Exercise Selection:**
- Primary: Advanced compound and isolation movements
- Secondary: Specialized techniques and variations
- Include: Advanced techniques (giant sets, circuit training)

🔄 **Progression:**
- Use advanced intensity techniques
- Implement strategic deloads
- Monitor body composition and adjust accordingly
"""
            },
            
            "Improve Endurance": {
                "Beginner": """
**ENDURANCE TRAINING FOR BEGINNERS:**

🎯 **Primary Focus:**
- Build basic cardiovascular fitness
- Develop muscular endurance
- Establish consistent training habits

📊 **Training Parameters:**
- Reps: 12-20 reps per set (high reps for endurance)
- Load: 50-65% of 1RM (light to moderate intensity)
- Sets: 2-3 sets per exercise
- Rest: 30-60 seconds between sets (short rest for endurance)

🔄 **Progression:**
- Focus on increasing reps and reducing rest
- Add weight gradually when 20 reps are achieved
- Emphasize consistency and gradual improvement
""",
                
                "Intermediate": """
**ENDURANCE TRAINING FOR INTERMEDIATES:**

🎯 **Primary Focus:**
- Improve muscular and cardiovascular endurance
- Develop training variety and intensity
- Build work capacity and recovery ability

📊 **Training Parameters:**
- Reps: 12-25 reps per set (varies by exercise)
- Load: 55-75% of 1RM (moderate intensity)
- Sets: 3-4 sets per exercise
- Rest: 45-90 seconds between sets

🔄 **Progression:**
- Use circuit training for higher intensity
- Implement supersets to reduce rest time
- Progress by increasing weight and reducing rest
""",
                
                "Advanced": """
**ENDURANCE TRAINING FOR ADVANCED:**

🎯 **Primary Focus:**
- Maximize endurance performance
- Optimize training efficiency and intensity
- Target specific endurance goals

📊 **Training Parameters:**
- Reps: 10-30 reps per set (varies by technique)
- Load: 50-80% of 1RM (varies by technique)
- Sets: 4-5 sets per exercise
- Rest: 30-120 seconds between sets (varies by technique)

🔄 **Progression:**
- Use advanced intensity techniques
- Implement strategic deloads
- Monitor performance and adjust accordingly
"""
            },
            
            "General Fitness": {
                "Beginner": """
**GENERAL FITNESS TRAINING FOR BEGINNERS:**

🎯 **Primary Focus:**
- Build overall fitness foundation
- Improve general health and wellness
- Establish consistent exercise habits
- Develop basic strength and endurance

📊 **Training Parameters:**
- Reps: 8-15 reps per set (balanced approach)
- Load: 60-75% of 1RM (moderate intensity)
- Sets: 2-3 sets per exercise
- Rest: 60-90 seconds between sets

🔄 **Progression:**
- Focus on consistency and gradual improvement
- Add weight when 15 reps are achieved
- Emphasize proper form and full range of motion
""",
                
                "Intermediate": """
**GENERAL FITNESS TRAINING FOR INTERMEDIATES:**

🎯 **Primary Focus:**
- Enhance overall fitness levels
- Improve strength, endurance, and flexibility
- Develop training variety and balance
- Optimize health and performance

📊 **Training Parameters:**
- Reps: 6-15 reps per set (varies by exercise type)
- Load: 65-80% of 1RM (moderate to challenging)
- Sets: 3-4 sets per exercise
- Rest: 45-90 seconds between sets

🔄 **Progression:**
- Use varied training approaches
- Implement progressive overload
- Include deload weeks every 4-6 weeks
""",
                
                "Advanced": """
**GENERAL FITNESS TRAINING FOR ADVANCED:**

🎯 **Primary Focus:**
- Optimize overall fitness performance
- Maintain high-level conditioning
- Fine-tune training balance
- Prevent plateaus and overtraining

📊 **Training Parameters:**
- Reps: 5-20 reps per set (full spectrum utilization)
- Load: 55-85% of 1RM (varies by exercise type)
- Sets: 4-5 sets per exercise
- Rest: 30-120 seconds (varies by intensity)


🔄 **Progression:**
- Use advanced periodization techniques
- Implement strategic deloads
- Monitor and adjust based on recovery and goals
"""
            },
            
            "Power & Speed": {
                "Beginner": """
**POWER & SPEED TRAINING FOR BEGINNERS:**

🎯 **Primary Focus:**
- Learn explosive movement patterns
- Develop basic power and speed foundation
- Establish proper technique for plyometric exercises
- Build coordination and athleticism

📊 **Training Parameters:**
- Reps: 3-6 reps per set (power focus)
- Load: 60-75% of 1RM (moderate intensity for technique)
- Sets: 2-3 sets per exercise
- Rest: 2-3 minutes between sets (full recovery for power)


🔄 **Progression:**
- Master basic movement patterns first
- Progress from bodyweight to weighted movements
- Focus on quality over quantity
- Emphasize proper landing technique
""",
                
                "Intermediate": """
**POWER & SPEED TRAINING FOR INTERMEDIATES:**

🎯 **Primary Focus:**
- Develop explosive power and speed
- Improve athletic performance
- Enhance neuromuscular coordination
- Build power endurance

📊 **Training Parameters:**
- Reps: 2-5 reps per set (power focus)
- Load: 70-85% of 1RM (challenging but maintainable)
- Sets: 3-5 sets per exercise
- Rest: 2-4 minutes between sets (full recovery for power)


🔄 **Progression:**
- Use weekly undulating periodization
- Implement power-specific deloads
- Progress by increasing load and complexity
- Monitor power output and technique
""",
                
                "Advanced": """
**POWER & SPEED TRAINING FOR ADVANCED:**

🎯 **Primary Focus:**
- Maximize power and speed performance
- Optimize athletic potential
- Fine-tune power development
- Peak for competition or performance

📊 **Training Parameters:**
- Reps: 1-3 reps per set (maximal power focus)
- Load: 80-95% of 1RM (near maximal for power)
- Sets: 5-6 sets per exercise
- Rest: 3-5 minutes between sets (complete recovery)

🔄 **Progression:**
- Use block periodization with power focus
- Implement tapering for peak performance
- Monitor power metrics and adjust accordingly
- Include active recovery and mobility work
"""
            }
        }
        
        # Get the specific rules for the goal and experience level
        if primary_goal in goal_rules:
            if experience_level in goal_rules[primary_goal]:
                return goal_rules[primary_goal][experience_level]
            else:
                # Fallback to intermediate if specific level not found
                return goal_rules[primary_goal].get("Intermediate", goal_rules[primary_goal].get("Beginner", ""))
        else:
            # Fallback for unknown goals
            return f"""
**GENERAL TRAINING RULES FOR {experience_level.upper()}:**

🎯 **Training Focus:**
- Build overall fitness and strength
- Develop proper exercise technique
- Establish consistent training habits

📊 **Training Parameters:**
- Reps: 8-12 reps per set
- Load: 65-80% of 1RM
- Sets: 3-4 sets per exercise
- Rest: 60-120 seconds between sets

🏋️ **Exercise Selection:**
- Primary: Compound movements
- Secondary: Basic isolation exercises
- Focus: Full-body workouts
"""
    
    def get_periodization_strategy(self, experience_level: str, primary_goal: str) -> str:
        """
        Get periodization strategy based on experience level and goal.
        
        Args:
            experience_level: User's experience level
            primary_goal: User's primary fitness goal
            
        Returns:
            Formatted string with periodization strategy
        """
        if experience_level == "Beginner":
            return """
**PERIODIZATION STRATEGY FOR BEGINNERS:**

📅 **Simple Linear Progression:**
- Week 1-4: Focus on learning form and building base
- Week 5-8: Introduce progressive overload
- Week 9-12: Consolidate gains and refine technique

🔄 **Progression Pattern:**
- Add weight when rep goals are achieved
- Focus on consistent improvement
- No complex periodization needed
- Simple weekly progression model

🔄 **Exercise Variation for Beginners:**
- **Foundational Exercises (Keep 70% consistent)**: Basic compound movements
- **Variation Approach**: Progress from simpler to more complex versions of the same movement pattern
- **Progression Strategy**: Bodyweight → Light resistance → Standard resistance → Complexity increases
"""
        
        elif experience_level == "Intermediate":
            return """
**PERIODIZATION STRATEGY FOR INTERMEDIATES:**

📅 **Weekly Undulating Periodization (WUP):**
- Monday: Hypertrophy focus (8-12 reps, 70-80% 1RM)
- Wednesday: Strength focus (3-6 reps, 80-90% 1RM)
- Friday: Endurance focus (12-15 reps, 60-70% 1RM)

🔄 **4-Week Mesocycle:**
- Week 1-2: Build volume and technique
- Week 3: Increase intensity
- Week 4: Deload and recovery

📊 **Progression Strategy:**
- Vary rep ranges within the week
- Implement planned deloads
- Use exercise variations for variety

🔄 **Exercise Variation for Intermediates:**
- **Foundational Exercises (Keep 60% consistent)**: Primary compound movements
- **Variation Strategy**: Modify angles, grips, stances, or equipment while maintaining movement patterns
- **Rotation Pattern**: Change 2-3 exercises per week while keeping core movements consistent
- **Variation Types**: Angle changes, equipment swaps, grip modifications, unilateral variations
"""
        
        else:  # Advanced
            return """
**PERIODIZATION STRATEGY FOR ADVANCED:**

📅 **Block Periodization:**
- Accumulation Phase (4-6 weeks): High volume, moderate loads
- Transmutation Phase (3-4 weeks): Higher loads, lower volume
- Realization Phase (2-3 weeks): Peak performance, maximal loads

🔄 **Daily Undulating Periodization (DUP) with PPL Structure:**
- **Day 1 (Push)**: Power focus (1-3 reps, 85-95% 1RM)
  * Bench Press, Overhead Press, Explosive movements
- **Day 2 (Pull)**: Strength focus (3-6 reps, 80-90% 1RM)
  * Deadlifts, Pull-ups, Rows
- **Day 3 (Legs)**: Hypertrophy focus (6-12 reps, 70-85% 1RM)
  * Squats, Leg Press, Assistance work
- **Day 4 (Power)**: Power/Strength focus (1-5 reps, 80-95% 1RM)
  * Olympic lifts, Explosive variations
- **Day 5 (Weak Points)**: Specialized focus (3-8 reps, 70-90% 1RM)
  * Target specific weaknesses, accessory work

📊 **Advanced Techniques:**
- Planned deloads every 3-4 weeks
- Tapering periods for peak performance
- Advanced intensity techniques (chains, bands, specialty bars)
- Performance monitoring and adjustment
- **MANDATORY**: Use PPL split, NEVER full-body workouts

🔄 **Exercise Variation for Advanced:**
- **Foundational Exercises (Keep 50% consistent)**: Competition movements and primary compounds
- **Systematic Variation**: Use training phase-specific variations aligned with periodization goals
- **Advanced Techniques**: Tempo modifications, pause reps, accommodating resistance, specialty equipment
- **Periodized Selection**: Exercise complexity should match training phase (accumulation vs. intensification)
- **Competition Timing**: Return to competition-specific movements 4-6 weeks before peak events
"""
    
    def generate_user_specific_rules(self, user_profile: UserProfileSchema) -> str:
        """
        Generate comprehensive user-specific training rules.
        
        Args:
            user_profile: User profile data
            
        Returns:
            Complete string with all user-specific training rules
        """
        experience_rules = self.get_experience_level_rules(user_profile.experience_level)
        goal_rules = self.get_goal_specific_rules(user_profile.primary_goal, user_profile.experience_level)
        periodization_strategy = self.get_periodization_strategy(user_profile.experience_level, user_profile.primary_goal)
        
        # Combine all rules
        combined_rules = f"""
**USER-SPECIFIC TRAINING RULES:**

{experience_rules}

{goal_rules}

{periodization_strategy}
"""
        
        return combined_rules
    
    def generate_personalized_instructions(self, user_profile: UserProfileSchema) -> str:
        """
        Generate personalized instructions for the user's specific profile.
        
        Args:
            user_profile: User profile data
            
        Returns:
            Formatted string with personalized instructions
        """
        # Get specific requirements based on experience level and goal
        if user_profile.experience_level == "Advanced":
            if user_profile.primary_goal == "Increase Strength":
                specific_requirements = """
🏋️ **ADVANCED STRENGTH TRAINING REQUIREMENTS (MANDATORY):**

**TRAINING STRUCTURE (NON-NEGOTIABLE):**
- **MANDATORY**: Use Push/Pull/Legs (PPL) split structure
- **NEVER use full-body workouts** - this is for beginners only
- **Exercise Count**: MINIMUM 6 exercises per workout (6-8 exercises)


**PPL STRUCTURE (MUST FOLLOW EXACTLY):**
- **Day 1 (Push)**: Chest, Shoulders, Triceps - 6-8 exercises
  * Primary: Bench Press, Overhead Press
  * Secondary: Incline Press, Dips, Lateral Raises
  * Accessory: Tricep Extensions, Chest Flyes
- **Day 2 (Pull)**: Back, Biceps, Rear Delts - 6-8 exercises
  * Primary: Deadlifts, Pull-ups, Rows
  * Secondary: Chin-ups, Face Pulls, Shrugs
  * Accessory: Bicep Curls, Rear Delt Flyes
- **Day 3 (Legs)**: Quads, Hamstrings, Glutes - 6-8 exercises
  * Primary: Squats, Romanian Deadlifts
  * Secondary: Leg Press, Lunges, Step-ups
  * Accessory: Leg Extensions, Leg Curls, Calf Raises
- **Day 4 (Power)**: Power/Strength Focus - 4-6 exercises
- **Day 5 (Weak Points)**: Specialized focus - 4-6 exercises

**Rep Schemes (STRICTLY ENFORCED):**
- **Primary movements**: 1-5 reps (maximal strength focus)
- **Secondary movements**: 3-6 reps (strength development)
- **NO exercises with 8+ reps** for strength focus
- **Load**: 85-100% of 1RM for primary movements

**Exercise Selection Rules:**
- **Primary**: Competition lifts (bench, squat, deadlift) and variations
- **Secondary**: Assistance exercises for weak points
- **Advanced Techniques**: Chains, bands, specialty bars, tempo variations
- **NO full-body workouts** for advanced strength training
- **NO conflicting movements** on same day (squat + bench = FORBIDDEN)

**CRITICAL VIOLATIONS TO AVOID:**
❌ Full-body workouts
❌ Squat + Bench on same day
❌ Less than 6 exercises per workout
❌ Rep schemes above 6 for primary movements
❌ Mixed push/pull movements on same day
❌ Rest days clustered at end of week
❌ Imbalanced exercise selection (not 70% big muscles, 30% smaller)
"""
            else:
                specific_requirements = """
🏋️ **ADVANCED TRAINING REQUIREMENTS (MANDATORY):**
- **MANDATORY**: Use specialized splits, NOT full-body workouts
- MINIMUM 6 exercises per workout (6-8 exercises as per rules)
- Use Push/Pull/Legs (PPL) or Body Part Specialization
- Follow the specific rep schemes for your goal
- Implement proper periodization strategies
"""
        elif user_profile.experience_level == "Intermediate":
            specific_requirements = """
🏋️ **INTERMEDIATE TRAINING REQUIREMENTS (MANDATORY):**

**TRAINING STRUCTURE:**
- **Training Structure**: Push/Pull/Legs split
- **Exercise Count**: MINIMUM 4 exercises per workout (4-6 exercises)
"""
        else:  # Beginner
            specific_requirements = """
🏋️ **BEGINNER TRAINING REQUIREMENTS (MANDATORY):**

**TRAINING STRUCTURE (SIMPLE AND SAFE):**
- **Exercise Count**: MINIMUM 3 exercises per workout (3-4 exercises)
- **Training Structure**: Full-body routines targeting all major muscle groups

- **Focus**: Learn proper form and build basic strength



**EXAMPLE FULL-BODY STRUCTURES:**
- Day 1: Squat, Bench Press, Row, Plank
- Day 2: Deadlift, Overhead Press, Pull-up, Crunches
- Day 3: Lunges, Push-ups, Dips, Side Planks
"""
        
        return f"""
**SPECIFIC INSTRUCTIONS FOR {user_profile.experience_level.upper()} {user_profile.primary_goal.upper().replace('_', ' ')} TRAINING:**

🎯 **Your Training Focus:**
- Experience Level: {user_profile.experience_level}
- Primary Goal: {user_profile.primary_goal.replace('_', ' ')}

- Session Duration: {user_profile.minutes_per_session} minutes per session
- Available Equipment: {user_profile.equipment}

{specific_requirements}

📋 **CRITICAL RULES TO FOLLOW (NO EXCEPTIONS):**
1. **EXERCISE COUNT**: You MUST include the minimum number of exercises specified above
2. **REP SCHEMES**: Use ONLY the rep ranges specified for your level and goal
3. **TRAINING SPLIT**: Follow the exact split structure outlined above
4. **EXERCISE COMBINATIONS**: NEVER combine conflicting movements on the same day
5. **PERIODIZATION**: Implement the exact periodization strategy specified
6. **PROGRESSION**: Follow the progression guidelines precisely
7. **EXERCISE BALANCE**: 70% big muscles, 30% smaller muscles/variations
8. **REST DAY DISTRIBUTION**: Rest days MUST be evenly distributed throughout the week
9. **EXERCISE VARIATION**: MANDATORY weekly variation while maintaining foundational exercises

🔄 **MANDATORY EXERCISE VARIATION RULES:**

**CORE PRINCIPLE**: Vary exercises weekly while maintaining foundational movements for consistent progress.

**FOUNDATIONAL EXERCISE CONSISTENCY**:
- **Beginners**: Keep 70% of exercises consistent (core movements)
- **Intermediates**: Keep 60% of exercises consistent (primary lifts + accessories)
- **Advanced**: Keep 50% of exercises consistent (competition lifts + key compounds)

**WEEKLY VARIATION STRATEGY**:
- When multiple exercises target the same muscle groups, vary selections across weeks
- Use different angles, equipment, grips, or techniques while maintaining movement patterns
- Choose exercises based on user experience level, available equipment, and training goals
- Ensure balanced development through exercise variety within muscle groups

⚠️ **VIOLATION PENALTIES:**
- If you don't follow these rules, the workout plan will be REJECTED
- The user will NOT get a proper training program
- You MUST adhere to these specifications exactly

**WORKOUT PLAN VALIDATION CHECKLIST:**
Before submitting, verify:
□ Exercise count meets minimum requirements
□ Rep schemes match the specified ranges
□ Training split follows the correct structure
□ No conflicting exercise combinations
□ Periodization strategy is implemented
□ **EXERCISE VARIATION**: Weekly variation with foundational exercise consistency
□ All training rules are followed correctly

**REMEMBER:** These are NOT suggestions - they are MANDATORY requirements that MUST be followed exactly.
"""
