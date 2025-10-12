/**
 * Naming conventions and standards for the application
 */

/**
 * Frontend naming conventions:
 * - Variables, functions, methods: camelCase
 * - Components: PascalCase
 * - Constants: UPPER_SNAKE_CASE
 * - Files: kebab-case for components, camelCase for utilities
 * - Interfaces: PascalCase with descriptive names
 * - Types: PascalCase with descriptive names
 */

/**
 * Database naming conventions:
 * - Tables: snake_case (e.g., user_profiles, training_plans)
 * - Columns: snake_case (e.g., user_id, created_at)
 * - Foreign keys: {table_name}_id (e.g., user_profile_id)
 */

/**
 * API naming conventions:
 * - Endpoints: kebab-case (e.g., /api/training-plan/generate/)
 * - Request/Response fields: camelCase for frontend, snake_case for backend
 * - HTTP methods: standard REST conventions
 */

/**
 * Environment variables:
 * - EXPO_PUBLIC_* for public variables
 * - UPPER_SNAKE_CASE for all environment variables
 */

/**
 * File organization:
 * - Components: /components/{category}/{ComponentName}.tsx
 * - Screens: /screens/{category}/{ScreenName}.tsx
 * - Services: /services/{ServiceName}.ts
 * - Hooks: /hooks/use{HookName}.ts
 * - Utils: /utils/{utilityName}.ts
 * - Constants: /constants/{constantName}.ts
 * - Types: /types/{typeName}.ts
 */

export const NAMING_CONVENTIONS = {
  FRONTEND: {
    VARIABLES: 'camelCase',
    COMPONENTS: 'PascalCase',
    CONSTANTS: 'UPPER_SNAKE_CASE',
    FILES: 'kebab-case or camelCase',
    INTERFACES: 'PascalCase',
    TYPES: 'PascalCase',
  },
  DATABASE: {
    TABLES: 'snake_case',
    COLUMNS: 'snake_case',
    FOREIGN_KEYS: '{table_name}_id',
  },
  API: {
    ENDPOINTS: 'kebab-case',
    FRONTEND_FIELDS: 'camelCase',
    BACKEND_FIELDS: 'snake_case',
  },
  ENVIRONMENT: {
    VARIABLES: 'UPPER_SNAKE_CASE',
    PUBLIC_PREFIX: 'EXPO_PUBLIC_',
  },
} as const;
