# Cursor Rules Directory

This directory contains project-wide rules for the Cursor AI assistant.

## Structure

Rules are organized by scope:

### Project-Wide (`.cursor/rules/`)
- **security.md** - Security best practices (applies to both backend and frontend)

### Backend-Specific (`backend/.cursor/rules/`)
- **python.md** - Python code style and best practices
- **testing.md** - Backend testing guidelines
- **fastapi.md** - FastAPI-specific rules and patterns

### Frontend-Specific (`frontend/.cursor/rules/`)
- **typescript.md** - TypeScript code style and best practices
- **react-native.md** - React Native patterns and best practices
- **testing.md** - Frontend testing guidelines

## How It Works

Cursor automatically reads rules from:
1. `.cursorrules` file in the project root (main rules file)
2. `.cursor/rules/*.md` files (project-wide rules)
3. `backend/.cursor/rules/*.md` files (backend-specific rules)
4. `frontend/.cursor/rules/*.md` files (frontend-specific rules)

## Adding New Rules

To add a new rule file:

1. Determine the scope:
   - Project-wide → `.cursor/rules/`
   - Backend-specific → `backend/.cursor/rules/`
   - Frontend-specific → `frontend/.cursor/rules/`

2. Create a new `.md` file with clear headings and bullet points

3. Reference the rule file in the appropriate `.cursorrules` or README if needed

## Best Practices

- Keep rules concise and specific
- Use examples when helpful
- Update rules as project evolves
- Remove outdated rules
- Organize by scope (project-wide vs. specific)
