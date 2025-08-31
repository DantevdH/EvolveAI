# EvolveAI Backend Scenario System 

## Overview
This backend supports scenario-based development and testing for the EvolveAI app. Scenarios allow the frontend to simulate different user states (new user, onboarding, etc.) without real authentication or database data.

## How It Works
- **Scenario is set via**: `POST /api/scenarios/set/` with `{ "scenario": "new-user" }` (or any supported scenario).
- **Scenario is stored in the session** and only works in `DEBUG` mode.
- **All main API endpoints** (profile, workout plan, etc.) use scenario logic via a mixin. No need for separate "fake" endpoints.
- **Authentication and permission** are bypassed in scenario mode (in DEBUG only).
- **Mock data** is returned for user profile and workout plan as appropriate.
- **Response delays** simulate real network latency, but can be disabled for CI/testing.

## Supported Scenarios
| Scenario         | Token      | Profile         | Plan           | Description                                 |
|------------------|------------|-----------------|----------------|---------------------------------------------|
| new-user         | None       | None            | None           | User has not signed up/logged in            |
| existing-user    | mock-token | None            | None           | User has token but no profile (onboarding)  |
| onboarded-user   | mock-token | MOCK            | None           | User has profile, no plan (plan generation) |
| user-with-plan   | mock-token | MOCK            | MOCK           | User has profile and plan (main app)        |
| network-error    | -          | -               | -              | Simulates a network/server error            |

## How to Use in Development
1. **Set a scenario from the frontend or with curl:**
   ```bash
   curl -X POST http://localhost:8000/api/scenarios/set/ -d '{"scenario": "onboarded-user"}' -H "Content-Type: application/json"
   ```
2. **Make requests to the normal API endpoints.**
   - The backend will return mock data or 404s as appropriate for the scenario.
   - No authentication is required in scenario mode (in DEBUG).

## Disabling Response Delays (for CI/testing)
Set the environment variable:
```bash
export SCENARIO_RESPONSE_DELAY=false
```
Or add to your `.env` file:
```
SCENARIO_RESPONSE_DELAY=false
```

## Adding/Changing Scenarios
- Edit `backend/training/scenario_manager.py` to add new scenarios or change logic.
- Edit `backend/training/mock_data.py` to update mock user/profile data.

## Logging
- Scenario-based authentication/permission bypass is logged to the console for visibility.

## Notes
- Scenario mode is only active in `DEBUG` mode for safety.
- If you need to add new fake endpoints, use the same logic as the main API (import from `ScenarioManager` and `mock_data.py`). 