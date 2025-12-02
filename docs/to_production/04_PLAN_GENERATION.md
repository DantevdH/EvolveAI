# Plan Generation - Production Readiness

**Status**: 0% Complete | Last Updated: 2025-01-16

---

## 🔴 CRITICAL (Must Fix Before TestFlight)

### Backend

- [ ] **Input validation for plan generation request** - `backend/core/training/training_api.py:357-375` - Validate all required fields (initial_responses, initial_questions, personal_info, user_profile_id, jwt_token) with clear error messages; reject empty or malformed data.
- [ ] **JWT token validation and user extraction** - `backend/core/training/training_api.py:365` - Ensure `extract_user_id_from_jwt` handles invalid/expired tokens gracefully; add error handling for token parsing failures.
- [ ] **Idempotency check for existing plans** - `backend/core/training/training_api.py:380-395` - Verify idempotency logic correctly detects existing plans and returns them without re-generation; handle edge cases where plan exists but is incomplete.
- [ ] **Error handling for plan generation failures** - `backend/core/training/training_api.py:515-520` - Ensure all LLM/API failures surface user-safe error messages; log detailed errors server-side without exposing sensitive data.
- [ ] **Database save failure handling** - `backend/core/training/training_api.py:527-539` - If plan generation succeeds but DB save fails, ensure proper rollback or retry logic; prevent orphaned plans.
- [ ] **Background playbook task error handling** - `backend/core/training/training_api.py:416-497,500-505` - Ensure playbook generation failures don't crash the request; log errors but allow plan generation to complete; add timeout for background tasks.
- [ ] **ResponseFormatter validation** - `backend/core/training/training_api.py:398-400` - Validate that formatted responses are non-empty and properly structured before passing to plan generation.
- [ ] **TrainingCoach.generate_initial_training_plan error handling** - `backend/core/training/training_coach.py:620+` - Ensure all LLM calls have timeout and retry logic; handle rate limits and API failures gracefully.
- [ ] **Database transaction safety** - `backend/core/training/training_api.py:527-550` - Ensure plan save and profile update operations are atomic or have proper rollback on failure.
- [ ] **Unit tests for plan generation endpoint** - `backend/tests/` - Add tests for: valid request, missing fields, invalid JWT, existing plan (idempotency), LLM failure, DB save failure, malformed responses.

### Frontend

- [ ] **GeneratePlanScreen validation before generation** - `frontend/src/screens/GeneratePlanScreen.tsx:74-89` - Ensure all required data (userProfile, initial_questions, initial_responses, JWT) is validated before API call; show clear error if missing.
- [ ] **Error handling and user feedback** - `frontend/src/screens/GeneratePlanScreen.tsx:124-179` - Replace `console.log` with proper logging; show user-friendly error messages; handle network failures and API errors gracefully.
- [ ] **Prevent duplicate generation requests** - `frontend/src/screens/GeneratePlanScreen.tsx:69-72,182-192` - Ensure `generationTriggeredRef` and loading checks prevent multiple simultaneous requests; handle race conditions.
- [ ] **Progress overlay and loading states** - `frontend/src/screens/GeneratePlanScreen.tsx:196-200` - Ensure progress overlay shows during generation; handle timeout scenarios; provide cancel option for long-running requests.
- [ ] **Navigation after successful generation** - `frontend/src/screens/GeneratePlanScreen.tsx:124-158` - Verify routing to plan review after success; handle cases where plan exists but needs refresh; prevent navigation loops.
- [ ] **Polling logic for background data** - `frontend/src/screens/GeneratePlanScreen.tsx:25-67` - Ensure polling doesn't run indefinitely; add timeout and max retry limits; handle polling failures gracefully.

---

## 🟡 IMPORTANT (Should Fix Before App Store Release)

### Backend

- [ ] **Rate limiting for plan generation endpoint** - `backend/core/training/training_api.py:350` - Add rate limiting to prevent abuse; consider per-user limits and queue system for high load.
- [ ] **Plan generation timeout handling** - `backend/core/training/training_coach.py:620+` - Add configurable timeout for plan generation; return partial results or clear error if timeout exceeded.
- [ ] **Background playbook task monitoring** - `backend/core/training/training_api.py:499-505` - Add monitoring/alerting for playbook generation failures; track success rate and latency.
- [ ] **ResponseFormatter edge cases** - `backend/core/training/helpers/response_formatter.py` - Handle malformed responses, missing questions, type mismatches; add validation and sanitization.
- [ ] **LLM prompt validation and sanitization** - `backend/core/training/helpers/prompt_generator.py:868+` - Ensure prompts don't exceed token limits; validate prompt structure before sending to LLM.
- [ ] **Database connection pooling and retries** - `backend/core/training/training_api.py:527+` - Ensure DB operations use connection pooling; add retry logic for transient failures.
- [ ] **Comprehensive logging for debugging** - `backend/core/training/training_api.py` - Add structured logging at key decision points (validation, generation start, success, failure); include request IDs for traceability.
- [ ] **Plan generation metrics and monitoring** - Add metrics for: generation time, success rate, LLM API latency, DB save time, playbook generation time.
- [ ] **Input size limits** - `backend/core/training/training_api.py:357` - Enforce maximum size for initial_responses and initial_questions to prevent DoS; validate array lengths.

### Frontend

- [ ] **Retry logic for failed generation** - `frontend/src/screens/GeneratePlanScreen.tsx:124-179` - Add retry button/mechanism for failed generations; implement exponential backoff.
- [ ] **Progress indication accuracy** - `frontend/src/screens/GeneratePlanScreen.tsx:112-120` - Ensure progress overlay accurately reflects generation progress; consider using websockets or polling for real-time updates.
- [ ] **Offline handling** - `frontend/src/screens/GeneratePlanScreen.tsx:112` - Detect offline state and show appropriate message; queue request for when connection restored.
- [ ] **Analytics for plan generation funnel** - Add events: plan_generation_started, plan_generation_success, plan_generation_failed (with error type); ensure PII-safe.
- [ ] **Accessibility for loading states** - `frontend/src/screens/GeneratePlanScreen.tsx:196-200` - Ensure progress overlay is accessible (screen reader announcements, proper ARIA labels).
- [ ] **Error recovery UX** - `frontend/src/screens/GeneratePlanScreen.tsx:201-204` - Improve error display with actionable steps; provide "Try Again" and "Go Back" options.
- [ ] **Personal info validation before generation** - `frontend/src/screens/GeneratePlanScreen.tsx:95-110` - Validate personal info completeness and correctness before sending to backend.

---

## 🟢 NICE TO HAVE (Can Fix After Public Launch)

### Backend

- [ ] **Plan generation queue system** - Implement queue for plan generation requests to handle bursts; prioritize based on user tier or urgency.
- [ ] **Caching for similar plan requests** - Cache plans for similar user profiles/goals to reduce LLM calls and improve response time.
- [ ] **Plan generation optimization** - Profile and optimize slow paths (LLM calls, DB operations); consider parallel processing where possible.
- [ ] **Advanced monitoring and alerting** - Set up alerts for high failure rates, slow generation times, LLM API issues.
- [ ] **Plan versioning and rollback** - Support plan versioning to allow rollback if new plan generation introduces issues.

### Frontend

- [ ] **Optimistic UI updates** - Show plan preview immediately after generation starts; update with real data when available.
- [ ] **Plan generation history** - Allow users to view previous plan generation attempts and results.
- [ ] **Enhanced progress details** - Show more detailed progress (e.g., "Generating week 1", "Creating exercises", "Finalizing plan").
- [ ] **Background generation support** - Allow users to close app during generation and resume later; use push notifications when complete.

---

## 📋 Quick Reference

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key for LLM calls (Required)
- `PLAYBOOK_CONTEXT_MATCHING_ENABLED` - Enable/disable RAG context matching for playbook (Optional, default: false)
- `EXPO_PUBLIC_API_BASE_URL` - Backend API base URL (Required for frontend)

**Key Files (Backend):**
- `backend/core/training/training_api.py:350-550` - Plan generation API endpoint
- `backend/core/training/training_coach.py:620+` - Core plan generation logic
- `backend/core/training/helpers/prompt_generator.py:868+` - LLM prompt generation
- `backend/core/training/helpers/response_formatter.py` - Response formatting utilities
- `backend/core/base/services/db_service.py` - Database operations for plan storage

**Key Files (Frontend):**
- `frontend/app/generate-plan.tsx` - Route entry point
- `frontend/src/screens/GeneratePlanScreen.tsx` - Plan generation UI and logic
- `frontend/src/services/onboardingService.ts:107-157` - API service for plan generation
- `frontend/src/hooks/useProgressOverlay.ts` - Progress overlay hook

**Related Docs:**
- `docs/to_production/03_FRONTEND_ONBOARDING.md` - Onboarding flow (prerequisite)
- `docs/to_production/02_FRONTEND_AUTHENTICATION.md` - Authentication (prerequisite)
- `docs/RAG_PLAYBOOK_SUMMARY.md` - Playbook generation flow

