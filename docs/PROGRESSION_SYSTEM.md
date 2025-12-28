# Progression System Architecture

## Executive Summary

This document outlines a science-based progression system for EvolveAI that handles intensity progression for strength training (weights, 1RM estimation), endurance training (pace zones, heart rate zones, distance), and hybrid modalities. The system integrates with the existing AI-driven plan generation while adding rule-based autoregulation and progression logic.

---

## Current State

### What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Volume tracking (weight × reps × sets) | ✅ Client-side | `insightsAnalyticsService.ts` |
| Session RPE (1-5 scale) | ✅ Stored | `daily_training.session_rpe` |
| Daily feedback (1-5 stars) | ✅ Stored | `daily_training` |
| Recovery ACWR calculations | ✅ Client-side | `insightsAnalyticsService.ts` |
| `progression_lever` metadata | ✅ Metadata only | `weekly_schedules` table |
| HR zones 1-5 | ✅ Target + actual | `endurance_segment` |
| Pace tracking | ✅ Target + actual | `endurance_segment` |
| Exercise difficulty tier | ✅ Reference data | `exercises.difficulty` |

### What's Missing

- **Strength**: No 1RM estimation, no percentage-based intensity, no progression rules
- **Endurance**: No training load (TSS), no pace zone calculations, no race pace estimation
- **General**: No periodization models, no autoregulation, no deload detection

---

## Implementation Steps

### Priority: CRITICAL (Foundation)

These are non-negotiable for a functional progression system.

#### 1. Estimated 1RM (e1RM) Calculation & Storage

**Science Basis**: Brzycki, Epley, and Lombardi formulas are industry standard for 1RM estimation.

**Implementation**:

```
Database Changes:
- Add `strength_exercise.estimated_1rm` (numeric, nullable)
- Add `strength_exercise.e1rm_formula` (text: 'brzycki'|'epley'|'lombardi')
- Add `user_profiles.preferred_1rm_formula` (default: 'brzycki')

Formulas:
- Brzycki: 1RM = weight × (36 / (37 - reps))  [most accurate for reps < 10]
- Epley: 1RM = weight × (1 + reps/30)  [better for higher reps]
- Lombardi: 1RM = weight × reps^0.10
```

**Files to Modify**:
- `supabase/migrations/` - new migration
- `frontend/src/utils/progressionUtils.ts` - new file
- `frontend/src/services/trainingService.ts` - calculate on completion
- `backend/app/schemas/training_schemas.py` - add fields

**Acceptance Criteria**:
- [ ] e1RM calculated on every strength exercise completion
- [ ] Historical e1RM stored for trend analysis
- [ ] User can set preferred formula in settings

---

#### 2. Exercise Performance History Table

**Science Basis**: Progressive overload requires knowing previous performance to prescribe improvement.

**Implementation**:

```sql
CREATE TABLE exercise_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Performance data
  sets_completed INT NOT NULL,
  reps_per_set INT[] NOT NULL,  -- [8, 8, 7] for 3 sets
  weight_per_set NUMERIC[] NOT NULL,  -- [60, 60, 55] kg

  -- Calculated metrics
  total_volume NUMERIC NOT NULL,  -- sum(weight × reps)
  estimated_1rm NUMERIC,
  avg_rpe NUMERIC,  -- if set-level RPE captured

  -- Context
  daily_training_id UUID REFERENCES daily_training(id),
  session_rpe INT,  -- from parent daily_training

  -- Indexes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perf_history_user_exercise ON exercise_performance_history(user_id, exercise_id);
CREATE INDEX idx_perf_history_completed ON exercise_performance_history(completed_at DESC);
```

**Files to Modify**:
- `supabase/migrations/` - new migration
- `frontend/src/services/trainingService.ts` - insert on completion
- `frontend/src/types/training.ts` - add type
- `backend/app/services/database_service.py` - add query methods

**Acceptance Criteria**:
- [ ] Every completed strength exercise creates a history record
- [ ] Query: "Get last 10 performances for exercise X"
- [ ] Query: "Get 1RM trend for exercise X over 12 weeks"

---

#### 3. Progression Rules Engine (Strength)

**Science Basis**: Double progression, linear periodization, and RPE-based autoregulation are evidence-based methods.

**Implementation**:

```typescript
// frontend/src/utils/progressionRules.ts

interface ProgressionRule {
  id: string;
  name: string;
  description: string;
  evaluate: (history: ExercisePerformance[]) => ProgressionRecommendation;
}

interface ProgressionRecommendation {
  type: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload' | 'reduce';
  confidence: number;  // 0-1
  suggestion: {
    weight?: number;
    reps?: number;
    sets?: number;
  };
  reasoning: string;
}

// Double Progression Rule
const doubleProgressionRule: ProgressionRule = {
  id: 'double_progression',
  name: 'Double Progression',
  description: 'Increase reps until top of range, then increase weight',
  evaluate: (history) => {
    const last = history[0];
    const targetRepRange = { min: 8, max: 12 };

    // If all sets at top of rep range, increase weight
    if (last.reps_per_set.every(r => r >= targetRepRange.max)) {
      return {
        type: 'increase_weight',
        confidence: 0.9,
        suggestion: { weight: last.weight_per_set[0] * 1.025 },  // 2.5% increase
        reasoning: 'All sets completed at top of rep range'
      };
    }

    // If RPE was low and reps at minimum, increase reps
    if (last.session_rpe <= 2 && last.reps_per_set.every(r => r >= targetRepRange.min)) {
      return {
        type: 'increase_reps',
        confidence: 0.7,
        suggestion: { reps: Math.min(last.reps_per_set[0] + 1, targetRepRange.max) },
        reasoning: 'Session felt easy, add 1 rep per set'
      };
    }

    return { type: 'maintain', confidence: 0.8, suggestion: {}, reasoning: 'Continue current load' };
  }
};

// RPE Autoregulation Rule
const rpeAutoregulationRule: ProgressionRule = {
  id: 'rpe_autoregulation',
  name: 'RPE-Based Autoregulation',
  description: 'Adjust load based on perceived exertion',
  evaluate: (history) => {
    const recent = history.slice(0, 3);
    const avgRpe = recent.reduce((sum, h) => sum + h.session_rpe, 0) / recent.length;

    if (avgRpe >= 4.5) {
      return {
        type: 'deload',
        confidence: 0.85,
        suggestion: { weight: history[0].weight_per_set[0] * 0.9 },
        reasoning: 'High fatigue detected (avg RPE 4.5+), recommend 10% deload'
      };
    }

    if (avgRpe <= 2) {
      return {
        type: 'increase_weight',
        confidence: 0.75,
        suggestion: { weight: history[0].weight_per_set[0] * 1.05 },
        reasoning: 'Sessions feel easy (avg RPE ≤ 2), increase 5%'
      };
    }

    return { type: 'maintain', confidence: 0.6, suggestion: {}, reasoning: 'RPE in target range' };
  }
};
```

**Files to Create**:
- `frontend/src/utils/progressionRules.ts` - rule definitions
- `frontend/src/services/progressionService.ts` - orchestration
- `frontend/src/types/progression.ts` - types

**Acceptance Criteria**:
- [ ] At least 3 progression rules implemented (double progression, RPE autoregulation, linear)
- [ ] Rules can be user-selected or AI-selected per exercise type
- [ ] Recommendations shown before workout starts

---

#### 4. Endurance Training Load (TSS Equivalent)

**Science Basis**: Training Stress Score (TSS) from TrainingPeaks, adapted for HR-based calculations when power data unavailable.

**Implementation**:

```typescript
// Heart Rate-based Training Stress Score (hrTSS)
// Formula: hrTSS = (duration_minutes × hrIF² × 100) / 60
// hrIF (Intensity Factor) = avg_hr_session / lactate_threshold_hr

interface EnduranceLoad {
  hrTSS: number;           // Heart rate-based TSS
  durationMinutes: number;
  intensityFactor: number; // 0.5-1.2 typical range
  hrZoneDistribution: {    // Time in each zone
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
}

// Database additions
ALTER TABLE endurance_session ADD COLUMN training_load NUMERIC;  -- hrTSS
ALTER TABLE endurance_session ADD COLUMN intensity_factor NUMERIC;
ALTER TABLE user_profiles ADD COLUMN lactate_threshold_hr INT;  -- User's LTHR
ALTER TABLE user_profiles ADD COLUMN max_heart_rate INT;  -- Max HR for zone calcs
```

**HR Zone Calculation** (Karvonen method):
```
Zone 1 (Recovery): 50-60% HRR
Zone 2 (Aerobic): 60-70% HRR
Zone 3 (Tempo): 70-80% HRR
Zone 4 (Threshold): 80-90% HRR
Zone 5 (VO2max): 90-100% HRR

HRR = Max HR - Resting HR
Target HR = ((Max HR - Resting HR) × %Intensity) + Resting HR
```

**Files to Modify**:
- `supabase/migrations/` - add columns
- `frontend/src/utils/enduranceUtils.ts` - new file for calculations
- `frontend/src/services/trainingService.ts` - calculate on session completion
- `frontend/src/types/training.ts` - extend EnduranceSession type

**Acceptance Criteria**:
- [ ] hrTSS calculated for every completed endurance session
- [ ] HR zones calculated from user profile (max HR, resting HR)
- [ ] Zone distribution calculated and stored
- [ ] Weekly training load trends visible in insights

---

### Priority: MEDIUM (Enhanced Functionality)

These improve the user experience and accuracy of progression.

#### 5. Pace Zones for Endurance

**Science Basis**: Jack Daniels' VDOT system and Coggan's run power zones.

**Implementation**:

```typescript
// Pace zones based on threshold pace or race times
interface PaceZones {
  zone1: { name: 'Easy', min: number, max: number };      // 65-79% vVO2max
  zone2: { name: 'Tempo', min: number, max: number };     // 80-89% vVO2max
  zone3: { name: 'Threshold', min: number, max: number }; // 90-100% vVO2max
  zone4: { name: 'Interval', min: number, max: number };  // 100-105% vVO2max
  zone5: { name: 'Sprint', min: number, max: number };    // 106%+ vVO2max
}

// Database additions
ALTER TABLE user_profiles ADD COLUMN threshold_pace INT;  -- sec/km at lactate threshold
ALTER TABLE user_profiles ADD COLUMN vdot_score NUMERIC;  -- Calculated from race results

// Calculate from 5K time (Jack Daniels approximation)
function calculateVDOT(fiveKTimeSeconds: number): number {
  // Simplified VDOT calculation
  return 29.54 + 5.000663 * (12000 / fiveKTimeSeconds) - 0.007546 * (12000 / fiveKTimeSeconds) ** 2;
}
```

**Files to Modify**:
- `supabase/migrations/` - add user profile columns
- `frontend/src/utils/enduranceUtils.ts` - pace zone calculations
- `frontend/src/types/user.ts` - extend user profile type
- Settings UI for entering race times

**Acceptance Criteria**:
- [ ] User can enter recent race times (5K, 10K, half marathon)
- [ ] VDOT/pace zones auto-calculated
- [ ] Target pace in workouts shown as zone (e.g., "Zone 2 - Easy")
- [ ] Actual pace compared to target zone post-workout

---

#### 6. Progression Recommendations in AI Context

**Purpose**: Feed progression data to AI for smarter plan generation.

**Implementation**:

```python
# backend/app/helpers/progression/progression_context.py

class ProgressionContextBuilder:
    """Builds progression context for AI plan generation."""

    def build_context(self, user_id: str) -> dict:
        return {
            "strength_progress": self._get_strength_progress(user_id),
            "endurance_progress": self._get_endurance_progress(user_id),
            "recovery_status": self._get_recovery_status(user_id),
            "progression_recommendations": self._get_recommendations(user_id)
        }

    def _get_strength_progress(self, user_id: str) -> dict:
        """Get 1RM trends, volume trends, top exercises."""
        # Query exercise_performance_history
        return {
            "e1rm_trends": {...},  # Last 8 weeks
            "volume_trend": "increasing",  # or "plateau", "decreasing"
            "strongest_exercises": [...],
            "weakest_exercises": [...]
        }

    def _get_recommendations(self, user_id: str) -> list:
        """Get rule engine recommendations."""
        return [
            {
                "exercise": "Bench Press",
                "recommendation": "increase_weight",
                "from": 80,
                "to": 82.5,
                "reasoning": "All sets at 12 reps for 2 consecutive sessions"
            }
        ]
```

**Files to Create**:
- `backend/app/helpers/progression/progression_context.py`
- `backend/app/helpers/progression/__init__.py`

**Files to Modify**:
- `backend/app/agents/training_agent.py` - include progression context in prompt

**Acceptance Criteria**:
- [ ] AI receives progression context when generating new weeks
- [ ] AI explanations reference actual progression data
- [ ] Recommendations visible in weekly focus theme

---

#### 7. Deload Week Detection & Scheduling

**Science Basis**: Reactive deloads based on accumulated fatigue, typically every 4-6 weeks or when performance declines.

**Implementation**:

```typescript
// frontend/src/utils/deloadDetection.ts

interface DeloadSignals {
  performanceDecline: boolean;    // e1RM dropped 5%+ from recent peak
  highFatigueScore: boolean;      // Avg RPE > 4 for 2+ weeks
  acwrOutOfRange: boolean;        // ACWR > 1.5 sustained
  timeBasedDue: boolean;          // 4-6 weeks since last deload
}

function detectDeloadNeed(history: PerformanceHistory): DeloadRecommendation {
  const signals = evaluateDeloadSignals(history);
  const signalCount = Object.values(signals).filter(Boolean).length;

  if (signalCount >= 2) {
    return {
      recommended: true,
      urgency: signalCount >= 3 ? 'high' : 'medium',
      signals,
      suggestion: {
        type: 'volume_reduction',  // or 'intensity_reduction', 'full_rest'
        reduction: 0.4,  // 40% volume reduction
        duration: 7  // days
      }
    };
  }

  return { recommended: false, urgency: 'none', signals };
}

// Database tracking
ALTER TABLE weekly_schedules ADD COLUMN is_deload_week BOOLEAN DEFAULT FALSE;
ALTER TABLE weekly_schedules ADD COLUMN deload_type TEXT;  -- 'volume', 'intensity', 'full'
```

**Files to Create**:
- `frontend/src/utils/deloadDetection.ts`

**Files to Modify**:
- `supabase/migrations/` - add deload columns
- `frontend/src/services/insightsAnalyticsService.ts` - deload analysis
- `backend/app/agents/training_agent.py` - AI informed of deload need

**Acceptance Criteria**:
- [ ] System detects when deload is needed
- [ ] User notified with reasoning
- [ ] AI generates appropriate deload week when triggered
- [ ] Deload weeks tracked in history

---

#### 8. Set-Level RPE Tracking

**Science Basis**: Mike Tuchscherer's RPE system (RIR - Reps in Reserve) enables autoregulation.

**Implementation**:

```typescript
// Per-set RPE tracking for finer autoregulation
interface SetData {
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number;  // 6-10 scale (RPE 8 = 2 reps in reserve)
  rir?: number;  // Reps In Reserve (alternative to RPE)
}

// Database change
ALTER TABLE strength_exercise ADD COLUMN set_data JSONB;
-- Format: [{"set": 1, "reps": 8, "weight": 60, "rpe": 8}, ...]
```

**RPE-RIR Mapping**:
```
RPE 10 = 0 RIR (maximal effort)
RPE 9  = 1 RIR
RPE 8  = 2 RIR
RPE 7  = 3 RIR
RPE 6  = 4+ RIR
```

**Files to Modify**:
- `supabase/migrations/` - add set_data column
- `frontend/src/types/training.ts` - SetData type
- `frontend/src/components/training/` - UI for set-level RPE entry
- `frontend/src/services/trainingService.ts` - persist set data

**Acceptance Criteria**:
- [ ] Users can optionally log RPE per set
- [ ] Set-level data used for finer progression recommendations
- [ ] Historical set-level data queryable

---

### Priority: NICE TO HAVE (Advanced Features)

These are enhancements for power users and future scaling.

#### 9. Periodization Model Support

**Science Basis**: Linear, undulating (DUP), and block periodization have different applications.

**Implementation**:

```typescript
// frontend/src/types/periodization.ts

type PeriodizationModel =
  | 'linear'           // Progressive increase week over week
  | 'undulating_daily' // Vary intensity/volume daily
  | 'undulating_weekly'// Vary intensity/volume weekly
  | 'block'            // Accumulation → Transmutation → Realization
  | 'conjugate';       // Rotate max effort / dynamic effort

interface PeriodizationConfig {
  model: PeriodizationModel;
  mesocycle_length: number;  // weeks (typically 3-6)
  deload_frequency: number;  // every N weeks
  intensity_wave?: number[]; // [0.7, 0.75, 0.8, 0.65] for 4-week undulating
}

// Database
ALTER TABLE training_plans ADD COLUMN periodization_model TEXT;
ALTER TABLE training_plans ADD COLUMN periodization_config JSONB;
```

**Files to Create**:
- `frontend/src/types/periodization.ts`
- `frontend/src/utils/periodization/` - model implementations

**Files to Modify**:
- `supabase/migrations/` - add periodization columns
- `backend/app/agents/training_agent.py` - periodization-aware generation

**Acceptance Criteria**:
- [ ] User can select periodization model
- [ ] AI generates plans following selected model
- [ ] Intensity/volume waves visualized in UI

---

#### 10. Velocity-Based Training (VBT) Integration

**Science Basis**: Bar speed correlates with intensity; useful for autoregulation.

**Implementation**:

```typescript
// For future integration with devices like PUSH, GymAware, etc.
interface VelocityData {
  mean_velocity: number;      // m/s
  peak_velocity: number;      // m/s
  time_to_peak_velocity: number;  // ms
  range_of_motion: number;    // cm
}

// Velocity zones (general guidelines)
const velocityZones = {
  strength: { min: 0.5, max: 0.75 },     // 80-90% 1RM
  powerStrength: { min: 0.75, max: 1.0 }, // 70-80% 1RM
  power: { min: 1.0, max: 1.3 },          // 55-70% 1RM
  speed: { min: 1.3, max: Infinity }      // <55% 1RM
};
```

**Deferred**: Requires hardware integration. Placeholder for future.

---

#### 11. Race Prediction & Performance Modeling

**Science Basis**: Riegel formula, VDOT tables, critical power models.

**Implementation**:

```typescript
// Riegel formula for race time prediction
function predictRaceTime(knownDistance: number, knownTime: number, targetDistance: number): number {
  const fatigueFactor = 1.06;  // Riegel's constant
  return knownTime * Math.pow(targetDistance / knownDistance, fatigueFactor);
}

// Database
ALTER TABLE user_profiles ADD COLUMN race_history JSONB;
-- Format: [{"date": "2024-01-15", "distance": 5000, "time": 1200, "type": "5K"}, ...]
```

**Files to Create**:
- `frontend/src/utils/racePrediction.ts`

**Acceptance Criteria**:
- [ ] User can log race results
- [ ] Predicted times for common distances shown
- [ ] Training paces derived from race performances

---

#### 12. Social Progression Benchmarks

**Purpose**: Compare progression to anonymized cohorts.

**Implementation**:

```typescript
// Aggregate anonymized data for benchmarking
interface ProgressionBenchmark {
  exercise_id: string;
  percentile: number;      // User's e1RM percentile
  cohort_size: number;     // Users in comparison group
  cohort_filters: {
    gender?: string;
    age_range?: [number, number];
    training_age?: number; // years
  };
}
```

**Deferred**: Requires significant user base and privacy considerations.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER COMPLETES WORKOUT                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETION HANDLERS                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Strength        │  │ Endurance       │  │ Session         │  │
│  │ - Calculate e1RM│  │ - Calculate TSS │  │ - Store RPE     │  │
│  │ - Store volume  │  │ - Zone distrib. │  │ - Store feedback│  │
│  │ - Log to history│  │ - Store pace    │  │ - Update ACWR   │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE STORAGE                            │
│  exercise_performance_history │ endurance_session   │ daily_    │
│  (e1RM, volume, sets)         │ (TSS, zones, pace)  │ training  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROGRESSION ENGINE                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Rule Evaluation (Double Progression, RPE, Deload)      │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Trend Analysis (e1RM trends, volume trends, fatigue)   │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Recommendations (per exercise, per week)                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   FRONTEND DISPLAY        │   │   AI PLAN GENERATION      │
│   - Progress indicators   │   │   - Progression context   │
│   - Recommendations UI    │   │   - Informed suggestions  │
│   - Deload alerts        │   │   - Periodization aware   │
└───────────────────────────┘   └───────────────────────────┘
```

---

## File Structure

```
frontend/src/
├── types/
│   ├── progression.ts          # NEW: Progression types
│   └── periodization.ts        # NEW: Periodization models
├── utils/
│   ├── progressionUtils.ts     # NEW: e1RM calculations
│   ├── progressionRules.ts     # NEW: Rule engine
│   ├── enduranceUtils.ts       # NEW: TSS, pace zones
│   ├── deloadDetection.ts      # NEW: Deload signals
│   └── racePrediction.ts       # NEW: Race time prediction
├── services/
│   ├── progressionService.ts   # NEW: Progression orchestration
│   └── trainingService.ts      # MODIFY: Add progression hooks

backend/app/
├── helpers/
│   └── progression/
│       ├── __init__.py         # NEW
│       └── progression_context.py  # NEW: AI context builder
├── schemas/
│   └── training_schemas.py     # MODIFY: Add progression fields

supabase/migrations/
├── YYYYMMDD_add_exercise_performance_history.sql
├── YYYYMMDD_add_strength_progression_fields.sql
├── YYYYMMDD_add_endurance_load_fields.sql
└── YYYYMMDD_add_user_hr_pace_settings.sql
```

---

## Testing Strategy

### Unit Tests

```typescript
// progressionUtils.test.ts
describe('e1RM Calculations', () => {
  test('Brzycki formula for 5 reps', () => {
    expect(calculateE1RM(100, 5, 'brzycki')).toBeCloseTo(112.5, 1);
  });

  test('handles edge case of 1 rep', () => {
    expect(calculateE1RM(100, 1, 'brzycki')).toBe(100);
  });
});

// progressionRules.test.ts
describe('Double Progression Rule', () => {
  test('recommends weight increase when all sets at max reps', () => {
    const history = [{ reps_per_set: [12, 12, 12], weight_per_set: [60, 60, 60] }];
    const result = doubleProgressionRule.evaluate(history);
    expect(result.type).toBe('increase_weight');
  });
});

// enduranceUtils.test.ts
describe('hrTSS Calculation', () => {
  test('calculates correct TSS for 60min Z2 workout', () => {
    const result = calculateHrTSS(60, 140, 165); // 60min, avg HR 140, LTHR 165
    expect(result).toBeCloseTo(50, 5);
  });
});
```

### Integration Tests

- Completion flow saves to `exercise_performance_history`
- Progression recommendations appear in UI
- AI receives and uses progression context
- Deload detection triggers notification

---

## Migration Path

### Phase 1: Foundation (Weeks 1-2)
1. Create `exercise_performance_history` table
2. Implement e1RM calculation utility
3. Hook into completion flow to populate history
4. Basic frontend display of e1RM per exercise

### Phase 2: Rules Engine (Weeks 3-4)
5. Implement progression rules (double progression, RPE)
6. Create recommendations service
7. Display recommendations before workout
8. Add deload detection

### Phase 3: Endurance (Weeks 5-6)
9. Add user HR settings (max HR, resting HR, LTHR)
10. Implement hrTSS calculation
11. Add pace zones based on threshold
12. Training load trends in insights

### Phase 4: AI Integration (Week 7)
13. Build progression context for AI
14. Update training agent prompts
15. Validate AI uses progression data appropriately

---

## Science References

1. **1RM Estimation**: Brzycki, M. (1993). "Strength Testing—Predicting a One-Rep Max from Reps-to-Fatigue"
2. **Training Load**: Banister, E.W. (1991). "Modeling Elite Athletic Performance"
3. **HR Zones**: Karvonen, M.J. (1957). "The Effects of Training on Heart Rate"
4. **VDOT**: Daniels, J. (2014). "Daniels' Running Formula"
5. **RPE/Autoregulation**: Tuchscherer, M. (2008). "The Reactive Training Manual"
6. **Periodization**: Bompa, T. & Haff, G. (2009). "Periodization: Theory and Methodology of Training"
7. **Deload**: Zatsiorsky, V. & Kraemer, W. (2006). "Science and Practice of Strength Training"
8. **ACWR**: Gabbett, T.J. (2016). "The Training—Injury Prevention Paradox"

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| e1RM accuracy | ±5% of tested 1RM | User feedback + validation studies |
| Progression adherence | 70%+ users follow recommendations | Analytics |
| Deload detection accuracy | 80%+ true positive rate | Retrospective analysis |
| AI plan relevance | 4+ star average | User ratings |
| Injury rate | Below baseline | User-reported injuries |

---

## Open Questions

1. **Default rep ranges**: Should we use exercise-type-specific ranges (compound vs isolation)?
2. **1RM testing**: Should we provide a guided 1RM test protocol?
3. **HR device integration**: Priority for Apple Watch / Garmin direct sync?
4. **Beginner vs advanced**: Different progression rules based on training age?
5. **Exercise substitutions**: How to handle progression when exercises are swapped?
