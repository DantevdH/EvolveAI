# CI/CD Setup Documentation

## Overview

This repository uses GitHub Actions for continuous integration and deployment. The CI setup includes comprehensive testing for both backend (Python/Django) and frontend (React Native/Expo) components.

## Workflow Files

### 1. `ci.yml` - Full Stack CI (Primary)
**Triggers:** Push/PR to `main` or `develop` branches
**Purpose:** Runs all tests and quality checks

**Jobs:**
- **Backend Tests**: Python 3.9, 3.10, 3.11 matrix testing
- **Frontend Tests**: Node.js 18, 20 matrix testing  
- **Code Quality**: Linting and formatting checks
- **Security Scan**: Vulnerability scanning with Trivy
- **Build Verification**: Import and build checks
- **Test Summary**: Aggregated results

### 2. `frontend-ci.yml` - Frontend Only
**Triggers:** Changes to `frontend-expo/` directory
**Purpose:** Fast feedback for frontend-only changes

**Jobs:**
- **Frontend Tests**: Unit, integration, component tests
- **Frontend Lint**: ESLint checks
- **Frontend Build**: TypeScript and Expo build verification

### 3. `django-ci.yml` - Backend Only (Legacy)
**Triggers:** Changes to `backend/` directory
**Purpose:** Fast feedback for backend-only changes

**Jobs:**
- **Backend Tests**: Pytest with coverage

## Test Coverage

### Backend Tests
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service integration testing
- **Coverage**: Code coverage reporting
- **Python Versions**: 3.9, 3.10, 3.11

### Frontend Tests
- **Unit Tests**: 21 tests (Auth + Validation)
- **Integration Tests**: 9 tests (Service integration)
- **Component Tests**: 230 tests (All onboarding screens)
- **Total**: 260+ tests passing
- **Node Versions**: 18, 20

## Environment Variables

### Required Secrets
Set these in GitHub repository settings:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=your-openai-key-here
```

### Environment Variables Used
- `NODE_ENV=test` (Frontend)
- `EXPO_PUBLIC_SUPABASE_URL` (Frontend)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Frontend)

## Test Commands

### Backend
```bash
# Unit tests
pytest -v -m "unit"

# Integration tests  
pytest -v -m "integration"

# All tests with coverage
pytest -v --cov=. --cov-report=xml
```

### Frontend
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Component tests
npm test -- --testPathPattern="components"

# All tests with coverage
npm run test:coverage
```

## Performance Optimizations

### Caching
- **npm dependencies**: Cached based on `package-lock.json`
- **pip dependencies**: Cached based on `requirements.txt`
- **Node modules**: Cached for faster installs

### Parallel Execution
- **Backend**: 3 Python versions in parallel
- **Frontend**: 2 Node.js versions in parallel
- **Jobs**: Independent jobs run in parallel

### Path-based Triggers
- **Frontend CI**: Only runs on frontend changes
- **Backend CI**: Only runs on backend changes
- **Full CI**: Runs on any changes to main/develop

## Coverage Reporting

### Codecov Integration
- **Backend**: `backend/coverage.xml`
- **Frontend**: `frontend-expo/coverage/lcov.info`
- **Flags**: Separate flags for backend/frontend
- **Reports**: Available in GitHub PRs

## Security

### Vulnerability Scanning
- **Tool**: Trivy
- **Scope**: File system scan
- **Output**: SARIF format
- **Integration**: GitHub Security tab

### Code Quality
- **Backend**: Black formatting, Flake8 linting
- **Frontend**: ESLint linting
- **TypeScript**: Compilation checks

## E2E Testing Status

**Current Status**: E2E tests are written but not running in CI
**Reason**: Metro bundler dependency issue with Detox
**Workaround**: Comprehensive unit/integration tests provide coverage
**Future**: E2E tests will be added when Metro issue is resolved

## Monitoring and Alerts

### Test Results
- **Status**: Visible in GitHub PRs
- **Summary**: Generated in workflow summary
- **Coverage**: Reported to Codecov
- **Security**: Reported to GitHub Security tab

### Failure Handling
- **Non-blocking**: Security scans don't fail CI
- **Detailed logs**: Verbose output for debugging
- **Artifacts**: Coverage reports and build outputs

## Local Development

### Running Tests Locally

#### Backend
```bash
cd backend
pip install -r requirements.txt
pytest -v
```

#### Frontend
```bash
cd frontend-expo
npm install
npm test
```

### Pre-commit Hooks (Recommended)
```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files
```

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all secrets are set in GitHub
2. **Dependencies**: Check `requirements.txt` and `package-lock.json`
3. **Node Version**: Ensure compatibility with Expo
4. **Python Version**: Ensure compatibility with Django/FastAPI

### Debug Commands
```bash
# Check environment
echo $NODE_ENV
echo $SUPABASE_URL

# Verify dependencies
npm list
pip list

# Run specific test suites
npm test -- --testNamePattern="auth"
pytest -k "test_auth"
```

## Future Enhancements

1. **E2E Testing**: Add when Metro bundler issue is resolved
2. **Performance Testing**: Add load testing for API endpoints
3. **Deployment**: Add deployment workflows
4. **Notifications**: Add Slack/email notifications
5. **Metrics**: Add performance metrics collection

## Support

For CI/CD issues:
1. Check workflow logs in GitHub Actions
2. Verify environment variables and secrets
3. Test locally with same commands
4. Check dependency versions and compatibility
