# Frontend - Onboarding - Production Readiness

**Status**: 0% Complete | Last Updated: 2025-11-16

---

## 🔴 CRITICAL (Must Fix Before TestFlight)

- [x] **Centralize and enforce onboarding routing** - `frontend/src/hooks/useAppRouting.ts:59-90` - Verify unauthenticated users route to `/login`, unverified OAuth to `/email-verification`, and missing profile/questions to `/onboarding`. Add guards for unexpected nulls.
- [x] **Reliable resume logic for initial questions** - `frontend/src/hooks/useAppRouting.ts:95-126` - Ensure detection of "questions present, responses missing" always routes to `/onboarding/initial-questions` and does not loop if already there.
- [x] **Plan generation gate** - `frontend/src/hooks/useAppRouting.ts:131-140` - Route to `/generate-plan` only when plan absence is confirmed and not loading; prevent flicker during `trainingPlanLoading`.
- [x] **Plan review/acceptance path** - `frontend/src/hooks/useAppRouting.ts:142-159` - Confirm routing to `/(tabs)` opens plan review flow until `planAccepted` true; handle edge cases if plan gets invalidated.
- [x] **Navigation race conditions and dedupe** - `frontend/app/index.tsx:22-91` - Validate debounce, in-flight lock, and fallback replace calls prevent double navigations and crashes on fast state changes.
- [x] **Error handling does not leak sensitive info** - `frontend/app/onboarding.tsx:12-27`, `frontend/app/onboarding/initial-questions.tsx:16-19` - Replace raw `console.error` or sensitive strings with user-safe alerts and structured logging. Keep user message generic.
- [x] **Console logging policy compliance** - All onboarding routes/components - Ensure logs only cover user flow status (where, why, next step) and remove noisy debug prints [[memory:8636680]].
- [x] **Happy-path and error-path tests for routing** - `frontend/src/__tests__/routing/useAppRouting.test.ts:48-141` - Expand tests to cover: unverified OAuth, missing profile, questions-no-responses, no plan, plan not accepted, and error state stay-put.
- [x] **Per-step validation gates before advancing** - `frontend/src/components/onboarding/ConversationalOnboarding.tsx:209-299,241-262,275-281,294-299,575-596` - Enforce that each step requires valid input before moving forward (username length, personal info completeness, goal description min length, experience selected, and at least one answer for initial questions). Add unit tests covering valid/invalid transitions and preventing advance when invalid.

---

## 🟡 IMPORTANT (Should Fix Before App Store Release)

- [ ] **Loading UX clarity while gating** - `frontend/app/index.tsx:113-135` - Confirm copy and visuals clearly communicate profile/plan preparation; add test to ensure loading only shows during actual gates.
- [ ] **Persist resume intent** - `frontend/app/index.tsx:67-79` and `frontend/app/onboarding.tsx:9-13` - Standardize `resume` param usage and ensure `ConversationalOnboarding` respects it (skip intro loaders when resuming).
- [ ] **Unified logging for navigation events** - `frontend/app/index.tsx:56-59` and `frontend/src/utils/logger.ts` - Ensure `logNavigation` includes from, to, reason; route results match `useAppRouting.routingReason`.
- [ ] **Initial questions completion flow** - `frontend/app/onboarding/initial-questions.tsx:11-19,23-27` - After completion, refresh profile and route to `/(tabs)`; handle failure with retry/back; add e2e test.
- [ ] **Generate plan screen integration** - `frontend/app/generate-plan.tsx:1-3` and `frontend/src/screens/GeneratePlanScreen.tsx` - Verify plan creation errors surface to user and route back to review upon success.
- [ ] **Accessibility basics** - Onboarding screens - Ensure touch targets, roles, and focus order; verify alert buttons are accessible.
- [ ] **Analytics hooks for funnel** - Add events: onboarding_start, initial_questions_started/completed, plan_generated, plan_accepted/declined; ensure PII-safe payloads.
- [ ] **Empty/error states** - Handle missing `initial_questions` structure variants gracefully (`array` or `{ questions: [] }`), mirroring logic in `useAppRouting`.

---

## 🟢 NICE TO HAVE (Can Fix After Public Launch)

- [ ] **Localization of onboarding copy** - Externalize strings for alerts, headers, and CTAs.
- [ ] **Transitions and micro-animations** - Smooth transitions between onboarding steps and resume points.
- [ ] **Visual regression tests** - Snapshot core onboarding screens across themes and platforms.
- [ ] **Deeplink re-entry** - Support deeplinking into onboarding steps with safe guards.

---

## 📋 Quick Reference

**Environment Variables:**
- `EXPO_PUBLIC_API_BASE_URL` - Backend API base URL (Required)
- `EXPO_PUBLIC_SENTRY_DSN` - Error reporting DSN (Optional but recommended)

**Key Files:**
- `frontend/src/hooks/useAppRouting.ts` - Centralized onboarding routing decisions
- `frontend/app/index.tsx` - Root navigation handler honoring routing decisions
- `frontend/app/onboarding.tsx` - Conversational onboarding entry
- `frontend/app/onboarding/initial-questions.tsx` - Resume at initial questions
- `frontend/app/generate-plan.tsx` - Plan generation entry
- `frontend/src/components/onboarding/ConversationalOnboarding.tsx` - Onboarding UI logic
- `frontend/src/screens/GeneratePlanScreen.tsx` - Plan generation flow
- `frontend/src/__tests__/routing/useAppRouting.test.ts` - Routing unit tests
- `frontend/src/__tests__/utils/validation.test.ts` - Onboarding validation unit tests (steps + question-level)
- `frontend/src/utils/logger.ts` - Logging utilities (flow/status logs)

**Related Docs:**
- `docs/to_production/02_FRONTEND_AUTHENTICATION.md` - Auth flows and prerequisites
- `docs/to_production/README.md` - Section 3: Frontend - Onboarding


