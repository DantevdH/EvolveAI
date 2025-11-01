# AI Performance Analysis & Weakness Point Analysis

## Overview

This document explains the two deterministic analysis methods used in the EvolveAI Insights dashboard: **Effective Training Index (ETI)** for Performance Analysis and **Muscle-Group Weakness Score (MWS)** for Weakness Point Analysis. Both methods use rule-based calculations derived from exercise science literature to provide actionable insights about training progress and areas for improvement.

> **Note on Determinism**: These are deterministic, rule-based analytics (not machine learning models). All scores and flags are computed via transparent formulas and thresholds using training history data. The calculations are reproducible and explainable.

---

## 1. Performance Analysis — Effective Training Index (ETI)

### Goal

Measure **how effective** a user's weekly training was — not just how much they did. ETI combines: (A) normalized effort (volume), (B) consistency, (C) productivity (did the effort cause measurable progress?), and (D) a recovery/fatigue penalty (monotony/spike detection).

### Key Sources

- Session-RPE vs percentage 1RM loading: Helms et al. (2018) ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5877330/))
- Acute:Chronic Workload Ratio (ACWR) & training monotony literature ([BioMed Central](https://bmcsportsscimedrehabil.biomedcentral.com/articles/10.1186/s13102-021-00356-3))
- 1RM estimation validation (Epley/Brzycki) ([OpenSIUC](https://opensiuc.lib.siu.edu/cgi/viewcontent.cgi?article=1744&context=gs_rp))

### Notation

* `V_w` = total volume this week (kg × reps × sets)
* `V_norm` = personal baseline volume (e.g., 4-week rolling mean of weekly volume; >0)
* `D_w` = number of distinct training days that week (1–7) (is_rest = False and nr_exercises > 0)
* `Δ1RM_w` = % change in estimated 1RM for relevant lifts (week vs previous week). Use Epley/Brzycki to estimate 1RM per-session.
* `sRPE_w` = session-RPE aggregated to a weekly number (optional but recommended)
* `Monotony_w` = weekly training monotony (mean daily load / sd daily load)

All components are normalized to 0–1 before weighted summation.

### Component Equations (Simple, Robust)

#### 1. Normalized Effort (E)

```
E = clamp( (V_w / V_norm) , 0, 2 ) / 2
```

- Normalized around personal baseline
- Values >1 (higher-than-baseline) allowed up to 2, then clamped to 1
- Rewards relative progress, not absolute volume

#### 2. Consistency (C)

```
C = (D_w / 7)
```

- Fraction of days trained (simple, interpretable)
- Rewards regular training frequency

#### 3. Productivity (P)

```
Δ1RM_w_pct = max(-10, min( +50, 100 * (1RM_w - 1RM_prev) / 1RM_prev ))

P_simple = clamp( (Δ1RM_w_pct / 10) + 0.5, 0, 1 )
```

- Rewards measurable positive strength change
- Small negative changes reduce P but not heavily (avoids punishing short deloads)
- Use Epley formula per-session: `1RM = weight × (1 + reps/30)`

#### 4. Recovery / Fatigue Penalty (R_pen)

**Option A: Volume-based monotony (fallback)**
```
R_pen = clamp( Monotony_w / Monotony_thresh , 0, 1 )
```
- `Monotony_thresh` default = 2.0 (literature flags very high monotony as risky)
- If `R_pen` > 0.5, apply linear penalty
- `Monotony_w = mean(daily_load) / sd(daily_load)` where daily_load = volume per day

**Option B: Session-RPE-based fatigue (preferred, now available)**
```
sRPE_mean_w = mean(session_rpe for all training days in week)
sRPE_spike_w = max(session_rpe) - sRPE_mean_w

R_pen = clamp( (sRPE_mean_w / 10) * 0.6 + (sRPE_spike_w / 5) * 0.4, 0, 1 )
```
- Use session-RPE when available (prioritize over volume-based monotony)
- High average RPE (>7) and/or large spikes indicate fatigue/recovery needs
- If session-RPE not available, fall back to volume-based monotony

### Final ETI (0–100)

**Default Weights** (balanced, interpretable):
- `wE = 0.35` (effort)
- `wC = 0.25` (consistency)
- `wP = 0.30` (productivity)
- `wR = 0.10` (recovery penalty influence)

**Calculation**:
```
ETI_raw = wE*E + wC*C + wP*P - wR*R_pen
ETI = round( 100 * clamp(ETI_raw, 0, 1) )
```

**Interpretation**:
- **ETI 80–100**: Effective & productive week
- **ETI 60–79**: Solid, but minor fixes (e.g., slightly low productivity)
- **ETI <60**: Needs intervention (adjust load, recovery, or programming)

### Data Requirements Assessment

#### ✅ Available Data
- ✅ `V_w` (total volume): Available from `weight × reps × sets` per completed exercise
- ✅ `D_w` (training days): Available from counting unique `daily_training` records with `completed = true`
- ✅ `1RM_w` (estimated): Can calculate using Epley formula: `1RM = weight × (1 + reps/30)`
- ✅ Historical weekly data: Available from training history

#### ⚠️ Partially Available
- ⚠️ `V_norm` (baseline): Can calculate from historical data (4-week rolling mean), but need to establish baseline first
- ⚠️ `Monotony_w`: Can calculate from daily volume distribution, but need to aggregate to daily load first

#### ✅ Now Available
- ✅ `sRPE_w` (session-RPE): **Now collected** — available via `daily_training.session_rpe` (1-10 scale). Use this for improved monotony/fatigue detection in Recovery Penalty calculation.

#### ❌ Not Available (Would Improve Accuracy)
- ❌ Explicit 1RM test results: Not available — using estimated 1RM only (as noted, use the estimations indeed)
- ❌ Session duration: Not consistently tracked — do not use this for monotony calculation

### Implementation Notes

1. **Baseline Establishment**: 
   - Use first 4 weeks of training to establish `V_norm`
   - If user has < 4 weeks of data, use median of available weeks
   - Recalculate quarterly to adapt to user's evolving capacity

2. **1RM Calculation**:
   - Calculate per exercise per session: `1RM = weight × (1 + reps/30)`
   - Aggregate by taking maximum 1RM per week per exercise
   - Calculate `Δ1RM_w` as week-over-week change for top exercises

3. **Monotony Calculation**:
   - Aggregate volume by day: `daily_load[d] = sum(volume for all exercises on day d)`
   - Calculate: `Monotony_w = mean(daily_load) / sd(daily_load)`
   - If only 1 training day, set `Monotony_w = 0` (no monotony)

4. **Edge Cases**:
   - If `V_norm = 0` (no historical data), use `V_norm = V_w` (treat current as baseline)
   - If `sd(daily_load) = 0`, set `Monotony_w = 0` (single day or uniform load)

---

## 2. Weakness Point Analysis — Muscle-Group Weakness Score (MWS)

### Goal

For each muscle group, produce a **single prioritized weakness score** (0–100) built from:
- Plateau signal (low variability + flat slope)
- Decline signal (negative trend)
- Inconsistency (low frequency / uneven distribution)
- Low absolute frequency (rarely trained)

### Key Sources

- Subject-tailored variability and plateau-avoidance literature ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8834821/))
- Coefficient of variation use in exercise science for plateau detection
- Frequency measures and monotony-style thinking for consistency/fatigue balance

### Notation (per muscle group `g`)

* `n_g` = number of unique exercises tracked for muscle group g
* For each exercise `i` under `g`, we have a time series of recent `m` sessions volumes: `v_{i,1..m}` (use last 6–12 sessions where possible)
* `slope_i` = slope from linear regression on session index vs volume (units: kg per session)
* `cv_i` = coefficient of variation = `sd(v_i) / mean(v_i)`
* `freq_g` = number distinct weeks in the last 4–8 weeks where muscle group g was trained
* `1RM_trend_g` = average % change in estimated 1RM across key lifts for g

### Per-Exercise Signals (Normalized 0–1)

#### 1. Plateau Signal per Exercise (Plate_i)

```
slope_thresh = 0.1 * mean(session_volume)  // or small absolute slope

Plate_i = 1  if (cv_i < 0.15) AND (abs(slope_i) < slope_thresh)
       else scale by closeness to threshold
```

- **Severity scale**:
  - `cv < 0.10`: severe plateau
  - `cv < 0.12`: moderate plateau
  - `cv < 0.15`: mild plateau

- Low variation + near-zero slope = plateau

#### 2. Decline Signal per Exercise (Decl_i)

```
Decl_i = clamp( -slope_i / slope_scale, 0, 1 )
```

- Where `slope_scale = mean_volume / 10` (tunable)
- Negative slopes produce score >0

#### 3. Inconsistency per Exercise (Inc_i)

```
Inc_i = 1 - (weeks_trained_in_last_4 / 4)
```

- `0` = consistent (trained every week)
- `1` = never trained in last 4 weeks

### Aggregate to Muscle Group `g`

**Compute weighted averages** (using difficulty tags for weighting):

```
// Weight by difficulty: Advanced = 1.5, Intermediate = 1.0, Beginner = 0.7
weight_i = (difficulty === 'Advanced') ? 1.5 : (difficulty === 'Intermediate') ? 1.0 : 0.7

Plate_g = Σ_i( Plate_i × weight_i ) / Σ_i( weight_i )
Decl_g  = Σ_i( Decl_i × weight_i ) / Σ_i( weight_i )
Inc_g   = Σ_i( Inc_i × weight_i ) / Σ_i( weight_i )
FreqPenalty_g = clamp( (2 - freq_g) / 2, 0, 1 )  // if freq_g < 2 weeks in last 4 => penalty
```

**Composite Muscle Weakness Score (MWS)** (0–100):

```
MWS_raw = 0.45*Plate_g + 0.30*Decl_g + 0.15*Inc_g + 0.10*FreqPenalty_g
MWS = round( 100 * clamp(MWS_raw, 0, 1) )
```

**Severity Thresholds**:
- `MWS ≥ 75` → **High priority**
- `60 ≤ MWS < 75` → **Medium priority**
- `50 ≤ MWS < 60` → **Low priority**
- `<50` → Not a problem

**Recommendation Output**: For each flagged muscle group include:
- Top 3 contributing exercises (by Plate_i or Decl_i)
- Duration of issue (how many weeks detected)
- One prioritized action (e.g., add 1 extra weekly stimulus, insert exercise variation, add unilateral work, introduce microcycle deload)

### Data Requirements Assessment

#### ✅ Available Data
- ✅ Exercise volume per session: Available from `weight × reps × sets`
- ✅ Exercise muscle group: Available from `primary_muscle` field
- ✅ Session dates: Available from `daily_training.completedAt` or `updated_at`
- ✅ Exercise identification: Available via `exercise_id` and exercise name
- ✅ Historical session data: Available from training history

#### ✅ Now Available
- ✅ Exercise difficulty tags: **Available** — stored as `difficulty` field (Beginner, Intermediate, Advanced). Use for exercise weighting in aggregation.

#### ⚠️ Partially Available
- ⚠️ Exercise importance/weighting: Can infer from exercise name (compound vs. isolation), and now can use difficulty tags (Advanced > Intermediate > Beginner)
- ⚠️ Week-level frequency: Need to aggregate daily trainings to weeks

#### ❌ Not Available (Would Improve Accuracy)
- ❌ Muscle activation percentages: Not available — would improve exercise contribution weighting (not available)

### Implementation Notes

1. **Time Window for Analysis**:
   - Use last **6–12 sessions per exercise** to compute slope & CV
   - Many plateau methods require ~6 sessions to be reliable
   - If < 6 sessions available, use what's available but flag as lower confidence

2. **Linear Regression Calculation**:
   ```
   n = number of sessions
   xValues = [0, 1, 2, ..., n-1]  // session indices
   yValues = [v_1, v_2, ..., v_n]  // volumes
   
   slope = (n*Σ(xy) - Σ(x)*Σ(y)) / (n*Σ(x²) - (Σ(x))²)
   ```

3. **Coefficient of Variation**:
   ```
   mean_vol = mean(volumes)
   sd_vol = sd(volumes)
   cv = sd_vol / mean_vol  // handle mean_vol = 0 case
   ```

4. **Frequency Calculation**:
   - Group sessions by week (using `completedAt` date)
   - Count distinct weeks in last 4–8 weeks where muscle group was trained
   - `freq_g = count(distinct_weeks)`

5. **Exercise Weighting** (now implemented):
   - Weight exercises by difficulty (Advanced > Intermediate > Beginner)
   - Weight values: Advanced = 1.5, Intermediate = 1.0, Beginner = 0.7
   - Use weighted average for aggregation:
     ```
     Plate_g = Σ(Plate_i × weight_i) / Σ(weight_i)
     ```
   - If difficulty not available, fall back to equal weighting

6. **Edge Cases**:
   - If no exercises for muscle group: `MWS = 0` (no data)
   - If single exercise: use that exercise's signals directly
   - If `mean_volume = 0`: set `cv_i = 0` and `slope_i = 0` (no variation to analyze)

---

## 3. Quick Operational Defaults & Tips

### Time Windows
- **ETI**: Use 4-week rolling window for baseline (`V_norm`)
- **MWS**: Use last **6–12 sessions per exercise** for slope & CV calculation
- **Frequency**: Analyze last 4–8 weeks for muscle group frequency

### 1RM Estimation
- Use **Epley formula**: `1RM = weight × (1 + reps/30)`
- Both Epley and Brzycki are validated; pick one and be consistent
- Calculate per session, then aggregate weekly

### Monotony Threshold
- Flag `Monotony_w >= 2.0` as elevated
- Tune to population if needed (2.0 is literature-recommended default)

### Plateau Detection
- **Minimum sessions**: 6 sessions per exercise recommended
- **CV thresholds**: 
  - Severe: `< 0.10`
  - Moderate: `< 0.12`
  - Mild: `< 0.15`
- **Slope threshold**: `0.1 * mean(session_volume)` or absolute value (e.g., 50 kg/session)

### Data Quality Flags
- If < 4 weeks of data: Flag ETI as "establishing baseline"
- If < 6 sessions per exercise: Flag MWS as "low confidence - need more data"
- Display confidence indicators in UI

---

## 4. Data Availability Summary

### Current Data Schema (What We Have)

#### Available Fields:
- ✅ Exercise: `exercise_id`, `name`, `primary_muscle`, `equipment`, `difficulty` (Beginner/Intermediate/Advanced)
- ✅ Strength Exercise: `weight[]`, `reps[]`, `sets`, `completed`, `updated_at`
- ✅ Daily Training: `completedAt`, `day_of_week`, `completed`, `session_rpe` (1-10 scale) **NEW**
- ✅ User Profile: `experience_level`, `days_per_week`, `weight`, `age`, `gender`, `primary_goal`
- ✅ Training Plan: Weekly schedules with daily trainings

#### Missing Fields (Would Further Improve Analysis):
- ❌ Session duration: Not consistently tracked (intentionally excluded)
- ❌ Muscle activation percentages: Not available
- ❌ Explicit 1RM test results: Using estimates only (intentionally using estimates)

### Implementation Feasibility

#### ETI Implementation: ✅ **Fully Feasible + Enhanced**
- All required data is available
- **Session-RPE now available** — can use for improved fatigue/recovery detection
- Can use session-RPE-based fatigue calculation (preferred) or fall back to volume-based monotony

#### MWS Implementation: ✅ **Fully Feasible + Enhanced**
- All required data is available
- **Exercise difficulty tags now available** — can use for precise exercise weighting
- Can also infer exercise type from name (compound/isolation) for additional weighting

---

## 5. Implementation Roadmap

### Phase 1: ETI Implementation (2-3 days)

1. **Baseline Calculation** (2 hours)
   - Calculate 4-week rolling mean for `V_norm`
   - Handle edge cases (< 4 weeks of data)

2. **Component Calculations** (4 hours)
   - Normalized Effort (E)
   - Consistency (C)
   - Productivity (P) - using estimated 1RM
   - Recovery Penalty (R_pen) - using volume-based monotony

3. **ETI Aggregation** (2 hours)
   - Weighted sum with default weights
   - Edge case handling

4. **Testing & Validation** (4 hours)
   - Test with various user profiles
   - Validate against known scenarios (deload weeks, etc.)

### Phase 2: MWS Implementation (3-4 days)

1. **Per-Exercise Analysis** (6 hours)
   - Volume trend extraction (last 6-12 sessions)
   - Linear regression for slope calculation
   - CV calculation
   - Plateau/decline/inconsistency signals

2. **Muscle Group Aggregation** (4 hours)
   - Group exercises by `primary_muscle`
   - Calculate weighted averages
   - Frequency penalty calculation

3. **MWS Calculation & Ranking** (3 hours)
   - Composite score calculation
   - Severity classification
   - Top 3 exercise identification

4. **Testing & Validation** (4 hours)
   - Test with various muscle groups
   - Validate plateau detection accuracy
   - Edge case handling

### Phase 3: Integration & UI (2-3 days)

1. **API Integration** (1 day)
   - Update service methods
   - Add user profile parameters
   - Update response types

2. **UI Updates** (1-2 days)
   - Display ETI scores with components
   - Display MWS with severity indicators
   - Add confidence indicators
   - Show top contributing exercises

---

## 6. Future Enhancements (Optional Improvements)

### ✅ Session-RPE Now Implemented:
- ✅ Improved monotony calculation precision (now available)
- ✅ Better fatigue detection (now available)
- ✅ More accurate recovery recommendations (now available)

### ✅ Exercise Difficulty Tags Now Implemented:
- ✅ Better exercise weighting in MWS (now available)
- ✅ More accurate muscle group aggregation (now available)
- ✅ Exercise-specific recommendations (now available)

### If We Add Muscle Activation Percentages:
- Precise exercise contribution weighting
- More accurate muscle group analysis
- Better exercise substitution suggestions

### If We Add Explicit 1RM Tests:
- More accurate productivity signal
- Better strength progression tracking
- Calibration of estimated 1RM accuracy

---

## 7. Evidence Sources Reference

1. **Session-RPE vs Percentage 1RM Loading**: Helms et al. (2018) - [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5877330/)

2. **Acute:Chronic Workload Ratio & Training Monotony**: In-season monotony studies - [BioMed Central](https://bmcsportsscimedrehabil.biomedcentral.com/articles/10.1186/s13102-021-00356-3)

3. **Subject-Tailored Variability & Plateau Avoidance**: Variability-based platforms - [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8834821/)

4. **Meta-Analysis of Variation in Sport**: Application within resistance training research - [ResearchGate](https://www.researchgate.net/publication/364770950_Meta-Analysis_of_Variation_in_Sport_and_Exercise_Science_Examples_of_Application_Within_Resistance_Training_Research)

5. **1RM Estimation Validation**: Epley/Brzycki validation - [OpenSIUC](https://opensiuc.lib.siu.edu/cgi/viewcontent.cgi?article=1744&context=gs_rp)

---

## Conclusion

Both ETI and MWS provide deterministic, evidence-based insights into training performance. ETI offers a weekly effectiveness score combining effort, consistency, productivity, and recovery signals. MWS provides muscle-group-level weakness identification using plateau, decline, inconsistency, and frequency signals.

**Key Advantages**:
- **Deterministic**: Reproducible, explainable calculations
- **Evidence-Based**: Derived from exercise science literature
- **Simple**: Straightforward formulas, no black-box models
- **Actionable**: Clear thresholds and recommendations
- **Feasible**: Can be implemented with current data schema

**Implementation Status**: ✅ **Fully feasible and enhanced** with current data. Both methods can be implemented immediately with all required data available. Session-RPE and exercise difficulty tags are now implemented, enabling enhanced fatigue detection and precise exercise weighting.
