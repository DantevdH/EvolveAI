# Python Backend Rules

## Code Style
- Use type hints for all function parameters and return types
- Follow PEP 8 style guide
- Use f-strings for string formatting
- Prefer pathlib.Path over os.path for file operations
- Maximum line length: 100 characters (or follow project standard)
- Use descriptive variable and function names

## Environment Variables
- Always use `core.utils.env_loader.load_environment()` instead of calling `load_dotenv()` directly
- Test environment is automatically detected - never load `.env` files during tests
- Test environment variables are set in `conftest.py` via `pytest_configure` hook

## Project Structure
- Core business logic in `core/`
- API routes in `core/*/training_api.py` or similar
- Helpers and utilities in `core/*/helpers/`
- Settings and configuration in `settings.py`
- Use centralized environment loading utility

## Testability & Separation of Concerns
- **Extract business logic from API routes** - API routes should be thin and delegate to service/helper functions
- **Separate pure functions** - Business logic should be in separate functions that can be tested independently
- **Service layer pattern** - Use service classes/functions for business logic (e.g., `TrainingCoach`, `DatabaseService`)
- **Keep routes simple** - Routes should validate input, call services, and return responses
- **Pure functions for calculations** - Extract calculations, validations, and transformations into pure functions
- **Example pattern**: Route → Service → Helper functions, where each layer is testable independently
- **Dependency injection** - Make dependencies injectable for easier testing (e.g., pass database client as parameter)

## Error Handling
- Always handle errors gracefully
- Log errors with appropriate log levels
- Don't expose sensitive data in error messages
- Use try-except blocks for external API calls
- Provide meaningful error messages to users

