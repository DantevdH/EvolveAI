# Branch Naming Best Practices

This document outlines best practices for naming Git branches in the EvolveAI project.

## Core Principles

- **Use lowercase letters** - Branch names are case-sensitive and lowercase avoids confusion
- **Use hyphens instead of underscores** - Hyphens are more readable and URL-friendly
- **Be descriptive but concise** - Clearly indicate the branch's purpose
- **Use prefixes** - Categorize branches by type (feature, bugfix, hotfix, etc.)

## Branch Naming Conventions

### Standard Prefixes

```
feature/<description>     - New features or enhancements
bugfix/<description>      - Bug fixes
hotfix/<description>      - Urgent production fixes
chore/<description>       - Maintenance tasks (dependencies, configs)
docs/<description>        - Documentation updates
refactor/<description>    - Code refactoring
test/<description>        - Test additions or improvements
```

### Examples

✅ **Good branch names:**
- `feature/user-authentication`
- `bugfix/login-error-handling`
- `hotfix/payment-gateway-timeout`
- `chore/update-dependencies`
- `docs/api-documentation`
- `refactor/rag-service-optimization`

❌ **Bad branch names:**
- `my-branch` (not descriptive)
- `feature1` (too vague)
- `fix-bug` (doesn't specify what)
- `User_Authentication` (uses uppercase and underscores)
- `feature/user authentication` (contains spaces)

## Protected Branches

The following branches are protected and should **never** be deleted or force-pushed:

- `main` - Production-ready code
- `develop` - Development integration branch

## Branch Naming Patterns

### Feature Branches
Use descriptive names that indicate what the feature does:
```
feature/training-plan-customization
feature/chat-interface-redesign
feature/mobile-responsive-navigation
```

### Bug Fix Branches
Include the issue number or a brief description:
```
bugfix/session-save-error-1234
bugfix/memory-leak-profile-page
```

### Hotfix Branches
For urgent production fixes, include the issue or a brief description:
```
hotfix/payment-processing-error
hotfix/critical-security-patch
```

## Best Practices

1. **Include ticket/issue numbers** when applicable:
   ```
   feature/PROJ-123-add-oauth-login
   bugfix/PROJ-456-fix-date-parsing
   ```

2. **Keep names short but meaningful** - Aim for 3-5 words maximum

3. **Use present tense** - Branch names describe what the branch does

4. **Avoid special characters** - Stick to letters, numbers, and hyphens

5. **Never commit directly to main or develop** - Always use feature branches and PRs

## Branch Lifecycle

1. Create branch from `develop` or `main` (for hotfixes)
2. Work on your changes
3. Push to remote and create Pull Request
4. After merge, delete the branch:
   ```bash
   # Delete local branch
   git branch -d feature/my-feature
   
   # Delete remote branch (usually done automatically after PR merge)
   git push origin --delete feature/my-feature
   ```

## Cleanup Commands

To clean up old branches (keep only `main` and `develop`):

```bash
# Delete all local branches except main and develop
git branch --format '%(refname:short)' | grep -vE '^(main|develop)$' | xargs -r -n1 git branch -D

# Delete all remote branches except main and develop
git branch -r | sed 's|^[[:space:]]*||' | grep '^origin/' | grep -vE 'origin/(main|develop)$' | grep -v 'origin/HEAD' | cut -d/ -f2- | xargs -r -n1 git push origin --delete
```

**⚠️ Warning**: Always ensure you're on `main` or `develop` before running cleanup commands.
