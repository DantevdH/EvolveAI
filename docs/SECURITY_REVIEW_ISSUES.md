# Security & Architecture Review - Top 10 Critical Issues

**Review Date:** 2025-01-27  
**Reviewer:** Principal Full-Stack Engineer  
**Scope:** Complete static analysis of frontend and backend codebase

---

## Executive Summary

This review identified **10 serious issues** spanning security vulnerabilities, scalability bottlenecks, performance inefficiencies, and maintainability problems. Issues are ranked by **production risk** with emphasis on security impact, data integrity, and system availability.

### Infrastructure Requirements Note

**All solutions in this document work with a single backend server (no Redis needed).**

- **Single server deployment** (e.g., Render with 1 instance): Use in-memory solutions (rate limiting, locks)
- **Multi-server deployment** (e.g., Render with 2+ instances): Consider Redis for distributed coordination

All recommendations below use simple in-memory approaches that work perfectly for single-server deployments. Redis is only mentioned as an optional enhancement for multi-instance scaling.

---

## 1. 🔴 CRITICAL: JWT Verification Fallback Disables Security

**Severity:** CRITICAL  
**Category:** Security Vulnerability  
**Location:** `backend/app/services/database_service.py:129-139`

### Root Cause

The JWT verification function falls back to **unverified token decoding** when no verification keys are available:

```python
# No verification keys available - fallback to unverified decode (development only)
logger.warning("No JWT verification keys set - JWT verification disabled (not recommended for production)")
try:
    decoded_token = jwt.decode(jwt_token, options={"verify_signature": False})
    user_id = decoded_token.get("sub")
    ...
```

### Production Impact

- **Complete authentication bypass**: Any user can forge JWTs by setting `sub` to any user_id
- **Unauthorized data access**: Attackers can access any user's training plans, profiles, and personal data
- **Data manipulation**: Full write access to all user records
- **GDPR/Compliance violation**: Personal data exposure to unauthorized parties

### Remediation Steps

1. **Remove the fallback immediately:**
```python
# Replace lines 129-139 with:
if not jwt_public_key and not jwt_secret:
    logger.error("CRITICAL: No JWT verification keys configured. Authentication is disabled.")
    raise HTTPException(
        status_code=500,
        detail="Server configuration error: JWT verification keys not configured"
    )
```

2. **Add startup validation:**
   - Validate JWT keys exist at application startup
   - Fail fast if keys are missing
   - Add health check endpoint that verifies auth is properly configured

3. **Environment checks:**
   - Add explicit check: `if ENVIRONMENT == "production" and not jwt_public_key: raise SystemExit(1)`

---

## 2. 🔴 CRITICAL: No Rate Limiting on Expensive LLM Endpoints

**Severity:** CRITICAL  
**Category:** Performance / Cost / DoS  
**Locations:**
- `backend/app/api/plan_router.py:182` (`/api/training/generate-plan`)
- `backend/app/api/chat_router.py:130` (`/api/training/chat`)
- `backend/app/api/questions_router.py:39` (`/api/questions/initial-questions`)

### Root Cause

No rate limiting middleware or per-endpoint throttling exists. These endpoints:
- Make expensive LLM API calls (costs $0.01-$0.10 per request)
- Can take 30-300 seconds to complete
- Consume significant database and compute resources
- Can be called repeatedly by a single user or attacker

### Production Impact

- **Cost explosion**: Single attacker can generate $1000s in LLM API costs in minutes
- **Service degradation**: Legitimate users experience timeouts and failures
- **Resource exhaustion**: Database connections, memory, and CPU overwhelmed
- **DoS vulnerability**: Trivial to crash or make service unavailable

### Remediation Steps

**Note:** For single-server deployments (like Render), in-memory rate limiting works perfectly. Redis is only needed if you scale to multiple backend instances.

1. **Add rate limiting middleware (in-memory - no Redis needed):**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# In-memory storage (works great for single server)
limiter = Limiter(key_func=get_remote_address, default_limits=["100/hour"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

2. **Endpoint-specific limits:**
```python
@router.post("/generate-plan")
@limiter.limit("5/hour")  # Very expensive operation
async def generate_training_plan(...):
    ...
```

3. **Per-user limits** (using user_id from JWT):
```python
def get_user_id_for_rate_limit(request: Request):
    try:
        # Extract JWT from request body or header
        jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if jwt_token:
            user_id = extract_user_id_from_jwt(jwt_token)
            return user_id  # Rate limit per user
    except:
        pass
    return get_remote_address(request)  # Fallback to IP

limiter = Limiter(key_func=get_user_id_for_rate_limit)
```

4. **Install slowapi:**
```bash
pip install slowapi
```

**When to add Redis:** Only if you scale to multiple backend instances (e.g., 2+ Render instances behind a load balancer). Until then, in-memory rate limiting is simpler and sufficient.

---

## 3. 🔴 CRITICAL: Service Role Key Bypasses Row-Level Security

**Severity:** CRITICAL  
**Category:** Security / Authorization  
**Location:** `backend/app/services/database_service.py:241-279`

### Root Cause

The `_get_authenticated_client()` method uses the service role key by default, which **bypasses all Supabase Row-Level Security (RLS) policies**:

```python
if settings.SUPABASE_SERVICE_ROLE_KEY:
    client = create_client(
        settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
    )
    # Service role bypasses RLS!
```

This key is used throughout the codebase for all database operations, even when a valid JWT token is provided.

### Production Impact

- **Authorization bypass**: Even if user_id is extracted from JWT, service role key allows access to ALL user data
- **Data leakage**: Accidental bugs can expose all users' data
- **No audit trail**: Can't distinguish between legitimate admin operations and user operations
- **Compliance risk**: Violates principle of least privilege

### Remediation Steps

1. **Use JWT-authenticated client when JWT is available:**
```python
def _get_authenticated_client(self, jwt_token: Optional[str] = None) -> Client:
    if jwt_token:
        # Use anon key with JWT - respects RLS policies
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        client.postgrest.auth(jwt_token)
        return client
    else:
        # Only use service role when no JWT (background jobs, admin operations)
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("Service role key required for operations without JWT")
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

2. **Audit all service role key usage:**
   - Identify operations that truly need service role (background jobs, admin)
   - Mark them explicitly with comments
   - Create separate method: `_get_service_role_client()` for explicit admin operations

3. **Add RLS policy verification:**
   - Test that user-specific queries fail when using wrong user_id
   - Add integration tests that verify RLS is enforced

---

## 4. 🟠 HIGH: Multiple Supabase Client Instances Per Request (No Connection Pooling)

**Severity:** HIGH  
**Category:** Scalability / Performance  
**Location:** Multiple locations creating new clients:
- `backend/app/services/database_service.py:256-257`
- `backend/app/api/plan_router.py:77`
- `backend/app/api/insights_router.py:44`
- `backend/app/agents/base_agent.py:63`

### Root Cause

Every database operation creates a new Supabase client instance. There's no connection pooling or client reuse:

```python
# Called multiple times per request
client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

In a single `/generate-plan` request:
- `DatabaseService._get_authenticated_client()` creates client
- `_fetch_complete_training_plan()` creates another client
- Multiple nested calls each create their own clients

### Production Impact

- **Connection exhaustion**: Under load, database connection pool exhausted
- **Latency increase**: 50-200ms overhead per client creation
- **Memory waste**: Each client holds HTTP connection pool (~5-10MB)
- **Scalability ceiling**: System can't handle >100 concurrent requests

### Remediation Steps

1. **Implement client singleton pattern:**
```python
class DatabaseService:
    _service_role_client: Optional[Client] = None
    _anon_client: Optional[Client] = None
    
    @classmethod
    def _get_service_role_client(cls) -> Client:
        if cls._service_role_client is None:
            cls._service_role_client = create_client(
                settings.SUPABASE_URL, 
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
        return cls._service_role_client
    
    def _get_authenticated_client(self, jwt_token: Optional[str] = None) -> Client:
        if jwt_token:
            # Create client with JWT (anon key + JWT auth header)
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
            client.postgrest.auth(jwt_token)
            return client
        return self._get_service_role_client()
```

2. **Use dependency injection for shared clients:**
   - Create clients at startup
   - Inject into services via FastAPI dependencies

3. **Monitor connection pool metrics:**
   - Track active connections
   - Set alerts for connection pool exhaustion

---

## 5. 🟠 HIGH: No Input Size Limits - DoS Vulnerability

**Severity:** HIGH  
**Category:** Security / DoS  
**Location:** 
- `backend/app/api/plan_router.py:182` (PlanGenerationRequest)
- `backend/app/api/chat_router.py:130` (PlanFeedbackRequest)

### Root Cause

Request schemas accept unbounded arrays and large objects without size validation:

```python
# No limits on:
- initial_responses: Dict[str, Any]  # Could be 100MB+
- initial_questions: List[QuestionUnion]  # Could be 10,000+ items
- conversation_history: List[Dict[str, str]]  # Could be 1,000+ messages
- training_plan: Dict[str, Any]  # Could be massive nested structure
```

### Production Impact

- **Memory exhaustion**: Single request can consume gigabytes of RAM
- **CPU exhaustion**: Processing huge payloads blocks worker threads
- **Database overload**: Saving massive plans triggers expensive operations
- **Service crash**: OOM kills kill application instances

### Remediation Steps

1. **Add Pydantic validators with size limits:**
```python
from pydantic import validator, Field

class PlanGenerationRequest(BaseModel):
    initial_responses: Dict[str, Any] = Field(..., max_length=50000)  # ~50KB JSON
    initial_questions: List[QuestionUnion] = Field(..., max_items=100)
    
    @validator('initial_responses')
    def validate_responses_size(cls, v):
        import json
        size = len(json.dumps(v))
        if size > 50000:  # 50KB
            raise ValueError(f"initial_responses too large: {size} bytes (max 50000)")
        return v
```

2. **Add FastAPI request size middleware:**
```python
from fastapi import Request
from fastapi.middleware.base import BaseHTTPMiddleware

class RequestSizeMiddleware(BaseHTTPMiddleware):
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB
    
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("content-length"):
            size = int(request.headers["content-length"])
            if size > self.MAX_REQUEST_SIZE:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request too large: {size} bytes"}
                )
        return await call_next(request)

app.add_middleware(RequestSizeMiddleware)
```

3. **Add request body size limit to uvicorn:**
```python
# In main.py
config = uvicorn.Config(
    "main:app",
    limit_concurrency=100,
    limit_max_requests=1000,
    timeout_keep_alive=5,
    # Add body size limit
)
```

---

## 6. 🟠 HIGH: Race Condition in Training Plan Generation

**Severity:** HIGH  
**Category:** Data Consistency / Race Condition  
**Location:** `backend/app/api/plan_router.py:208-222`

### Root Cause

The idempotency check and plan creation are not atomic:

```python
# Step 1: Check if plan exists
existing_plan_result = await db_service.get_training_plan(user_profile_id)
if existing_plan_result.get("success") and existing_plan_result.get("data"):
    return existing_plan  # Return existing

# Step 2: Generate new plan (takes 30-300 seconds)
result = await agent.generate_initial_training_plan(...)

# Step 3: Save plan (race condition window here)
save_result = await db_service.save_training_plan(...)
```

If two requests arrive simultaneously:
1. Both pass the idempotency check
2. Both generate plans (doubling LLM costs)
3. One fails on save (duplicate key), other succeeds
4. User sees error or inconsistent state

### Production Impact

- **Duplicate plan generation**: 2x LLM API costs for concurrent requests
- **Data inconsistency**: Partial saves, orphaned records
- **User confusion**: Error messages for valid requests
- **Resource waste**: CPU/memory consumed for duplicate work

### Remediation Steps

1. **Use database-level unique constraint (Primary defense):**
```sql
-- In migration (if not already exists)
ALTER TABLE training_plans 
ADD CONSTRAINT unique_user_plan UNIQUE (user_profile_id);
```

2. **Implement in-memory lock (for single server - no Redis needed):**
```python
import asyncio
from typing import Dict, Set

# In-memory lock tracking (works for single server)
_in_progress_locks: Dict[int, asyncio.Lock] = {}
_lock_cleanup: Set[int] = set()

async def generate_with_lock(user_profile_id: int, ...):
    # Get or create lock for this user
    if user_profile_id not in _in_progress_locks:
        _in_progress_locks[user_profile_id] = asyncio.Lock()
    
    user_lock = _in_progress_locks[user_profile_id]
    
    # Try to acquire lock (non-blocking check first)
    if user_lock.locked():
        raise HTTPException(
            status_code=409,
            detail="Plan generation already in progress for this user. Please wait."
        )
    
    async with user_lock:
        # Double-check existing plan (within lock)
        existing = await db_service.get_training_plan(user_profile_id)
        if existing.get("success") and existing.get("data"):
            return existing["data"]
        
        # Generate plan
        result = await agent.generate_initial_training_plan(...)
        return result

# Alternative: Database-level advisory lock (PostgreSQL-specific, works across instances)
async def generate_with_db_lock(user_profile_id: int, ...):
    """Use PostgreSQL advisory lock - works even with multiple servers."""
    from supabase import create_client
    from settings import settings
    
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    lock_id = hash(f"plan_gen:{user_profile_id}") % (2**31)  # PostgreSQL int range
    
    try:
        # Try to acquire advisory lock (non-blocking)
        lock_result = supabase.rpc(
            'pg_try_advisory_lock',
            {'lock_id': lock_id}
        ).execute()
        
        if not lock_result.data:
            raise HTTPException(
                status_code=409,
                detail="Plan generation already in progress"
            )
        
        # Check existing plan
        existing = await db_service.get_training_plan(user_profile_id)
        if existing.get("success"):
            supabase.rpc('pg_advisory_unlock', {'lock_id': lock_id}).execute()
            return existing["data"]
        
        # Generate plan
        result = await agent.generate_initial_training_plan(...)
        return result
        
    finally:
        # Always release lock
        supabase.rpc('pg_advisory_unlock', {'lock_id': lock_id}).execute()
```

**Recommendation:** Use the database unique constraint (#1) + in-memory lock (#2) for simplicity. Only use database advisory locks if you need cross-instance coordination.

3. **Add idempotency token support (Optional enhancement):**
   - Client sends idempotency key in header: `Idempotency-Key: <uuid>`
   - Store in database table: `idempotency_keys(key, user_id, result, created_at)`
   - Return cached result if key seen within last hour

---

## 7. 🟠 HIGH: Large Training Plan Responses Without Pagination

**Severity:** HIGH  
**Category:** Performance / Scalability  
**Location:** 
- `backend/app/services/database_service.py:1296-1400` (`get_training_plan`)
- `frontend/src/services/trainingService.ts:61` (`getTrainingPlan`)

### Root Cause

Training plans are fetched entirely in one request, including:
- All weekly schedules (12+ weeks)
- All daily trainings (84+ days)
- All strength exercises (500+ exercises with full details)
- All endurance sessions
- Nested exercise details (instructions, tips, videos)

A single plan can be **5-20MB** when serialized to JSON.

### Production Impact

- **Memory pressure**: Large responses consume server/client memory
- **Network timeout**: Mobile users on slow connections timeout
- **Parse time**: JSON parsing takes 500ms-2s on mobile devices
- **Battery drain**: Processing large payloads drains device battery
- **API timeout**: Responses exceed 30s timeout limit

### Remediation Steps

1. **Implement pagination for weekly schedules:**
```python
@router.get("/training-plan/{user_profile_id}")
async def get_training_plan(
    user_profile_id: int,
    week_start: int = 1,
    week_limit: int = 4,  # Default: 4 weeks at a time
    jwt_token: str = Depends(get_jwt_token)
):
    plan = await db_service.get_training_plan_paginated(
        user_profile_id,
        week_start=week_start,
        week_limit=week_limit
    )
    return {
        "data": plan,
        "pagination": {
            "week_start": week_start,
            "week_limit": week_limit,
            "has_more": len(plan["weekly_schedules"]) == week_limit
        }
    }
```

2. **Lazy load exercise details:**
   - Return exercise IDs in plan response
   - Frontend fetches exercise details on-demand when viewing
   - Cache exercise details client-side

3. **Add response compression:**
```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

4. **Implement GraphQL or field selection:**
   - Allow clients to request only needed fields
   - Reduce response size by 70-90%

---

## 8. 🟡 MEDIUM: Error Messages Leak Sensitive Information

**Severity:** MEDIUM  
**Category:** Security / Information Disclosure  
**Locations:**
- `backend/main.py:58-79` (Validation errors)
- `backend/app/api/plan_router.py:478-479` (Generic exceptions)

### Root Cause

Error handlers return detailed stack traces and internal errors to clients:

```python
except Exception as e:
    logger.error(f"❌ Error generating training plan: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Failed to generate training plan: {str(e)}")
    # ^ Leaks full exception message including file paths, variable names, etc.
```

### Production Impact

- **Information disclosure**: Attackers learn internal structure, file paths, variable names
- **Stack trace exposure**: Reveals framework versions, dependencies
- **Database errors**: May leak table names, column names, constraint details
- **Security through obscurity**: Makes exploitation easier

### Remediation Steps

1. **Sanitize all error responses:**
```python
import traceback

def sanitize_error(error: Exception, include_details: bool = False) -> str:
    """Return safe error message for client."""
    if include_details and settings.DEBUG:
        return str(error)
    
    # Map exception types to user-friendly messages
    error_messages = {
        ValueError: "Invalid input provided",
        KeyError: "Required data missing",
        ConnectionError: "Service temporarily unavailable",
    }
    
    error_type = type(error)
    return error_messages.get(error_type, "An unexpected error occurred")

# In exception handlers:
except Exception as e:
    logger.error(f"Error: {str(e)}", exc_info=True)  # Full details in logs
    safe_message = sanitize_error(e, include_details=settings.DEBUG)
    raise HTTPException(status_code=500, detail=safe_message)
```

2. **Add global exception handler:**
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred" if not settings.DEBUG else str(exc)
        }
    )
```

3. **Never expose:**
   - Stack traces
   - File paths
   - Database connection strings
   - Internal variable names
   - Framework versions (in error messages)

---

## 9. 🟡 MEDIUM: Frontend API Client Retries Can Cause Duplicate Operations

**Severity:** MEDIUM  
**Category:** Data Consistency / Idempotency  
**Location:** `frontend/src/services/apiClient.ts:94-129`

### Root Cause

The API client automatically retries on 401 errors by refreshing the token and retrying:

```typescript
if (response.status === 401 && retryOn401) {
    const newToken = await TokenManager.refreshAccessToken();
    if (newToken) {
        // Retry the request with the new token
        return this.request<T>(endpoint, updatedOptions, false);
    }
}
```

For **state-changing operations** (POST/PUT/PATCH), this can cause:
- Duplicate plan generation
- Double-charging (if payment endpoints exist)
- Duplicate messages/chats
- Race conditions

### Production Impact

- **Duplicate operations**: User actions executed twice
- **Data inconsistency**: Conflicting updates
- **User confusion**: Unexpected duplicate results
- **Cost impact**: Duplicate LLM API calls

### Remediation Steps

1. **Make retries safe for non-idempotent operations:**
```typescript
private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401: boolean = true,
    externalSignal?: AbortSignal
): Promise<ApiResponse<T>> {
    // Don't auto-retry non-GET requests on 401
    const isIdempotent = options.method === 'GET' || options.method === 'HEAD';
    const shouldRetry = retryOn401 && isIdempotent;
    
    if (response.status === 401 && shouldRetry) {
        // ... retry logic
    }
}
```

2. **Add idempotency headers for state-changing operations:**
```typescript
// Generate idempotency key for POST/PUT/PATCH
if (['POST', 'PUT', 'PATCH'].includes(options.method || '')) {
    const idempotencyKey = crypto.randomUUID();
    headers['Idempotency-Key'] = idempotencyKey;
}
```

3. **Backend should handle idempotency keys:**
   - Check if operation with key already completed
   - Return cached result if found
   - Process normally if new

---

## 10. 🟡 MEDIUM: Missing Authorization Checks on User-Scoped Operations

**Severity:** MEDIUM  
**Category:** Security / Authorization  
**Locations:**
- `backend/app/api/plan_router.py:197` (Extracts user_id but doesn't verify ownership)
- `backend/app/api/chat_router.py:276` (Uses user_profile_id from request without verification)

### Root Cause

While user_id is extracted from JWT, there's no verification that the user owns the resource being accessed:

```python
user_id = extract_user_id_from_jwt(request.jwt_token)
user_profile_id = request.user_profile_id  # From request body - NOT VERIFIED!

# No check: does user_id own user_profile_id?
result = await db_service.get_training_plan(user_profile_id)
```

An attacker could:
1. Sign in as user A
2. Send request with `user_profile_id` of user B
3. Access/modify user B's training plan

### Production Impact

- **Horizontal privilege escalation**: Users can access other users' data
- **Data breach**: Personal information, training plans exposed
- **Data manipulation**: Modify or delete other users' plans
- **Compliance violation**: GDPR, HIPAA violations

### Remediation Steps

1. **Add ownership verification:**
```python
async def verify_user_owns_profile(user_id: str, user_profile_id: int) -> bool:
    """Verify that user_id owns the user_profile_id."""
    profile = await db_service.get_user_profile_by_id(user_profile_id)
    if not profile.get("success"):
        return False
    
    profile_user_id = profile["data"].get("user_id")
    return profile_user_id == user_id

# In endpoint:
user_id = extract_user_id_from_jwt(request.jwt_token)
if not await verify_user_owns_profile(user_id, request.user_profile_id):
    raise HTTPException(status_code=403, detail="Access denied")
```

2. **Create reusable dependency:**
```python
async def get_verified_user_profile(
    user_profile_id: int,
    jwt_token: str = Depends(get_jwt_token)
) -> Dict[str, Any]:
    """FastAPI dependency that verifies user owns profile."""
    user_id = extract_user_id_from_jwt(jwt_token)
    
    profile = await db_service.get_user_profile_by_id(user_profile_id)
    if not profile.get("success"):
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile["data"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return profile["data"]

# Usage:
@router.post("/generate-plan")
async def generate_plan(
    request: PlanGenerationRequest,
    verified_profile: Dict = Depends(get_verified_user_profile(request.user_profile_id))
):
    # verified_profile is guaranteed to belong to authenticated user
    ...
```

3. **Add integration tests:**
   - Test that user A cannot access user B's profile
   - Test that invalid user_profile_id returns 404 (not 403, to avoid user enumeration)

---

## Summary Statistics

- **Critical Issues:** 3
- **High Severity:** 4  
- **Medium Severity:** 3
- **Total Issues:** 10

### Recommended Action Plan

**Week 1 (Critical - Immediate):**
1. Fix JWT verification fallback (#1)
2. Add rate limiting (#2)
3. Fix service role key usage (#3)

**Week 2 (High Priority):**
4. Implement connection pooling (#4)
5. Add input size limits (#5)
6. Fix race conditions (#6)
7. Implement pagination (#7)

**Week 3 (Medium Priority):**
8. Sanitize error messages (#8)
9. Fix API retry logic (#9)
10. Add authorization checks (#10)

---

## Additional Recommendations

1. **Add security headers middleware** (CSP, HSTS, X-Frame-Options)
2. **Implement request logging** with correlation IDs for tracing
3. **Add database query timeouts** to prevent long-running queries
4. **Implement circuit breakers** for external API calls (LLM APIs)
5. **Add comprehensive integration tests** for security scenarios
6. **Set up monitoring/alerting** for rate limit violations, auth failures
7. **Conduct penetration testing** before production launch
8. **Implement API versioning** to allow safe changes
9. **Add request/response validation** at API gateway level
10. **Document security architecture** and threat model

---

**Review Complete**
