# Security Rules (Project-Wide)

## Environment Variables
- Never commit `.env` files or real API keys
- Use environment variables for all sensitive data
- Use GitHub Secrets for CI/CD
- Test environment should use dummy values
- Keep `.env` files in `.gitignore`

## API Security
- Always validate JWT tokens for authenticated endpoints
- Don't expose sensitive data in error responses
- Sanitize user inputs
- Use HTTPS in production
- Implement rate limiting where appropriate

## Data Protection
- Don't log sensitive user data
- Encrypt sensitive data at rest
- Use secure password hashing (Supabase handles this)
- Validate all user inputs
- Follow GDPR/privacy best practices

## Authentication & Authorization
- Use Supabase for authentication
- Validate JWT tokens on every authenticated request
- Implement proper role-based access control
- Never trust client-side validation alone
