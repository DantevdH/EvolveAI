# Endurance Sports Improvements Analysis

## Executive Summary

This document outlines improvements to enhance EvolveAI's endurance sports capabilities. Currently, the application excels at strength training tracking but has limited endurance functionality. The improvements are ranked by **complexity vs impact ratio** (best ROI first), with each improvement explained in 3 sentences.

### Key Decisions
- **Target Users**: Both strength and endurance athletes (equal priority)
- **Platforms**: iOS and Android with automatic platform detection
- **Budget**: Free solutions only - no paid API integrations
- **Integrations**: Focus on Apple HealthKit and Google Fit (both free); Strava free tier evaluated; watch manufacturer APIs deferred
- **Timeline**: Quality-focused, no specific deadlines
- **Strategy**: Innovation-focused (no direct competition to match)

---

## Current State Analysis

### What Exists
- Basic endurance session tracking: sport type, training volume (duration/distance), unit, heart rate zone (target), name, description
- Endurance sessions can be added to training plans
- Simple display showing TYPE, VOLUME, and HEART ZONE

### What's Missing
- **No actual performance metrics**: time, distance, pace, cadence, elevation
- **No heart rate data**: only target zone, no actual HR values
- **No integrations**: watches (Garmin, Apple Watch, Polar), Strava, TrainingPeaks
- **No analytics**: endurance sessions excluded from insights/analytics
- **No visualizations**: no charts, maps, or progress tracking for endurance
- **No live tracking**: no in-session tracking or GPS
- **Limited presentation**: basic text display, no rich cards or visual elements

---

## Improvements Ranked by Complexity vs Impact

### 🟢 Tier 1: Quick Wins (Low Complexity, High Impact)

#### 1. Enhanced Endurance Session Display Cards ✅ COMPLETE
**Complexity: Low | Impact: High**

Transform the basic text display into rich, visually appealing cards similar to how strength exercises are presented. Add sport-specific icons, color-coded heart rate zones, progress indicators, and better typography. This immediately makes endurance sessions feel as polished as strength exercises and improves user engagement. The visual upgrade requires only frontend component changes with no database modifications.

**Implementation Details:**

1. **Sport Icons Constants** (`sport_icons_constants.jsx`):
   - Create a new file mapping each sport type to an Ionicons icon
   - Sport types: running, cycling, swimming, rowing, hiking, walking, elliptical, stair_climbing, jump_rope, other
   - Use appropriate icons (e.g., `footsteps` for running, `bicycle` for cycling, `water` for swimming)

2. **Color-Coded Heart Rate Zones**:
   - Use the same color scheme as the star ratings in DailyFeedbackModal (1-5 scale)
   - Map zones to intensity colors: Zone 1 (very easy) → muted/low intensity, Zone 5 (very hard) → primary/high intensity
   - Display zone badge with background color matching the zone intensity
   - Colors should match the visual hierarchy used in star ratings (selected stars use `colors.primary`)

3. **Progress Indicator**:
   - Show completion status visually (completed vs. not completed)
   - Display training volume progress if actual metrics exist (e.g., "5km / 5km" or "30min / 30min")
   - Use a subtle progress bar or checkmark badge similar to strength exercise completion indicators

4. **Better Typography**:
   - Increase font sizes for better hierarchy (exercise name: 15-16px, details: 12-13px)
   - Use font weights strategically (600-700 for names, 500-600 for labels, 400 for values)
   - Improve letter spacing (0.2-0.3px for names)
   - Better text color contrast (primary color for names, muted for secondary info)
   - Consistent spacing between elements (8-12px gaps)

#### 2. Onboarding Permissions Step (Foundation) ✅ COMPLETE
**Complexity: Low | Impact: High**

Add a permissions step early in the onboarding flow (Step 3) to request Health/Google Fit and location tracking permissions. This ensures all permissions are granted upfront, eliminating the need for permission requests later when users want to track workouts. This creates a smoother user experience and sets the foundation for live tracking features.

**Implementation Details:**

**Onboarding Flow Integration:**
- Insert as Step 0 in the onboarding sequence (before Personal Info)
- Auto-detect platform (iOS → HealthKit, Android → Google Fit)
- Request permissions in a user-friendly, explanatory way

**Permissions to Request:**
1. **Health/Google Fit Access**:
   - iOS: Request HealthKit read permissions for workout data
   - Android: Request Google Fit read permissions for workout data
   - Explain: "To import your workouts from your watch or other fitness apps"
   - Request specific data types: workouts, heart rate, distance, duration, route data

2. **Location Tracking**:
   - Request foreground location permission
   - Request background location permission (for workout tracking)
   - Explain: "To track your route and distance during workouts"
   - iOS: Request "When In Use" and "Always" location permissions
   - Android: Request fine location and background location permissions

**UX Flow:**
1. Show permission request screen with clear explanations
2. Explain benefits: "This allows us to track your workouts automatically"
3. Show platform-specific permission dialogs
4. Handle permission denial gracefully (show benefits of enabling, allow skip with reminder)
5. Store permission status in user profile for later reference

**Implementation:**
- Create `PermissionsStep.tsx` component
- Integrate into `ConversationalOnboarding.tsx` flow
- Use platform detection (`react-native-device-info` or `expo-device`)
- Health permissions: `react-native-health` (iOS) or `react-native-google-fit` (Android)
- Location permissions: `expo-location` or `@react-native-community/geolocation`
- Store permission status in database (user_profile table or separate permissions table)

**Benefits:**
- Permissions granted upfront = no interruptions during workouts
- Better user experience (one-time setup vs. multiple requests)
- Foundation for live tracking features
- Users understand why permissions are needed from the start

**Note**: This step must be completed before users can use live tracking (#3) or Health import features. If permissions are denied, show helpful messaging about how to enable them later in settings.

**IMPORTANT**
Podfile.properties.json:

{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "false"
}

EvolveAI.entitlements:

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
  </dict>
</plist>

#### 3. Live Endurance Session Tracking (Strava-like Experience) ✅ COMPLETE
**Complexity: Medium | Impact: Very High**

Transform endurance sessions into a live workout tracking experience similar to Strava. Users can start/stop/pause tracking directly in the app, with GPS automatically recording distance, time, and route. Heart rate data is captured by reading from HealthKit/Google Fit in real-time during live tracking (if watch is actively syncing), or imported from completed workouts in Health/Google Fit. The **recommended approach** (like Strava) is to import completed workouts from Health/Google Fit, which provides the most reliable and complete heart rate data. This eliminates manual data entry and makes endurance tracking as engaging as strength training.

**UX Flow:**
1. **Start Tracking** (Live Tracking Method):
   - User taps "Start" button on planned endurance session card
   - **Pre-start checks** (best practice): Show GPS signal strength indicator, HR data availability from Health/Google Fit, battery level warning if <20%
   - Opens full-screen live tracking view (similar to Strava)
   - **3-second countdown** (industry standard - gives user time to prepare) before auto-starting GPS
   - Automatically starts GPS tracking, timer, and distance measurement
   - **Heart rate monitoring**: Reads heart rate data from HealthKit/Google Fit in real-time (every 1-2 seconds) if watch is actively tracking and syncing
     - **Note**: HR data availability depends on watch actively syncing to Health/Google Fit during workout
     - Apple Watch: Automatically syncs HR when workout is active on watch
     - Other watches: May require manual workout start on watch, or may only sync after workout completes
     - If no HR data available: Show "No heart rate data" or "Start workout on watch to see HR"
   - Shows real-time metrics: elapsed time, distance, pace, current heart rate (if available from Health/Google Fit)
   - **Additional metrics** (best practice): Current speed, average pace, split pace (last km/mile), calories (estimated), cadence (if available)
   - Controls: Pause, Resume, Stop/Finish
   - On "Stop/Finish": Show summary screen with key metrics before saving
   - **Auto-pause detection** (best practice): Automatically pause when user stops moving (configurable threshold)
   - Overwrites planned volume with actual tracked values (time, distance, route)
   - **Post-workout HR data**: For complete HR data (zones, averages, max), user can optionally import the full workout from Health/Google Fit after live tracking completes

2. **Import from Health/Google Fit** (Recommended Method - Like Strava):
   - **Best practice**: This is the recommended approach for heart rate data (similar to how Strava works)
   - User tracks workout on their watch (Apple Watch, Garmin, etc.) - watch automatically saves to Health/Google Fit
   - User taps "Import from Health" button on planned endurance session
   - Queries Apple Health/Google Fit for workouts from same day (extend to ±2 hours if no exact match)
   - Shows picker with all workouts sorted by occurrence (time) - user manually selects matching workout
   - **Workout preview cards** (best practice): Show thumbnail map, key metrics, sport type icon, duration, heart rate preview
   - Imports: actual time, distance, pace, average/max/min heart rate, heart rate zones, elevation, route data
   - **Smart matching** (improvement): Suggest most likely workout based on time proximity and sport type
   - Overwrites planned volume with imported values
   - Stores `data_source` = 'healthkit' or 'google_fit' for reference
   - **Benefits**: Most reliable HR data, works with any watch that syncs to Health/Google Fit, complete zone distribution, no battery drain on phone

**Key UX Improvements:**
- **No "planned vs actual" concept**: Just like strength exercises where you overwrite planned weights, endurance sessions overwrite planned volume with tracked/imported values
- **Live tracking feels engaging**: Full-screen workout view with real-time metrics, map, and controls
- **Automatic data capture**: GPS handles distance/time/route, HR monitor handles heart rate (if connected)
- **Flexible input**: Either track live in-app OR import from Health/Google Fit (recommended for complete HR data)
- **Seamless integration**: Works with Apple Watch (syncs to HealthKit automatically) and most modern watches via Health/Google Fit
- **Heart rate strategy**: Import from Health/Google Fit is recommended (like Strava) - most reliable and complete HR data. Live tracking can read HR from Health/Google Fit in real-time if watch is actively syncing, but may not always be available
- **Error handling**: Graceful degradation if GPS signal lost, show "GPS signal lost" indicator, allow manual distance entry as fallback

**Database Schema Changes:**
- Add fields to `endurance_session` table:
  - `actual_time` (minutes, nullable) - Overwrites `training_volume` if unit was "minutes"
  - `actual_distance` (numeric, nullable) - Overwrites `training_volume` if unit was distance
  - `average_pace` (seconds per km/mile, nullable)
  - `average_speed` (km/h or mph, nullable) - Calculated from distance/time
  - `average_heart_rate` (bpm, nullable) - Only if HR monitor connected
  - `max_heart_rate` (bpm, nullable) - Only if HR monitor connected
  - `min_heart_rate` (bpm, nullable) - Useful for recovery analysis
  - `heart_rate_zones` (jsonb, nullable) - Time spent in each zone: `{"zone_1": 120, "zone_2": 300, ...}` (seconds)
  - `elevation_gain` (meters/feet, nullable)
  - `elevation_loss` (meters/feet, nullable) - Standard in fitness apps
  - `calories` (integer, nullable) - Estimated calories burned
  - `cadence` (steps/min or strokes/min, nullable) - Running cadence or cycling cadence
  - `data_source` (text, nullable) - 'live_tracking', 'healthkit', 'google_fit' (tracks how data was captured)
  - **Note**: GPS is used only for tracking distance, not for saving or visualizing routes
  - `health_workout_id` (text, nullable) - ID of linked workout in Health/Google Fit (if imported)
  - `tracked_at` (timestamp, nullable) - When live tracking started
  - `completed_at` (timestamp, nullable) - When tracking finished or imported

**Frontend Implementation:**
1. **Live Tracking Screen** (`EnduranceTrackingScreen.tsx`):
   - Full-screen workout view with large, readable metrics
   - **Metric layout** (best practice): Primary metrics (time, distance) large and centered, secondary metrics (pace, HR) smaller below
   - Real-time updates: time, distance, pace, current HR (if available)
   - **Swipeable screens** (best practice): Swipe left/right to see different metric views (overview, pace, heart rate zones, map)
   - Large Start/Pause/Resume/Stop buttons (minimum 44x44pt touch targets)
   - **Note**: Permissions already granted during onboarding (#2), so no permission requests needed here
   - GPS accuracy indicators (color-coded: green = good, yellow = fair, red = poor)
   - **Battery indicator** (best practice): Show battery level, warn if <20% before starting
   - **Screen wake lock** (best practice): Keep screen on during active tracking
   - **Background tracking** (best practice): Continue tracking when app is backgrounded, show notification with key metrics
   - **Split/lap functionality** (best practice): Allow manual lap marking or auto-laps every km/mile
   - **Map view toggle** (if route visualization added later): Show/hide map to save battery

2. **Session Card Enhancement**:
   - Replace simple "Complete" button with "Start Tracking" or "Import from Health"
   - Show tracked/imported metrics if session was completed

3. **Health Import Flow**:
   - **Note**: Permissions already granted during onboarding (#2), so no permission requests needed here
   - Workout picker modal with preview cards (workouts sorted by occurrence/time)
   - **Filter options** (improvement): Filter by sport type, time range, distance range
   - User manually selects matching workout
   - Import confirmation with data preview

**Backend Changes:**
- Update `EnduranceSession` schema to include new fields
- Track data source for analytics (live vs imported)
- **Data validation**: Validate GPS accuracy, flag suspicious data (e.g., impossible speeds)
- **Note**: GPS is used only for tracking distance, not for saving or visualizing routes

**Technical Requirements:**
- **Permissions** (handled in #2 - onboarding):
  - Location permissions (foreground and background)
  - Health/Google Fit read permissions
  - Platform auto-detection (iOS → HealthKit, Android → Google Fit)
- React Native location library (`@react-native-community/geolocation` or `expo-location`) - for distance tracking only
  - **GPS optimization**: Use `distanceFilter` (5-10m) to reduce battery drain, `enableHighAccuracy: true` for better accuracy
  - **Background location**: Use `startLocationUpdatesAsync` with `foregroundService` on Android
- **Heart rate monitoring** (via HealthKit/Google Fit - recommended approach):
  - **Live tracking**: Read heart rate from HealthKit/Google Fit in real-time during workout (every 1-2 seconds)
    - iOS: Use `react-native-health` to subscribe to HealthKit heart rate samples during active workout
    - Android: Use `react-native-google-fit` to read heart rate data in real-time
    - **Requirement**: Watch must be actively tracking and syncing to Health/Google Fit
    - Apple Watch: Automatically syncs when workout is active on watch
    - Other watches: May require manual workout start, or may only sync after completion
  - **Import method** (recommended): Import completed workouts from Health/Google Fit for complete HR data
  - **Note**: Direct BLE connection to HR monitors is NOT recommended - complex, less reliable, unnecessary when using Health/Google Fit
- **Battery optimization** (critical):
  - Reduce GPS update frequency when paused
  - Use lower accuracy mode when not actively tracking
  - Dim screen or offer "power save mode" option
  - Background task optimization (iOS: `beginBackgroundTask`, Android: `ForegroundService`)
- **Error handling**:
  - GPS signal lost: Show indicator, continue tracking with last known position
  - HR monitor disconnected: Show warning, continue without HR
  - App killed: Save partial session data, allow resume on restart
- **Note**: GPS is used only for tracking distance, not for route visualization
- Health/Google Fit integration (see improvement #12 for details)

**Additional Best Practices:**
- **Post-workout summary**: Show detailed breakdown (splits, elevation profile if available, zone distribution)
- **Achievement system**: Celebrate milestones (first 5k, longest run, fastest pace, etc.)
- **Offline support**: Cache workout data locally, sync when connection restored
- **Privacy**: Clear indication of what data is stored, option to delete route data while keeping metrics

**Benefits:**
- Eliminates manual data entry completely
- Makes endurance tracking as engaging as strength training
- Automatic data capture reduces friction
- Works seamlessly with Apple Watch and other devices
- GPS tracking provides accurate distance measurement
- Industry-standard features increase user trust and engagement

#### 4. Insights: Performance Metrics & Recovery
**Complexity: Medium | Impact: High**

Integrate comprehensive performance metrics and science-based recovery tracking across all sports (strength, running, cycling, swimming, etc.) into a unified insights view. This combines sport-specific performance analytics with recovery status tracking to provide athletes with a holistic view of their training load, progress, and recovery needs. The insights view includes filtered analytics by sport type and recovery status by muscle group, enabling data-driven training decisions and injury prevention.

**Implementation Details:**

**UI Approach: Unified Insights View**
- **Remove AI insights**: Remove the AI insights as they are poorly prompted and implemented and not high priority at this point. Remove all references to it in frontend - make a very clean removal.
- **Sport filter dropdown**: Create a dropdown with all available sports (strength, running, cycling, swimming, rowing, hiking, walking, elliptical, stair_climbing, jump_rope, other) so that a user can filter to specific sports. Only show the sports in the filter that a user has performed. Track this centrally upon app load and update if a plan completion update occurs.
- **Two main sections**: 4a) Performance Metrics and 4b) Recovery
- **Filter toggle**: Add segmented control or toggle buttons at top of InsightsContent with all performed sport types. Include "All" option to show combined data across all sports.

---

### 4a. Performance Metrics

**Data Extraction (Frontend):**
- Fetch all exercise data from database via Supabase client: strength exercises AND endurance sessions (all sport types)
- For strength exercises: Extract weight, reps, sets, exercise name, `target_area` (from `exercises` table via JOIN), completedAt
- For endurance sessions: Extract sportType, trainingVolume, unit, heartRateZone, completedAt
- **Priority**: Extract `actualDistance` and `actualTime` when available (from database schema populated by live tracking #3), fallback to `trainingVolume` if not set
- All calculations performed in frontend service (`insightsAnalyticsService.ts` or similar)
- Group by week and sport type for chart data: aggregate distance and time separately for clustered bar chart (where applicable)

**Sport-Specific Metrics Display:**

**Common Metrics** (all sports):
- Time, Distance (where applicable), Heart Rate (avg/max), Pace/Speed

**Sport-Specific Displays**:
- **Strength**: Volume (weight × reps × sets), Sets, Reps, Weight progression, RPE (Rate of Perceived Exertion), Muscle groups targeted (`target_area`), Exercise breakdown
- **Running**: Pace (min/km or min/mile), Distance, Time, HR, Elevation
- **Cycling**: Speed (km/h or mph), Distance, Time, HR, Elevation, Cadence
- **Swimming**: Pace (min/100m or min/100yd), Distance, Time, HR
- **Rowing**: Pace (min/500m), Distance, Time, HR, Cadence
- **Hiking**: Pace (min/km), Distance, Time, HR, Elevation
- **Walking**: Pace (min/km), Distance, Time, HR
- **Elliptical**: Pace (min/km equivalent), Distance, Time, HR
- **Stair Climbing**: Time, HR, Elevation
- **Jump Rope**: Time, HR, Jumps (if available)
- **Other**: Time, Distance (if applicable), HR

**Chart Components:**
- **VolumeTrendChart Enhancement**: Extend existing `VolumeTrendChart` component to support all sport types
- **Clustered Bar Chart for Applicable Sports**:
  - **Chart Type**: Clustered bar chart with dual y-axes (for sports with distance + time)
  - **Display Logic**:
    - For strength: Show volume (weight × reps × sets) as single bar
    - For sports with both `actual_distance` and `actual_time`: Show two bars per week (clustered)
      - Distance bar: Left y-axis (km/miles) - primary metric for outdoor activities
      - Time bar: Right y-axis (minutes) - secondary metric
      - Use distinct colors (e.g., distance = blue, time = green)
      - Clear axis labels: "Distance (km)" on left, "Duration (min)" on right
    - For sports with only distance: Show single distance bar (single y-axis)
    - For sports with only time: Show single time bar (single y-axis) - handles gym cycle case
    - When neither exists: Fall back to `training_volume` with unit display
- **Heart Rate Zone Analytics**: If users have actual heart rate data (from live tracking #3 or Health import), calculate time-in-zone metrics, average HR, max HR, and HR zone distribution across applicable sessions (endurance sports)
- Visualize zone distribution with pie charts and show trends over time

**Visual Enhancements**:
- Contextual metric formatting (pace vs speed based on sport, volume for strength)
- Elevation display for outdoor activities (running, cycling, hiking, stair climbing)
- Combined metric displays where possible (e.g., pace + distance = speed)
- Chart types adapt to sport: volume bars for strength, distance/time bars for endurance sports

---

### 4b. Recovery (Science-Based)

**Data Source:**
- **Muscle Group**: Use `exercises.target_area` directly from database (e.g., "Calves", "Upper Arms", "Chest")
- **Primary Muscle**: `exercises.target_area` receives 100% of volume load (simplified approach)
- **Endurance Mapping**: Map endurance activities to `target_area` values:
  - Running → "Legs"
  - Cycling → "Legs"
  - Swimming → "Upper Arms" (or "Core" if no arms)
  - Rowing → "Back"
  - Hiking → "Legs"
  - Walking → "Legs"
  - Other → "None, not in overview" 

**Scientific Foundations:**

| Component | Backed by |
|-----------|-----------|
| Internal load (sRPE × duration) | Foster et al. 2001; Impellizzeri et al. 2004 |
| Mixed-mode unification via internal load | Impellizzeri et al. 2019 |
| Strength external load = volume load | McBride 2009; Scott et al. 2016 |
| Muscle-specific fatigue via volume | Schoenfeld 2010; Haun et al. 2018 |
| Athlete normalization via rolling baseline | Bannister 1991; Bourdon et al. 2017 |
| Derived UX score (internal-dominant) | Halson 2014 (applied practice) |

**Core Equations:**

**1. Session Duration Resolution:**
```
If totalDurationMinutes is provided:
  resolvedDuration = totalDurationMinutes
Else if strength exercises exist:
  totalSets = Σ(number of sets) for all strength exercises
  resolvedDuration = totalSets × 2.5 minutes
Else:
  resolvedDuration = null
```
*Reference: Foster et al. 2001 (strength sessions often estimate or omit time)*  
*Note: 2-3 min per set (rest + execution) is widely used in applied monitoring practice*

**2. Internal Load (Global Fatigue):**
```
internalLoad = resolvedDuration × sessionRPE
```
*If resolvedDuration = null: internalLoad = null*  
*Reference: Foster et al. 2001; Impellizzeri et al. 2004 (sRPE × duration)*

**3. Endurance External Load:**
```
enduranceMinutes = Σ(durationMinutes) for all endurance activities
enduranceDistanceKm = Σ(distanceKm) for all endurance activities (if any have distance)
```
*Reference: Impellizzeri et al. 2019 (external vs internal load separation)*

**4. Strength External Load (Volume Load):**
```
Volume_kg = Σ(reps[i] × weight_kg[i]) for all sets
totalStrengthVolume = Σ(Volume_kg) for all exercises
MuscleVolume[target_area] = Σ(Volume_kg) for all exercises where exercise.target_area = target_area
```
*Reference: McBride 2009; Schoenfeld 2010 (volume load calculation)*

**5. Athlete-Normalized Strength Load:**

**Per Muscle Group (for recovery):**
```
DaysAvailable = count(days with training data, max 28 days)
BaselineVolume[target_area] = Σ(MuscleVolume[target_area]) for available days / DaysAvailable

NormalizedLoad[target_area] = MuscleVolume[target_area] / BaselineVolume[target_area]
```
*If DaysAvailable < 28: use available data proportionally (e.g., 14 days = 14-day average)*  
*If BaselineVolume = 0: NormalizedLoad = null (no baseline yet)*  
*Reference: Bannister 1991; Bourdon et al. 2017 (athlete normalization via rolling baseline)*

**Overall Strength (for UX stress score):**
```
athleteBaselineStrengthVolumeKg = Σ(totalStrengthVolume) for available days / DaysAvailable
normalizedStrengthLoad = totalStrengthVolume / athleteBaselineStrengthVolumeKg
```
*If athleteBaselineStrengthVolumeKg = 0: normalizedStrengthLoad = null*

**Interpretation:**
- ~1.0 → normal
- >1.3 → unusually high
- <0.7 → light / recovery

**6. UX Stress Score (Internal-Dominant):**
```
uxStressScore = internalLoad × (1 + 0.25 × min(normalizedStrengthLoad, 2))
```
*If internalLoad = null: uxStressScore = null*  
*If normalizedStrengthLoad = null: use 0 in calculation*  
*Reference: Halson 2014 (applied fatigue monitoring)*

**Principles:**
- Internal load dominates (primary factor)
- Strength stress nudges, not overrides (α = 0.25 is conservative)
- Strength modifier capped at 2.0 (prevents tonnage explosions)
- No claim of physiology — UX only

**7. Recovery Time:**
```
RecoveryHours[target_area] = 48 hours (fixed for all muscles)
```
*Reference: Simplified uniform recovery window (Schoenfeld 2010 - applied practice)*

**8. Cumulative Fatigue (ACWR - Adaptive):**
```
DaysAvailable = count(days with training data, max 28 days)
AcuteLoad[target_area] = Σ(MuscleVolume[target_area]) for last 7 days (or available if < 7)
ChronicLoad[target_area] = Σ(MuscleVolume[target_area]) for last DaysAvailable / DaysAvailable

ACWR[target_area] = AcuteLoad[target_area] / ChronicLoad[target_area]
```
*If DaysAvailable < 7: AcuteLoad = total available (proportional)*  
*If ChronicLoad = 0: ACWR = null (insufficient data)*  
*Reference: Bourdon et al. 2017 (Acute:Chronic Workload Ratio model)*

**9. Recovery Status:**
```
If ACWR > 1.5: "needs_rest" (injury risk)
If ACWR > 1.2: "recovering" (elevated)
If 0.8 ≤ ACWR ≤ 1.2: "recovered" (optimal)
If ACWR < 0.8: "recovered" (detraining risk)
If ACWR = null: "not_trained_yet" (insufficient data - muscle group not trained yet)
```
*Reference: Bourdon et al. 2017 (ACWR thresholds)*

**UI Implementation:**
- **Recovery Dashboard**: Add recovery status cards/section in Insights view
  - Show muscle group recovery status by `target_area`
  - **Display only final results**: Show recovery status (recovered/recovering/needs_rest/not_trained_yet) - hide intermediate calculations
  - Display ACWR values only when available (not for "not_trained_yet" status)
  - Provide recovery recommendations (e.g., "Rest legs for 2 more days", "Ready for high-intensity training")
- **Recovery Charts**:
  - Timeline views showing training load and recovery status over time
  - ACWR trends by muscle group (only for trained muscle groups)
  - Recovery status indicators (color-coded: green = recovered, yellow = recovering, red = needs rest, gray = not trained yet)

**Session Load Output Model:**
```
SessionLoadResult = {
  internalLoad: number | null,                    // sRPE × duration
  external: {
    enduranceMinutes: number,
    enduranceDistanceKm: number | null,
    strengthVolumeKg: number,                      // Total strength volume
    muscleVolumesKg: Record<target_area, number>   // Per muscle group volume
  },
  normalizedStrengthLoad: number | null,          // Overall strength (total vs baseline)
  normalizedLoadPerMuscle: Record<target_area, number | null>,  // Per muscle group (for recovery)
  uxStressScore: number | null                   // Internal-dominant combined score
}
```

**Frontend Implementation:**
- All calculations performed client-side in frontend service (`insightsAnalyticsService.ts` or similar)
- Calculate session load for each completed training session:
  - Resolve session duration (use provided or estimate from sets)
  - Calculate internal load (sRPE × duration)
  - Calculate external loads (endurance minutes/distance, strength volume by target_area)
  - Calculate normalized load per target_area (vs. baseline)
  - Calculate UX stress score (internal load × strength modifier)
- Calculate recovery status based on:
  - Training volume by `target_area` from historical data (fetched from database)
  - Adaptive baseline calculation (use available data, max 28 days)
  - ACWR calculation with proportional scaling for <28 days of data
- Cache session load results and recovery status locally for performance
- Recalculate recovery status when new training sessions are completed
- **Data Source**: Fetch completed training sessions and exercise data from database (via Supabase client)
- **No Backend Calculations**: All logic runs in frontend TypeScript/JavaScript

**Benefits:**
- Prevents overtraining by making recovery status visible
- Helps athletes optimize training timing (train when recovered, rest when needed)
- Provides actionable insights (e.g., "Your legs need 2 more days of recovery")
- Combines performance metrics with recovery status for holistic training view
- Science-based approach using established research (ACWR, Bannister model)

**Strengths:**
- **Science-based foundation**: All equations backed by established research with proper references
- **Simple architecture**: Frontend-only calculations reduce complexity, no backend coordination needed
- **Adaptive baseline**: Works with <28 days of data (proportional scaling) - handles new users gracefully
- **Unified approach**: Single system handles all sports (strength + endurance) consistently
- **Simple muscle mapping**: 100% volume to primary `target_area` - easy to understand and implement
- **Fixed recovery window**: 48hrs for all muscles - eliminates complexity of variable recovery times
- **Clear separation**: Performance metrics (4a) and Recovery (4b) are distinct, focused sections
- **Actionable outputs**: ACWR provides clear recovery status (recovered/recovering/needs_rest)
- **Progressive enhancement**: Works with minimal data, improves as more data accumulates

**Weaknesses & Considerations:**
- **Session duration estimation**: 2.5 min/set heuristic may be inaccurate for some users (long rest periods, circuit training)
- **Recovery time not used**: 48hr recovery window is calculated but not actually used in recovery status (only ACWR is used)
- **Missing data handling**: Need explicit fallback logic for missing `sessionRPE`, missing `target_area`, or incomplete exercise data (see recommendation #3)
- **UX stress score visibility**: Calculated but not displayed in UI - may be unused complexity (hidden per recommendation #2)
- **Dual normalized loads**: Both per-muscle and overall normalized loads calculated - only per-muscle used for recovery, overall used for UX stress score (which is hidden)
- **Internal load dependency**: Requires `sessionRPE` - if not collected, internal load and UX stress score are null (handled per recommendation #3)
- **Endurance "Other" mapping**: Mapped to "None, not in overview" - these sessions won't contribute to recovery tracking (intentional - focus on most used muscle)

**Recommendations for Simplification:**
1. **Focus on ACWR for recovery**: Recovery status should primarily use ACWR (remove or de-emphasize 48hr recovery time if not used)
2. **Show only final results**: Display only the most important results per `target_area` (recovery status, ACWR when available) - hide intermediate calculation steps from UI. Users don't need to see internal load, normalized loads, or UX stress score unless they drill down.
3. **Handle missing data explicitly**: Add fallback logic for missing `sessionRPE`, `target_area`, or incomplete sessions. If `sessionRPE` is missing, skip internal load calculation. If `target_area` is missing, skip that exercise from recovery tracking.
4. **New user experience**: Show "not_trained_yet" instead of "recovered" for ACWR null (muscle groups that haven't been trained yet) - see Recovery Status equation #9
5. **Progressive disclosure**: Show simple status first (recovered/recovering/needs_rest/not_trained_yet) with color coding. Users can tap/expand to see ACWR values, training volume, and other detailed metrics if desired, but keep the initial view clean and simple

---

### 🟡 Tier 2: Medium Complexity, High Impact

#### 6. Multi-Session Workouts (Intervals) ✅ COMPLETE
**Complexity: Medium | Impact: Medium-High**

Support interval workouts using a **block-based structure** where blocks of segments can be repeated together. The structure is: `EnduranceSession → SegmentBlock[] → EnduranceSegment[]`. Each block can have a `repeat_count` (1-20) to repeat all its segments as a unit.

**Example**: "5min warm-up + 4x (1km hard + 90s recovery) + 5min cool-down" is defined as:
- Block 1 (repeat 1×): warmup segment
- Block 2 (repeat 4×): work segment + recovery segment
- Block 3 (repeat 1×): cooldown segment

This expands to 10 tracking segments: warmup → work1 → recovery1 → work2 → recovery2 → work3 → recovery3 → work4 → recovery4 → cooldown

All segments within a session share the same `sport_type`. For multi-sport workouts (running → cycling → running), use separate endurance_sessions.

**Industry Best Practices Applied:**
- **Per-segment actuals**: Garmin and Strava store per-lap/segment data for post-workout analysis
- **Explicit rest segments**: Garmin and TrainingPeaks use explicit "Recovery" and "Rest" step types
- **Auto-advance**: Standard behavior is auto-advance on time/distance targets with audio/haptic alerts
- **Segment types**: Industry uses warmup, work, recovery, rest, cooldown as standard types

**Implementation Details:**

---

**Database Schema Changes:**

**1. Changes to `endurance_session` table:**
```sql
-- REMOVE these columns (moved to segments):
--   training_volume, unit, heart_rate_zone

-- KEEP these columns:
--   id, daily_training_id, sport_type, name, description, execution_order, completed
--   created_at, updated_at

-- KEEP session-level actuals (aggregated totals):
--   actual_duration (seconds) - Total workout duration
--   actual_distance (meters) - Total distance
--   average_pace (seconds/km) - Overall average pace
--   average_speed (km/h) - Overall average speed
--   average_heart_rate (bpm) - Overall average HR
--   max_heart_rate (bpm) - Max HR across entire session
--   min_heart_rate (bpm) - Min HR across entire session
--   elevation_gain (meters) - Total elevation gain
--   elevation_loss (meters) - Total elevation loss
--   calories (integer) - Total calories burned
--   cadence (integer) - Overall average cadence
--   data_source, health_workout_id, started_at, completed_at
```

**2. New `segment_block` table:**
```sql
CREATE TABLE IF NOT EXISTS public.segment_block (
  id SERIAL PRIMARY KEY,
  endurance_session_id INTEGER NOT NULL REFERENCES endurance_session(id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL,  -- Order within session (1, 2, 3...)

  -- Block metadata
  name TEXT,  -- Optional block name (e.g., "Main Set", "Warm Up Block")
  description TEXT,

  -- Repeat configuration
  repeat_count INTEGER NOT NULL DEFAULT 1 CHECK (repeat_count >= 1 AND repeat_count <= 20),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_block_order UNIQUE (endurance_session_id, block_order)
);

-- Index for efficient block lookups
CREATE INDEX idx_segment_block_session_id ON segment_block(endurance_session_id);
```

**3. Updated `endurance_segment` table (now references block, not session):**
```sql
CREATE TABLE IF NOT EXISTS public.endurance_segment (
  id SERIAL PRIMARY KEY,
  block_id INTEGER NOT NULL REFERENCES segment_block(id) ON DELETE CASCADE,
  segment_order INTEGER NOT NULL,  -- Order within block (1, 2, 3...)

  -- Segment type (industry standard)
  segment_type TEXT NOT NULL DEFAULT 'work',  -- warmup, work, recovery, rest, cooldown
  name TEXT,  -- Optional custom name, auto-generated from type if null
  description TEXT,

  -- Target (planned values)
  target_type TEXT NOT NULL,  -- 'time', 'distance', 'open'
  target_value NUMERIC,  -- Duration in seconds OR distance in meters (null for 'open')
  target_heart_rate_zone INTEGER CHECK (target_heart_rate_zone >= 1 AND target_heart_rate_zone <= 5),
  target_pace INTEGER,  -- Target pace in seconds per km (nullable)

  -- Actuals (recorded during/after tracking) - enables per-segment analysis
  actual_duration INTEGER,  -- Actual duration in seconds
  actual_distance NUMERIC,  -- Actual distance in meters
  actual_avg_pace INTEGER,  -- Actual average pace in seconds per km
  actual_avg_heart_rate INTEGER CHECK (actual_avg_heart_rate IS NULL OR (actual_avg_heart_rate >= 30 AND actual_avg_heart_rate <= 250)),
  actual_max_heart_rate INTEGER CHECK (actual_max_heart_rate IS NULL OR (actual_max_heart_rate >= 30 AND actual_max_heart_rate <= 250)),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT segment_type_check CHECK (segment_type IN ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  CONSTRAINT target_type_check CHECK (target_type IN ('time', 'distance', 'open')),
  CONSTRAINT unique_segment_order_in_block UNIQUE (block_id, segment_order)
);

-- Index for efficient segment lookups
CREATE INDEX idx_endurance_segment_block_id ON endurance_segment(block_id);
```

**Key Design Decisions:**
- **Three-level hierarchy**: Session → Block → Segment (cleaner than flat segment list)
- **Block-level repeat**: `repeat_count` is on the block, enabling clean interval definitions
- **Session-level actuals**: Aggregated totals (total distance, overall avg pace, max HR, etc.)
- **Segment-level actuals**: Per-segment metrics for interval analysis ("Did I hit target on each interval?")
- **No duplication**: `training_volume`, `unit`, `heart_rate_zone` only exist in segments
- **Segment types**: Enables auto-naming and visual distinction (warmup vs work vs recovery)
- **Target types**: `time`, `distance`, or `open` (manual advance) per segment
- **All values in metric**: Seconds for time, meters for distance, seconds/km for pace

---

**Segment Type Definitions:**

| Type | Description | Typical Use | Auto-Name |
|------|-------------|-------------|-----------|
| `warmup` | Low-intensity preparation | Start of workout | "Warm Up" |
| `work` | Active effort interval | Main intervals | "Interval 1", "Interval 2"... |
| `recovery` | Active recovery (easy jog/spin) | Between work intervals | "Recovery" |
| `rest` | Standing/walking rest | Between hard sets | "Rest" |
| `cooldown` | Low-intensity wind-down | End of workout | "Cool Down" |

**Auto-Naming Logic:**
```javascript
function getSegmentDisplayName(segment, index, allSegments) {
  if (segment.name) return segment.name;  // Custom name takes priority

  switch (segment.segment_type) {
    case 'warmup': return 'Warm Up';
    case 'cooldown': return 'Cool Down';
    case 'recovery': return 'Recovery';
    case 'rest': return 'Rest';
    case 'work':
      // Count work segments to number them
      const workIndex = allSegments
        .slice(0, index + 1)
        .filter(s => s.segment_type === 'work').length;
      return `Interval ${workIndex}`;
  }
}
```

---

**Migration Strategy:**

```sql
-- Step 1: Create new endurance_segment table (see above)

-- Step 2: Migrate existing sessions to have 1 segment each
INSERT INTO endurance_segment (
  endurance_session_id,
  segment_order,
  segment_type,
  target_type,
  target_value,
  target_heart_rate_zone
)
SELECT
  es.id,
  1,  -- segment_order
  'work',  -- segment_type (default for simple sessions)
  CASE
    WHEN es.unit IN ('minutes', 'seconds') THEN 'time'
    WHEN es.unit IN ('km', 'miles', 'meters') THEN 'distance'
    ELSE 'time'
  END,
  CASE
    WHEN es.unit = 'minutes' THEN es.training_volume * 60  -- Convert to seconds
    WHEN es.unit = 'seconds' THEN es.training_volume
    WHEN es.unit = 'km' THEN es.training_volume * 1000  -- Convert to meters
    WHEN es.unit = 'miles' THEN es.training_volume * 1609.34  -- Convert to meters
    WHEN es.unit = 'meters' THEN es.training_volume
    ELSE es.training_volume * 60  -- Default: assume minutes
  END,
  es.heart_rate_zone
FROM endurance_session es;

-- Step 3: Remove old columns from endurance_session (after verifying migration)
ALTER TABLE endurance_session
  DROP COLUMN IF EXISTS training_volume,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS heart_rate_zone;
```

---

**AI Generation Schema:**

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

SegmentTypeLiteral = Literal['warmup', 'work', 'recovery', 'rest', 'cooldown']
TargetTypeLiteral = Literal['time', 'distance', 'open']

class EnduranceSegment(BaseModel):
    segment_order: int  # Order within the block (1, 2, 3...)
    segment_type: SegmentTypeLiteral = 'work'
    name: Optional[str] = None
    description: Optional[str] = None
    target_type: TargetTypeLiteral  # 'time', 'distance', or 'open'
    target_value: Optional[float] = None  # Seconds for time, meters for distance
    target_heart_rate_zone: Optional[int] = None  # 1-5
    target_pace: Optional[int] = None  # Seconds per km

class SegmentBlock(BaseModel):
    block_order: int  # Order within session (1, 2, 3...)
    name: Optional[str] = None  # Optional block name (e.g., "Main Set")
    description: Optional[str] = None
    repeat_count: int = Field(default=1, ge=1, le=20)  # Repeat all segments in this block
    segments: List[EnduranceSegment]  # REQUIRED: at least 1 segment

class EnduranceSession(BaseModel):
    id: Optional[int] = None
    name: str
    sport_type: EnduranceTypeLiteral
    description: Optional[str] = None
    execution_order: int
    completed: bool = False
    blocks: List[SegmentBlock]  # REQUIRED: at least 1 block
```

**Block-Based Interval Structure:**

The **block-based structure** enables clean interval definitions. Instead of flat segments with repeat counts, segments are grouped into blocks where the entire block can be repeated.

**Structure**: `EnduranceSession → SegmentBlock[] → EnduranceSegment[]`

**How it works:**
1. AI defines blocks with `repeat_count > 1` for interval patterns
2. Each block contains one or more segments executed in order
3. Frontend expands blocks by repeating all segments in the block

**Expansion Logic (frontend `expandBlocksForTracking()`):**
```
Input blocks:
  Block 1 (1x): [warmup]
  Block 2 (4x): [work, recovery]
  Block 3 (1x): [cooldown]

Output segments:
  [warmup, work1, recovery1, work2, recovery2, work3, recovery3, work4, recovery4, cooldown]
```

**Benefits:**
- **Cleaner structure** - blocks explicitly group related segments
- **Fewer AI tokens** - 3 blocks instead of 9 segments
- **Natural interval notation** - "4× (1km + 90s)" maps to one block with repeat_count=4
- **Complex patterns** - supports 3× (2× [200m + 30s] + 3min rest) with nested blocks
- **Block-level metadata** - optional name/description per block

**Visual Display:**
- Blocks with `repeat_count > 1` show a repeat badge: `×4`
- Summary shows: "10 segments (×4)" indicating expanded count and max repeat

**AI Generation Examples:**

**Simple Session (1 block, 1 segment):**
```json
{
  "name": "Easy Run",
  "sport_type": "running",
  "blocks": [
    {
      "block_order": 1,
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "work", "target_type": "time", "target_value": 1800, "target_heart_rate_zone": 2 }
      ]
    }
  ]
}
```

**Interval Session (block-based - RECOMMENDED):**
```json
{
  "name": "4x1km Intervals",
  "sport_type": "running",
  "blocks": [
    {
      "block_order": 1,
      "name": "Warm Up",
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "warmup", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 2,
      "name": "Main Set",
      "repeat_count": 4,
      "segments": [
        { "segment_order": 1, "segment_type": "work", "target_type": "distance", "target_value": 1000, "target_heart_rate_zone": 5 },
        { "segment_order": 2, "segment_type": "recovery", "target_type": "time", "target_value": 90, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 3,
      "name": "Cool Down",
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "cooldown", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2 }
      ]
    }
  ]
}
```

This compact 3-block definition expands to 10 tracking segments:
`warmup → work1 → recovery1 → work2 → recovery2 → work3 → recovery3 → work4 → recovery4 → cooldown`

**Pyramid Intervals (multiple blocks with different repeats):**
```json
{
  "name": "Pyramid 200-400-200",
  "sport_type": "running",
  "blocks": [
    {
      "block_order": 1,
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "warmup", "target_type": "time", "target_value": 600, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 2,
      "name": "200m Set",
      "repeat_count": 2,
      "segments": [
        { "segment_order": 1, "segment_type": "work", "target_type": "distance", "target_value": 200, "target_heart_rate_zone": 5 },
        { "segment_order": 2, "segment_type": "recovery", "target_type": "time", "target_value": 60, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 3,
      "name": "400m Peak",
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "work", "target_type": "distance", "target_value": 400, "target_heart_rate_zone": 5 },
        { "segment_order": 2, "segment_type": "recovery", "target_type": "time", "target_value": 90, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 4,
      "name": "200m Set",
      "repeat_count": 2,
      "segments": [
        { "segment_order": 1, "segment_type": "work", "target_type": "distance", "target_value": 200, "target_heart_rate_zone": 5 },
        { "segment_order": 2, "segment_type": "recovery", "target_type": "time", "target_value": 60, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 5,
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "cooldown", "target_type": "time", "target_value": 600, "target_heart_rate_zone": 2 }
      ]
    }
  ]
}
```

**Complex Interval (work + recovery + rest in block):**
```json
{
  "name": "4x1km with Rest",
  "sport_type": "running",
  "blocks": [
    {
      "block_order": 1,
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "warmup", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2 }
      ]
    },
    {
      "block_order": 2,
      "name": "Main Set",
      "repeat_count": 4,
      "segments": [
        { "segment_order": 1, "segment_type": "work", "target_type": "distance", "target_value": 1000, "target_heart_rate_zone": 5 },
        { "segment_order": 2, "segment_type": "recovery", "target_type": "time", "target_value": 60, "target_heart_rate_zone": 2 },
        { "segment_order": 3, "segment_type": "rest", "target_type": "time", "target_value": 120, "target_heart_rate_zone": 1 }
      ]
    },
    {
      "block_order": 3,
      "repeat_count": 1,
      "segments": [
        { "segment_order": 1, "segment_type": "cooldown", "target_type": "time", "target_value": 300, "target_heart_rate_zone": 2 }
      ]
    }
  ]
}
```

---

**Live Tracking with Segments:**

**Auto-Advance Behavior:**
1. **Time-based segments**: Auto-advance when `target_value` seconds elapsed
2. **Distance-based segments**: Auto-advance when `target_value` meters reached
3. **Open segments**: Manual "Next" button required
4. **Audio/haptic alerts**: 3-2-1 countdown before auto-advance, beep on segment change
5. **Manual override**: "Skip to Next" button always visible

**Live Tracking UI:**
```
┌─────────────────────────────────────────────┐
│  INTERVAL 2 of 4                   ⏸️ PAUSE │
│  ████████████░░░░░░░░  720m / 1000m         │
├─────────────────────────────────────────────┤
│                                             │
│            15:42          │     2:34        │
│         Total Time        │  Segment Time   │
│                                             │
├─────────────────────────────────────────────┤
│    4:12/km   │   162 bpm   │   Zone 5 ✓     │
│  Current Pace │  Heart Rate │  Target: 5    │
├─────────────────────────────────────────────┤
│  ▶ NEXT: Recovery • 1:30 • Zone 2           │
└─────────────────────────────────────────────┘
         [  PAUSE  ]     [  SKIP →  ]
```

**Segment Progress Visualization:**
```
┌────────────────────────────────────────────┐
│ Warm Up │ Int 1 │ Rec │ Int 2 │ Rec │ ...  │
│   ✓     │  ███  │     │       │     │      │
│ 5:00    │ 2:34  │     │       │     │      │
└────────────────────────────────────────────┘
```

**Recording Per-Segment Actuals:**
- When segment completes (auto-advance or manual):
  1. Record `completed_at` timestamp
  2. Calculate and store `actual_duration`, `actual_distance`, `actual_avg_pace`, `actual_avg_heart_rate`, `actual_max_heart_rate`
  3. Start next segment: set `started_at` timestamp
- On session complete: Aggregate all segment actuals into session-level totals

---

**Frontend Visualization:**

**Single Segment (Simple Session):**
```
┌─────────────────────────────────┐
│ 🏃 Easy Run                     │
│ 30 min • Zone 2                 │
│                    [▶ START]    │
└─────────────────────────────────┘
```
- No need to show blocks - display segment details inline
- Shows target and zone directly

**Multiple Blocks (Interval Session - CURRENT IMPLEMENTATION):**
```
┌─────────────────────────────────────────────┐
│ 🏃 4x1km Intervals                          │
│ 10 segments (×4) • ~35 min                  │
├─────────────────────────────────────────────┤
│ ① Warm Up                                   │
│   └─ warmup • 5:00 • Zone 2                 │
│ ② Main Set                          ×4      │
│   ├─ work • 1.0 km • Zone 5                 │
│   └─ recovery • 1:30 • Zone 2               │
│ ③ Cool Down                                 │
│   └─ cooldown • 5:00 • Zone 2               │
├─────────────────────────────────────────────┤
│                              [▶ START]      │
└─────────────────────────────────────────────┘
```
- Shows block-based structure with segments nested under each block
- Repeat badge `×4` shown on blocks with repeat_count > 1
- Summary shows expanded segment count: "10 segments (×4)"
- During tracking, blocks are expanded to individual tracking segments

**Completed Session with Per-Segment Analysis:**
```
┌─────────────────────────────────────────────┐
│ 🏃 4x1km Intervals              ✓ COMPLETE  │
│ Total: 6.2 km • 34:21 • Avg 152 bpm         │
├─────────────────────────────────────────────┤
│ ✓ Warm Up      │ 5:02    │ Avg 128 bpm      │
│ ✓ Interval 1   │ 4:12/km │ Avg 168 bpm  ✓   │ ← Hit zone target
│ ✓ Recovery     │ 1:28    │ Avg 142 bpm      │
│ ✓ Interval 2   │ 4:08/km │ Avg 172 bpm  ✓   │
│ ✓ Recovery     │ 1:32    │ Avg 145 bpm      │
│ ✓ Interval 3   │ 4:22/km │ Avg 164 bpm  ⚠   │ ← Missed zone target
│ ✓ Recovery     │ 1:35    │ Avg 148 bpm      │
│ ✓ Interval 4   │ 4:05/km │ Avg 175 bpm  ✓   │
│ ✓ Cool Down    │ 5:15    │ Avg 125 bpm      │
└─────────────────────────────────────────────┘
```

---

**Benefits:**
- **Per-segment analysis**: See which intervals you hit/missed targets on
- **Industry-standard segment types**: warmup/work/recovery/rest/cooldown matches Garmin/TrainingPeaks
- **Explicit rest segments**: Rest and recovery are first-class segments, not implicit gaps
- **Auto-advance**: Time and distance targets auto-advance with alerts (like Garmin)
- **Open segments**: Manual advance for unstructured portions
- **No duplicate columns**: Session has aggregates, segments have targets + per-segment actuals
- **Live tracking visibility**: See current segment, progress, and what's next
- **Meaningful post-workout data**: "I hit 3 of 4 intervals at target pace"
- **Clean block-based structure**: Session → Block → Segment hierarchy is intuitive and scalable
- **Block-level repeats**: `repeat_count` on blocks enables "4× (1km + 90s)" with just 3 blocks
- **Complex interval patterns**: Supports multi-segment blocks with work + recovery + rest together
- **Reduced AI tokens**: 3 blocks instead of 10 segments for a typical interval workout
- **Block metadata**: Optional name/description per block for better organization

---

### 🟠 Tier 3: Higher Complexity, Strategic Value

#### 13. Strava Integration (FREE TIER - Rate Limited)
**Complexity: High | Impact: High**

Connect to Strava API (free tier available with rate limits) to import activities, sync workouts, and optionally export completed sessions back to Strava. This taps into the largest endurance community and provides automatic data sync. Requires OAuth implementation, Strava API integration, activity mapping, and bidirectional sync logic. 

**Note**: This would also require to safe the GPS coordinates
**Note**: Free tier may have rate limits; evaluate if limits are acceptable before implementation.


#### 15. Garmin / Polar / Suunto Watch Integration (PAID - DEFERRED)
**Complexity: High | Impact: Medium-High**

**STATUS: DEFERRED** - Most watch manufacturer APIs require paid developer accounts or have usage fees. These integrations are marked for future consideration if budget becomes available. Alternative: Users can sync watch data through Apple Health/Google Fit (free) which many watches already support. If implemented, would require multiple API integrations, OAuth flows, and data normalization.

#### 16. Training Load & Fatigue Metrics
**Complexity: High | Impact: High**

Calculate advanced metrics like Training Stress Score (TSS), Chronic Training Load (CTL), Acute Training Load (ATL), and Training Stress Balance (TSB). These metrics help athletes optimize training intensity and prevent overtraining. Requires complex calculations, historical data analysis, and visualization of load trends. Similar to TrainingPeaks' performance management chart.

#### 17. Pace/Power Zone Training
**Complexity: High | Impact: Medium-High**

Implement zone-based training where users can set custom pace or power zones (similar to heart rate zones). Provide real-time zone feedback during workouts and post-session zone analysis. This is essential for structured endurance training programs. Requires zone calculation logic, real-time monitoring, and zone visualization.

---

### 🔴 Tier 4: Complex, Long-Term Strategic

#### 18. AI-Powered Endurance Plan Generation
**Complexity: Very High | Impact: Very High**

Enhance the AI plan generator to create sophisticated endurance training plans with periodization, tapering, race-specific preparation, and intensity distribution. Consider factors like base building, peak performance timing, and recovery weeks. This would make EvolveAI competitive with dedicated endurance coaching platforms. Requires extensive prompt engineering, endurance training science integration, and plan validation logic.

#### 19. Social Features & Challenges
**Complexity: Very High | Impact: Medium**

Add social features: share workouts, join challenges, compare stats with friends, and create training groups. This increases engagement and retention but requires significant infrastructure (user relationships, notifications, moderation). Similar to Strava's social layer but integrated with strength training.

#### 20. Race Prediction & Performance Modeling
**Complexity: Very High | Impact: Medium-High**

Use historical data to predict race times, estimate fitness levels, and model performance improvements. Provide race pace calculators and training recommendations based on target race goals. This requires sophisticated algorithms and extensive data collection. Similar to Runalyze or Final Surge features.

---

## Implementation Recommendations

### Phase 1 (Quick Wins - 2-4 weeks)
Focus on Tier 1 improvements (#1) to immediately improve the endurance experience with minimal effort:
- Enhanced display cards (#1)
- Note: Sport-specific metrics and visual enhancements are now included in insights (#4)

### Phase 1.5 (Onboarding Permissions - Foundation - 1 week)
**FOUNDATION**: Add permissions step to onboarding flow (#2):
- Request Health/Google Fit permissions (Apple Health on iOS, Google Fit on Android)
- Request location tracking permissions (for GPS-based workout tracking)
- Auto-detect platform and request appropriate permissions
- Store permission status for later use
- This step must be completed before users can use live tracking features

### Phase 2 (Live Tracking - Priority - 4-6 weeks)
**HIGH PRIORITY**: Implement live endurance session tracking (#3) with Health/Google Fit import option:
- **Note**: Permissions already granted in Phase 1.5 (#2), so no permission requests needed here
- **Live Tracking**:
  - Full-screen workout tracking screen (Strava-like)
  - GPS tracking for distance, time, and route
  - Heart rate capture if monitor connected (watch)
  - Start/Pause/Resume/Stop controls
  - Real-time metrics display (time, distance, pace, HR)
  - Background location tracking (for distance measurement only)
- **Health Import** (Alternative):
  - Apple Health/Google Fit integration
  - Auto-detect platform (iOS/Android)
  - Show workout picker with workouts sorted by occurrence (time) - user manually selects
  - Import heart rate, pace, distance, elevation
  - Store data source (live_tracking vs healthkit/google_fit)

### Phase 2.5 (Insights Integration - 2-3 weeks)
**AFTER LIVE TRACKING**: Implement insights (#4) using the rich data captured from live tracking:
- **Note**: All calculations performed in frontend (no backend calculation logic needed)
- **4a) Performance Metrics**: Analytics integration (includes progress charts with clustered bar charts)
  - Unified sports analytics view with filter toggle (all sports: strength, running, cycling, etc.)
  - Sport-specific metrics and visual enhancements (determine which metrics are important for each sport type)
  - Heart rate zone analytics using actual HR data from live tracking
  - Fetch data from database via Supabase client, calculate metrics in frontend service
- **4b) Recovery**: Science-based recovery tracking (all calculations in frontend)
  - Volume load calculation by `target_area` (from exercises table via JOIN)
  - Adaptive baseline calculation (use available data, max 28 days)
  - ACWR calculation with proportional scaling
  - Recovery status indicators and recommendations
  - Session load calculations (internal load, UX stress score) computed client-side

### Phase 3 (Foundation - 1-2 months)
Implement Tier 2 improvements (#6) to build core endurance functionality:
- Interval workouts (#6) for structured endurance training

### Phase 4 (Additional Integrations - 2-3 months)
Add remaining Tier 3 integrations (#11, #13-17) based on user demand:
- **Note**: Live tracking (#3) and Health/Google Fit import moved to Phase 2 (priority)
- **Secondary**: Strava (free tier, evaluate rate limits)
- **Deferred**: Watch manufacturer APIs (require paid accounts - users can sync via Health/Google Fit instead)
- Manual GPS route import (no API costs)

### Phase 5 (Advanced Features - 3-6 months)
Evaluate Tier 4 features (#18-20) based on strategic priorities and user feedback.

---

## Project Constraints & Decisions

**User Base**: Support both strength and endurance users equally - no prioritization needed.

**Platform**: Support both iOS and Android with automatic platform detection for native health integrations.

**Budget**: No paid API integrations - focus on free solutions only (Apple HealthKit, Google Fit are free; Strava API has free tier but may have rate limits).

**Timeline**: No specific deadlines - focus on quality and user value over speed.

**Competition**: No direct competition - opportunity to innovate and set standards in the market.

---

## Technical Considerations

### Health/Google Fit Integration Details

**Prerequisites**: Permissions already granted during onboarding (#2), so no permission requests needed here.

**Workflow** (Alternative to Live Tracking):
1. User taps "Import from Health" button on planned endurance session card
2. **Note**: Permissions already granted, so directly query Health/Google Fit
3. System queries Health/Google Fit for workouts from same day
4. Show picker with all workouts sorted by occurrence (time) - user manually selects matching workout
5. If no workouts found: Show message "No workouts found in Health/Google Fit. Start tracking instead?"
6. Import data: actual_time, actual_distance, average_pace, average_heart_rate, max_heart_rate, elevation_gain
7. Store `data_source` = 'healthkit' or 'google_fit' (mutually exclusive with 'live_tracking')
8. Overwrites planned volume with imported values (same as live tracking)

**Selection Logic**:
- Show all workouts from same day in picker, sorted by occurrence (time)
- Picker displays:
  - Workout time
  - Distance/duration
  - Sport type
  - Heart rate (if available)
- User manually selects which workout to link
- If no workouts found: Show message "No workouts found in Health/Google Fit. Start tracking instead?"
- User can always choose "Start Tracking" (live tracking) even if workouts exist in Health/Google Fit

**Watch Compatibility**:
- ✅ Apple Watch: Automatically syncs to HealthKit (no additional setup)
- ✅ Garmin: Can sync to HealthKit (iOS) or Google Fit (Android) if user enables in Garmin Connect
- ✅ Most modern watches: Support Health/Google Fit sync
- ⚠️ Garmin direct API: Deferred (paid), but not needed if users enable Health/Google Fit sync

### Database Schema Changes Needed
- Add fields to `endurance_session` table:
  - `actual_time` (minutes, nullable) - Overwrites `training_volume` if unit was "minutes"
  - `actual_distance` (numeric, nullable) - Overwrites `training_volume` if unit was distance
  - `average_pace` (seconds per km/mile, nullable)
  - `average_heart_rate` (bpm, nullable) - Only if HR monitor connected or imported
  - `max_heart_rate` (bpm, nullable) - Only if HR monitor connected or imported
  - `elevation_gain` (meters/feet, nullable)
  - `external_activity_id` (text, nullable) - For Strava sync (optional)
  - **Note**: GPS is used only for tracking distance, not for saving or visualizing routes
  - `data_source` (text, nullable) - 'live_tracking', 'healthkit', 'google_fit', 'strava' - tracks how data was captured (mutually exclusive)
  - `health_workout_id` (text, nullable) - ID of linked workout in Health/Google Fit (if imported)
  - `tracked_at` (timestamp, nullable) - When live tracking started
  - `completed_at` (timestamp, nullable) - When tracking finished or imported

### New Tables Needed
- `endurance_templates` - Saved session templates
- `external_integrations` - OAuth tokens and sync status (for free integrations: HealthKit, Google Fit, Strava free tier)
- **Note**: Calculated metrics (session load, recovery status, ACWR, etc.) are computed in frontend, not stored in database
- **Note**: GPS routes are not saved - GPS is used only for tracking distance during workouts

### Frontend Dependencies
- Charts: `react-native-chart-kit` (free) or `victory-native` (free)
- Health APIs:
  - `react-native-health` (iOS - free, HealthKit access) - **Required for Phase 1.5 (#2) and Phase 2**
  - `react-native-google-fit` (Android - free, Google Fit access) - **Required for Phase 1.5 (#2) and Phase 2**
  - Platform detection: `react-native-device-info` or `expo-device` - **Required for Phase 1.5 (#2)**
- Location tracking:
  - `expo-location` or `@react-native-community/geolocation` - **Required for Phase 1.5 (#2) and Phase 2** (for distance tracking only, not route visualization)

### Backend Dependencies
- Strava API client (free tier - evaluate rate limits) - only if Strava integration implemented
- GPX parsing library (free, e.g., `gpxpy` for Python) - only if GPS route import implemented
- **Note**: Insights calculations (session load, recovery, ACWR) are performed in frontend - no backend calculation logic needed
- **Note**: Garmin/Polar/Suunto APIs require paid accounts - deferred

---

## Success Metrics

Track these metrics to measure improvement impact:
- **Engagement**: % of users logging endurance sessions
- **Completion Rate**: % of planned endurance sessions completed
- **Data Richness**: Average number of metrics logged per session
- **Retention**: User retention for endurance-focused users
- **Feature Adoption**: Usage of new features (templates, analytics, integrations)

---

## Conclusion

The quick wins in Tier 1 can dramatically improve the endurance experience with minimal effort. Focus on visual polish first, then implement live tracking to capture rich data, followed by analytics integration that leverages that data.

**Recommended Starting Point**: 
1. **Phase 1**: Implement improvement #1 (enhanced display cards)
2. **Phase 1.5 (Foundation)**: Add permissions step to onboarding (#2) - required before live tracking
   - Request Health/Google Fit permissions
   - Request location tracking permissions
   - Store permission status for later use
3. **Phase 2 (Priority)**: Add live endurance session tracking (#3) with Health/Google Fit import option - this is the highest value addition
   - Live tracking eliminates manual entry completely
   - Makes endurance sessions feel as engaging as strength exercises
   - Health/Google Fit import provides alternative for users who track elsewhere
   - **Note**: Permissions already granted in Phase 1.5 (#2), so no permission requests needed
   - **Captures rich data** (actual_time, actual_distance, HR, pace, route) that analytics will use
4. **Phase 2.5**: Implement insights (#4) using the rich data from live tracking
   - **4a) Performance Metrics**: Analytics now has real data to work with (actual_time, actual_distance, HR metrics)
     - Clustered bar charts show meaningful trends using tracked data across all sports
     - Sport-specific metrics and visual enhancements (determine which metrics are important for each sport type)
     - Heart rate zone analytics use actual HR data from live tracking
   - **4b) Recovery**: Science-based recovery tracking
     - Volume load calculation by `target_area` from exercises table
     - Adaptive baseline and ACWR calculations
     - Recovery status indicators and recommendations
5. **Phase 3**: Build on the foundation with interval workouts
   - Interval workouts (#6) for structured endurance training

**Integration Strategy**: Live tracking + Health/Google Fit import is prioritized because:
- **Live Tracking**: 
  - Strava-like experience makes tracking engaging
  - Automatic GPS capture eliminates manual entry (distance tracking only)
  - Works with or without heart rate monitor
- **Health/Google Fit Import**:
  - Works with Apple Watch automatically (no separate integration needed)
  - Works with Garmin and most watches via Health/Google Fit sync
  - Provides rich data (HR, pace, distance, elevation, route) automatically
  - Free, cross-platform, and auto-detects platform
  - Provides flexibility for users who prefer tracking in other apps
