# Backend Testing Rules

## Environment Setup
- Always activate virtual environment before running tests: `cd backend && source .venv/bin/activate`
- Test environment variables are automatically set in `conftest.py` via `pytest_configure` hook
- Never load `.env` files during tests - test environment detection prevents this
- Use `core.utils.env_loader.load_environment()` - it automatically skips in test mode

## Test Structure
- Unit tests should be in `tests/unit/` directory
- Integration tests should be in `tests/` root directory
- Use pytest fixtures from `conftest.py` for common test setup
- Mark tests appropriately: `@pytest.mark.unit`, `@pytest.mark.integration`

## Test Best Practices
- Mock external services (OpenAI, Supabase) rather than using real API calls
- Test environment variables are automatically set - don't override unless necessary
- `ENVIRONMENT=test` must be set before any imports (handled by `pytest_configure`)
- For CI/CD, use GitHub Secrets for test credentials

## Writing Tests
- Write tests for all critical business logic
- Test error cases, not just happy paths
- Keep tests isolated and independent
- Use descriptive test names that explain what is being tested
- Follow AAA pattern: Arrange, Act, Assert

## Testability Requirements
- **Business logic must be testable** - All business logic should be extracted from API routes into:
  - Pure functions (can be tested without FastAPI/HTTP)
  - Service classes/functions (can be tested with mocked dependencies)
  - Helper functions (can be unit tested independently)
- **Routes should be easy to test** - If a route has complex logic, extract it to a service first
- **Test pure functions independently** - Functions like calculations, validations, transformations should be unit tested without FastAPI
- **Mock external dependencies** - Mock database, API clients, and external services in tests
- **Example**: Test `exercise_matcher.py`, `date_mapper.py` functions directly, not through API endpoints

