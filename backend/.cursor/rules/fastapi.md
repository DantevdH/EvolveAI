# FastAPI Backend Rules

## API Design
- Use FastAPI for all backend APIs
- Follow RESTful conventions
- Include proper error handling and validation
- Use Pydantic models for request/response validation
- Document endpoints with proper docstrings

## Route Organization
- API routes in `core/*/training_api.py` or similar module files
- Group related endpoints together
- Use router prefixes for logical grouping
- Include versioning in API paths when appropriate

## Testability - Thin Routes Pattern
- **Keep routes thin** - Routes should validate input, call services, and return responses
- **Extract business logic** - All business logic should be in service classes or helper functions
- **Routes delegate to services** - Route handlers should call service methods, not contain business logic
- **Example**: Route validates request → calls `TrainingCoach.generate_plan()` → returns response
- **Benefits**: Routes are easy to test, business logic can be tested independently

## Request/Response Models
- Always use Pydantic models for request validation
- Define response models explicitly
- Use proper HTTP status codes
- Include error response models

## Database
- Use Supabase for database operations
- Always validate data before database operations
- Use transactions for multi-step operations
- Handle connection errors gracefully
- Use database service layer, not direct queries in routes

## Middleware
- Use CORS middleware appropriately
- Implement request timeout middleware
- Add logging middleware for debugging
- Handle exceptions globally

