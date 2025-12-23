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

#### 3. Live Endurance Session Tracking (Strava-like Experience)
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

#### 4. Endurance Analytics Integration
**Complexity: Low | Impact: High**

Include endurance sessions in the existing analytics pipeline (currently skipped in `insightsAnalyticsService.ts`). Calculate weekly volume trends, consistency metrics, and performance scores for endurance activities. This leverages existing analytics infrastructure and provides immediate value to endurance athletes. Uses the rich data captured from live tracking (#3) to provide meaningful insights.

**Implementation Details:**

**UI Approach: Combined View with Filter Toggle** (Recommended)
- **Default view**: Show combined analytics (strength + endurance) for unified training load insights
- **Filter toggle**: Add segmented control or toggle buttons at top of InsightsContent: "All" | "Strength" | "Endurance"
- **Benefits**: 
  - Most users do both modalities - unified view shows overall progress better
  - Less navigation needed, more intuitive
  - Can show combined metrics (total weekly volume, overall consistency)
  - Filter allows focused view when needed
- **Alternative (not recommended)**: Separate tabs would require more navigation and lose the unified training picture

**Backend Changes:**
1. **Frontend Service (`insightsAnalyticsService.ts`)**:
   - Modify `extractCompletedExercisesFromLocalPlan()`:
     - Remove the skip logic for endurance sessions (line 58-61)
     - Extract endurance session data: sportType, trainingVolume, unit, heartRateZone, completedAt
     - **Priority**: Extract `actualDistance` and `actualTime` when available (from database schema populated by live tracking #3), fallback to `trainingVolume` if not set
     - Convert endurance volume to standardized units (minutes or equivalent volume metric)
     - Pass both distance and time arrays to chart components for clustered bar display

2. Create `extractCompletedEnduranceSessions()` function:
   - Similar structure to strength exercise extraction
   - Extract: sport_type, training_volume, unit, heart_rate_zone, completed_at
   - **Priority**: Extract `actual_distance` and `actual_time` when available (from live tracking #3 or manual entry), fallback to `training_volume` if not set
   - Calculate endurance-specific metrics: weekly distance/time, zone distribution, sport type breakdown
   - Group by week for chart data: aggregate distance and time separately for clustered bar chart

3. **Backend Service (`insights_service.py`)**:
   - Update `_calculate_week_volume()` to include endurance sessions:
     - Calculate strength volume (existing logic: weight × reps × sets)
     - Add endurance volume: convert to minutes (or standardized metric)
     - Return combined total or separate metrics
   - Update `extract_volume_progress()` to handle both modalities:
     - Check if strength exercises exist
     - Check if endurance sessions exist
     - Generate description based on available data (strength-only, endurance-only, or combined)

4. Update analytics calculations:
   - **Weekly Volume Trends**: Include endurance volume (convert to common unit or show separately)
   - **Consistency Metrics**: Track endurance session frequency alongside strength training
   - **Performance Scores**: Calculate endurance-specific scores (volume progression, zone adherence, sport variety)
   - **Heart Rate Zone Analytics**: If HR data available (from live tracking #3), calculate time-in-zone metrics, average/max HR, and zone distribution across sessions

**Frontend Changes:**

**UI Layout Order (Top to Bottom):**
1. **AI Insights Card (Always on Top)**:
   - Keep AI insights card at the top of InsightsContent (before filter)
   - AI message adapts to available data: includes strength OR endurance (whichever is present)
   - If neither strength nor endurance data exists, exclude from prompt (show empty state or generic message)
   - Message dynamically mentions "strength training", "endurance training", or "training" based on available data

2. **Filter Toggle/Dropdown (Below AI Insights)**:
   - Add segmented control or dropdown: "All" | "Strength" | "Endurance"
   - Position: Below AI insights card, above all other charts/cards
   - Filter data based on selected view
   - Update all charts/cards below to respect filter
   - Default: "All" (shows combined data)

3. Update chart components:
   - **VolumeTrendChart Enhancement**: Extend existing `VolumeTrendChart` component to support endurance data
   - **Clustered Bar Chart for Endurance Volume**:
     - **Chart Type**: Clustered bar chart with dual y-axes (recommended approach)
     - **Display Logic**:
       - When both `actual_distance` and `actual_time` exist: Show two bars per week (clustered)
         - Distance bar: Left y-axis (km/miles) - primary metric for outdoor activities
         - Time bar: Right y-axis (minutes) - secondary metric
         - Use distinct colors (e.g., distance = blue, time = green)
         - Clear axis labels: "Distance (km)" on left, "Duration (min)" on right
       - When only distance exists: Show single distance bar (single y-axis)
       - When only time exists: Show single time bar (single y-axis) - handles gym cycle case
       - When neither exists: Fall back to `training_volume` with unit display
     - **Benefits**:
       - Handles all scenarios: outdoor activities (distance + time), indoor activities (time only), live tracking (both)
       - Shows most relevant metric prominently (distance for outdoor, time for indoor)
       - Space-efficient: one chart that adapts to available data
       - Consistent with existing bar chart style in codebase
     - **Implementation**:
       - Extend `VolumeTrendChart` props to accept optional `distance` and `time` arrays
       - Render two bars per week when both metrics exist (clustered, side-by-side)
       - Add left y-axis (distance) and right y-axis (time) when both present
       - Use distinct colors for each metric with legend
       - Maintain existing period filter functionality
   - Add endurance-specific visualizations: zone distribution, sport type breakdown
   - **Progress Charts**: Create line/bar charts showing weekly endurance volume trends, distance/time progression, and heart rate zone distribution over time
   - Reuse existing charting libraries (`react-native-chart-kit` or similar)
   - Visual progress tracking is crucial for endurance athletes and provides immediate motivation
   - **Heart Rate Zone Analytics**: If users have actual heart rate data (from live tracking #3 or Health import), calculate time-in-zone metrics, average HR, max HR, and HR zone distribution across sessions
   - Visualize zone distribution with pie charts and show trends over time
   - Provides valuable training load insights similar to TrainingPeaks' TSS (Training Stress Score)

4. Update metrics display:
   - Show combined totals when "All" selected
   - Show modality-specific metrics when filtered
   - Add endurance-specific KPIs: weekly endurance volume, average zone, most common sport
   - Add HR metrics when available: average HR, max HR, zone distribution

**Backend AI Prompt Changes:**
1. Update `generate_insights_summary_prompt()` in `backend/app/helpers/prompts/insights_prompts.py`:
   - Check if strength exercises exist in training plan
   - Check if endurance sessions exist in training plan
   - Conditionally include sections:
     - If strength exists: Include volume_progress, weak_points, top_exercises (strength-focused)
     - If endurance exists: Include endurance volume, zone distribution, sport type breakdown
     - If both exist: Include combined metrics
     - If neither exists: Return minimal prompt or skip AI generation
   - Update prompt to mention "strength training" or "endurance training" or "training" based on what's available
   - Keep non-technical, friendly language rules

#### 5. Sport-Specific Visual Enhancements
**Complexity: Low | Impact: Medium-High**

Add sport-specific visual elements and display metrics in contextually relevant formats for each sport type. These small UI improvements make the app feel purpose-built for each sport type. Requires only frontend component enhancements.

**Metrics per Sport Type** (minimal set, combining where possible):

**Common Metrics** (all sports):
- Time, Distance, Heart Rate (avg/max), Pace/Speed

**Sport-Specific Displays**:
- **Running**: Pace (min/km or min/mile), Distance, Time, HR, Elevation
- **Cycling**: Speed (km/h or mph), Distance, Time, HR, Elevation
- **Swimming**: Pace (min/100m or min/100yd), Distance, Time, HR
- **Rowing**: Pace (min/500m), Distance, Time, HR
- **Hiking**: Pace (min/km), Distance, Time, HR, Elevation
- **Walking**: Pace (min/km), Distance, Time, HR
- **Elliptical**: Pace (min/km equivalent), Distance, Time, HR
- **Stair Climbing**: Floors/Stairs, Time, HR, Elevation
- **Jump Rope**: Time, HR, Jumps (if available)
- **Other**: Time, Distance (if applicable), HR

**Visual Enhancements**:
- Sport-specific color schemes and icons
- Contextual metric formatting (pace vs speed based on sport)
- Elevation display for outdoor activities (running, cycling, hiking, stair climbing)
- Combined metric displays where possible (e.g., pace + distance = speed)

---

### 🟡 Tier 2: Medium Complexity, High Impact

#### 6. Multi-Session Workouts (Intervals)
**Complexity: Medium | Impact: Medium-High**

Support interval workouts by allowing multiple endurance sessions within a single training day (e.g., "5min warm-up + 4x 1km intervals + 5min cool-down"). Each interval can have different zones, paces, or distances. This is essential for serious endurance training and currently requires manual session creation. Requires UI for interval builder and backend logic for session grouping.

---

### 🟠 Tier 3: Higher Complexity, Strategic Value

#### 13. Strava Integration (FREE TIER - Rate Limited)
**Complexity: High | Impact: High**

Connect to Strava API (free tier available with rate limits) to import activities, sync workouts, and optionally export completed sessions back to Strava. This taps into the largest endurance community and provides automatic data sync. Requires OAuth implementation, Strava API integration, activity mapping, and bidirectional sync logic. **Note**: Free tier may have rate limits; evaluate if limits are acceptable before implementation.


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
Focus on Tier 1 improvements (#1, #5) to immediately improve the endurance experience with minimal effort:
- Enhanced display cards (#1)
- Visual enhancements (#5)

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

### Phase 2.5 (Analytics Integration - 2-3 weeks)
**AFTER LIVE TRACKING**: Implement endurance analytics integration (#4) using the rich data captured from live tracking:
- Analytics integration (includes progress charts with clustered bar charts)
- Combined strength + endurance analytics view with filter toggle
- Heart rate zone analytics using actual HR data from live tracking

### Phase 3 (Foundation - 1-2 months)
Implement Tier 2 improvements (#6) to build core endurance functionality:
- Interval workouts

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
- `endurance_metrics` - Calculated metrics (TSS, CTL, etc.)
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
- Strava API client (free tier - evaluate rate limits)
- GPX parsing library (free, e.g., `gpxpy` for Python)
- Health data normalization logic (custom implementation)
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
1. **Phase 1**: Implement improvement #1 (enhanced display cards) and #5 (visual enhancements)
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
4. **Phase 2.5**: Implement endurance analytics integration (#4) using the rich data from live tracking
   - Analytics now has real data to work with (actual_time, actual_distance, HR metrics)
   - Clustered bar charts show meaningful trends using tracked data
   - Heart rate zone analytics use actual HR data from live tracking
5. **Phase 3**: Build on the foundation with progression tracking, templates, and additional features

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
