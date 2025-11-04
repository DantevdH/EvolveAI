<!-- ab2d820b-e0ea-4a4f-972b-bfdaa6f68b67 b7e8dde2-ef76-4eb4-83a1-91dc5c14c5bd -->
# Refactor Training Flow to Use Playbook Instead of Questions/Responses

## Overview

Remove dependency on initial/follow-up questions and responses from plan generation and updates. Use playbook as the single source of training context, stored in AuthContext and passed from frontend to backend.

## Backend Changes

### 1. Update `/api/training/generate-plan` endpoint

**File:** `backend/core/training/training_api.py` (lines 385-600)

**Changes:**

- Remove `initial_responses`, `follow_up_responses`, `initial_questions`, `follow_up_questions` from `PlanGenerationRequest` schema
- Keep playbook generation logic (lines 462-531) - already checks if exists
- Return playbook in response alongside training_plan
- Modify response to include: `{"success": true, "data": training_plan, "playbook": playbook_dict, ...}`

**Current flow (lines 440-531):**

```python
formatted_initial_responses = ResponseFormatter.format_responses(...)
formatted_follow_up_responses = ResponseFormatter.format_responses(...)
# ... playbook generation from responses ...
```

**New flow:**

- Remove response formatting (no longer needed)
- Keep playbook check/generation (lines 462-531)
- Get responses from user_profile DB instead of request parameters
- Return playbook in response

### 2. Update `PlanGenerationRequest` schema

**File:** `backend/core/training/schemas/question_schemas.py` (lines 220-240)

**Remove fields:**

- `initial_responses`
- `follow_up_responses`
- `initial_questions`
- `follow_up_questions`

**Keep:**

- `personal_info`
- `user_profile_id`
- `jwt_token`

### 3. Update `/api/training/update-week` endpoint

**File:** `backend/core/training/training_api.py` (lines 747-950)

**Changes:**

- Add `playbook` field to `PlanFeedbackRequest` schema (accept from frontend)
- Remove playbook loading from DB (line 883: `existing_playbook = await db_service.load_user_playbook(...)`)
- Use playbook from request instead
- Keep playbook update logic (lines 886-920) - saves updated playbook back to DB

**Current (line 883):**

```python
existing_playbook = await db_service.load_user_playbook(user_profile_id, request.jwt_token)
```

**New:**

```python
existing_playbook = request.playbook  # From frontend AuthContext
```

### 4. Update `PlanFeedbackRequest` schema

**File:** `backend/core/training/schemas/question_schemas.py` (lines 274-286)

**Add field:**

```python
playbook: Optional[Dict[str, Any]] = Field(
    default=None, 
    description="User playbook from frontend (AuthContext)"
)
```

### 5. Update `generate_initial_training_plan` method

**File:** `backend/core/training/training_coach.py` (around line 534)

**Current call:**

```python
result = await coach.generate_initial_training_plan(
    personal_info=personal_info_with_user_id,
    formatted_initial_responses=formatted_initial_responses,
    formatted_follow_up_responses=formatted_follow_up_responses,
    user_profile_id=user_profile_id,
    jwt_token=request.jwt_token,
)
```

**Changes needed:**

- Fetch `initial_responses` and `follow_up_responses` from user_profile in DB
- Format them internally
- Keep method signature unchanged (maintains backward compatibility)

## Frontend Changes

### 6. Add playbook to AuthContext

**File:** `frontend/src/context/AuthContext.tsx`

**Add to state interface (line 10):**

```typescript
interface SimpleAuthState {
  user: any | null;
  session: any | null;
  userProfile: UserProfile | null;
  trainingPlan: TrainingPlan | null;
  playbook: any | null;  // ADD THIS
  exercises: any[] | null;
  isLoading: boolean;
  trainingPlanLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}
```

**Add action type (line 23):**

```typescript
type SimpleAuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WORKOUT_PLAN_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_SESSION'; payload: any | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_WORKOUT_PLAN'; payload: TrainingPlan | null }
  | { type: 'SET_PLAYBOOK'; payload: any | null }  // ADD THIS
  | { type: 'SET_EXERCISES'; payload: any[] | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'CLEAR_AUTH' };
```

**Add reducer case (line 49):**

```typescript
case 'SET_PLAYBOOK':
  return {
    ...state,
    playbook: action.payload,
  };
```

**Add setter method:**

```typescript
const setPlaybook = (playbook: any): void => {
  dispatch({ type: 'SET_PLAYBOOK', payload: playbook });
};
```

**Add to context interface and value export**

### 7. Update `generateTrainingPlan` service

**File:** `frontend/src/services/onboardingService.ts` (around line 158)

**Current request:**

```typescript
const request = {
  personal_info: personalInfo,
  initial_responses: initialResponses,
  follow_up_responses: followUpResponses,
  initial_questions: initialQuestions,
  follow_up_questions: followUpQuestions,
  user_profile_id: userProfileId,
  jwt_token: jwtToken,
};
```

**New request:**

```typescript
const request = {
  personal_info: personalInfo,
  user_profile_id: userProfileId,
  jwt_token: jwtToken,
};
```

**Handle response:**

```typescript
const response = await apiClient.post(...);
// Extract playbook from response
const playbook = response.data.playbook;
return { ...response, playbook };  // Pass playbook to caller
```

### 8. Update ConversationalOnboarding component

**File:** `frontend/src/components/onboarding/ConversationalOnboarding.tsx` (line 308)

**Current call (line 308):**

```typescript
const response = await trainingService.generateTrainingPlan(
  fullPersonalInfo,
  initialResponses,
  followUpResponses,
  state.initialQuestions,
  state.followUpQuestions,
  authState.userProfile?.id,
  jwtToken
);
```

**New call:**

```typescript
const { state: authState, setPlaybook, setTrainingPlan, setExercises } = useAuth();
// ... in handlePlanGeneration ...
const response = await trainingService.generateTrainingPlan(
  fullPersonalInfo,
  authState.userProfile?.id,
  jwtToken
);

// Store playbook in AuthContext
if (response.playbook) {
  setPlaybook(response.playbook);
}
```

### 9. Update `sendPlanFeedback` service

**File:** `frontend/src/services/onboardingService.ts` (line 224)

**Add playbook parameter:**

```typescript
static async sendPlanFeedback(
  userProfileId: number,
  planId: number,
  feedbackMessage: string,
  trainingPlan: any,
  playbook: any,  // ADD THIS
  conversationHistory: Array<{ role: string; content: string }> = [],
  jwtToken?: string
): Promise<any>
```

**Add to request:**

```typescript
const request = {
  user_profile_id: userProfileId,
  plan_id: planId,
  feedback_message: feedbackMessage,
  training_plan: trainingPlan,
  playbook: playbook,  // ADD THIS
  conversation_history: conversationHistory,
  jwt_token: jwtToken,
};
```

### 10. Update PlanPreviewStep to pass playbook

**File:** `frontend/src/screens/onboarding/PlanPreviewStep.tsx` (line 294)

**Current call:**

```typescript
const data = await trainingService.sendPlanFeedback(
  state.userProfile?.id!,
  planId,
  userMessage.message,
  backendFormatPlan,
  chatMessages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.message,
  })),
  jwtToken
);
```

**New call:**

```typescript
const data = await trainingService.sendPlanFeedback(
  state.userProfile?.id!,
  planId,
  userMessage.message,
  backendFormatPlan,
  state.playbook,  // ADD THIS from AuthContext
  chatMessages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.message,
  })),
  jwtToken
);
```

## Testing Checklist

1. Test playbook generation on first onboarding (doesn't exist in DB)
2. Test playbook reuse on retry (already exists in DB)
3. Test plan generation receives playbook in response
4. Test plan update sends playbook from frontend
5. Test playbook updates are saved back to DB after feedback
6. Verify no references to initial/follow-up questions remain in plan generation/update flows

## Migration Notes

- User profiles already have `user_playbook` field in DB (no schema changes needed)
- Playbook generation logic already exists and works correctly
- This change primarily moves data flow: questions → playbook (backend internal) → frontend → backend