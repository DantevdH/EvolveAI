# Refactoring Guide

Concise guide for refactoring large component folders into smaller, maintainable modules.

## Structure Pattern

### Before
```
components/
  └── FeatureName.tsx (1000+ lines, monolithic)
```

### After
```
components/
  └── featureName/
      ├── FeatureName.tsx          # Main orchestrator
      ├── SubComponent1.tsx         # Focused sub-components
      ├── SubComponent2.tsx
      ├── types.ts                  # Shared types
      └── index.ts                  # Barrel export
```

## Refactoring Checklist

### 1. **Analysis Phase**
- [ ] Identify main component responsibilities
- [ ] List all sub-components that can be extracted
- [ ] Check for unused files (grep imports)
- [ ] Identify shared utilities/types
- [ ] Map state dependencies (context, hooks, props)
- [ ] Identify custom hooks that can be extracted
- [ ] Note any side effects (API calls, subscriptions)

### 2. **Create Folder Structure**
- [ ] Create feature folder: `featureName/`
- [ ] Create sub-components with single responsibility
- [ ] Extract shared types to `types.ts`
- [ ] Create `index.ts` for barrel exports

### 3. **Component Extraction Rules**
- **Extract if**: Component has >50 lines, distinct responsibility, reusable
- **Keep together**: Related UI elements, tightly coupled logic
- **Naming**: Remove suffixes like "Gamified" → use descriptive names

### 4. **File Organization**
```
featureName/
├── FeatureName.tsx          # Main component (orchestrator)
├── ComponentA.tsx           # Individual sub-components
├── ComponentB.tsx
├── ComponentC.tsx
├── utils.ts                 # Utility functions (if needed)
├── types.ts                 # TypeScript interfaces/types
└── index.ts                 # Barrel export: export { default as X } from './X'
```

### 5. **Update Imports**
- [ ] Update all imports to use barrel exports: `from './featureName'`
- [ ] Fix relative paths (e.g., `../ProgressRing` not `../../ProgressRing`)
- [ ] Verify no broken imports (run linter)

### 6. **Cleanup**
- [ ] Delete old monolithic files
- [ ] Remove unused files (verify with grep first)
- [ ] Remove console.log statements (or use proper logging)
- [ ] Verify all files are used
- [ ] Update component documentation/comments
- [ ] Check for circular dependencies

### 7. **Verification**
- [ ] Run linter: `npm run lint`
- [ ] Check for TypeScript errors
- [ ] Test component functionality (manual testing)
- [ ] Run unit tests: `npm test -- --testPathPattern="componentName"`
- [ ] Verify imports resolve correctly
- [ ] Check bundle size impact (if significant)
- [ ] Test in development environment

## Best Practices

### Component Size
- **Main orchestrator**: 100-200 lines max
- **Sub-components**: 50-150 lines each
- **Extract if**: Component has multiple concerns or >200 lines

### Naming Conventions
- **Folders**: `camelCase` (e.g., `exerciseRow/`, `dailyDetail/`)
- **Components**: `PascalCase` (e.g., `ExerciseRow.tsx`)
- **Types**: `PascalCase` interfaces (e.g., `ExerciseRowProps`)
- **Utils**: `camelCase` functions (e.g., `calculateStars`)

### Type Safety
- Extract shared types to `types.ts`
- Use TypeScript interfaces for props
- Avoid `any` types (use proper typing)

### Barrel Exports
```typescript
// index.ts
export { default as MainComponent } from './MainComponent';
export { default as SubComponent1 } from './SubComponent1';
export { default as SubComponent2 } from './SubComponent2';
export * from './types';
```

### Import Pattern
```typescript
// ✅ Good: Barrel export
import { MainComponent, SubComponent1 } from './featureName';

// ❌ Bad: Direct imports
import MainComponent from './featureName/MainComponent';
```

## Example Refactoring

### Training Header (Before → After)
```
Before:
  TrainingHeaderGamified.tsx (279 lines)

After:
  header/
    ├── TrainingHeader.tsx (main)
    ├── BackButton.tsx
    ├── ProgressSection.tsx
    ├── WeekdayPath.tsx
    ├── WeekdayButton.tsx
    ├── types.ts
    └── index.ts
```

## Common Patterns

### Shared Components
- Keep shared components at root level if used by multiple folders
- Example: `ProgressRing.tsx` (used by header/ and journeyMap/)

### Modals/Views
- Large modals (>500 lines) can stay at root if they're self-contained
- Consider extracting if they have multiple sub-components

### Utilities
- Extract utility functions to `utils.ts` if used by multiple components
- Keep component-specific utilities within component files

### Custom Hooks
- Extract hooks if: logic is reusable, >30 lines, used by multiple components
- Pattern: `useFeatureName.ts` in feature folder or `hooks/` directory
- Example: `useTraining.ts`, `useDailyFeedback.ts`

### State Management
- **Props**: Use for parent-child communication (1-2 levels)
- **Context**: Use for shared state across multiple components (`AppContext`, `AuthContext`)
- **Local State**: Use `useState` for component-specific state
- **Avoid**: Excessive prop drilling (>3 levels → consider Context)

## State Management Patterns

### Props Flow
```typescript
// ✅ Good: Clear prop interface
interface SubComponentProps {
  data: DataType;
  onAction: (id: string) => void;
  isLoading?: boolean;
}

// ❌ Bad: Passing entire objects unnecessarily
interface SubComponentProps {
  parentState: ParentState; // Too much data
}
```

### Context Usage
```typescript
// ✅ Good: Use context for shared state
const { state, setUser } = useAppContext();

// ❌ Bad: Prop drilling through 4+ components
<ComponentA>
  <ComponentB user={user}>
    <ComponentC user={user}>
      <ComponentD user={user} /> // Too deep
```

### Custom Hooks
```typescript
// ✅ Good: Extract reusable logic
// hooks/useFeatureName.ts
export const useFeatureName = () => {
  const [state, setState] = useState();
  // ... logic
  return { state, actions };
};

// Component
const MyComponent = () => {
  const { state, actions } = useFeatureName();
  // ...
};
```

## Testing After Refactoring

### Unit Testing
- Test each extracted component independently
- Mock dependencies (context, hooks, services)
- Verify props are passed correctly
- Test edge cases for each sub-component

### Integration Testing
- Test component interactions
- Verify data flow between components
- Test with real context providers
- Check for regressions in behavior

### Test Commands
```bash
# Run tests for specific component
npm test -- --testPathPattern="featureName"

# Run with coverage
npm test -- --coverage --testPathPattern="featureName"

# Watch mode during development
npm test -- --watch --testPathPattern="featureName"
```

## Common Pitfalls

### ⚠️ Circular Dependencies
```typescript
// ❌ Bad: ComponentA imports ComponentB, ComponentB imports ComponentA
// Solution: Move shared types to types.ts, use barrel exports carefully
```

### ⚠️ Over-extraction
```typescript
// ❌ Bad: Extracting 10-line components unnecessarily
// Solution: Only extract if component has distinct responsibility (>50 lines)
```

### ⚠️ Breaking Context Dependencies
```typescript
// ❌ Bad: Forgetting to wrap refactored components with context providers
// Solution: Verify context usage in tests, check component tree
```

### ⚠️ Import Path Issues
```typescript
// ❌ Bad: Inconsistent import paths
import Component from './featureName/Component';
import Component from '../featureName/Component';

// ✅ Good: Use barrel exports consistently
import { Component } from './featureName';
```

### ⚠️ State Synchronization
```typescript
// ❌ Bad: Local state not synced with context
// Solution: Use context directly or sync state properly
```

## Git Workflow

### Commit Strategy
```bash
# 1. Create feature branch
git checkout -b refactor/feature-name

# 2. Commit incrementally
git add featureName/
git commit -m "refactor: extract SubComponent from FeatureName"

# 3. Update imports
git add -u # Update modified imports
git commit -m "refactor: update imports to use barrel exports"

# 4. Cleanup
git add -A
git commit -m "refactor: remove old monolithic file"

# 5. Final verification
npm run lint
npm test
git commit -m "refactor: verify all tests pass"
```

### Commit Messages
- Use prefix: `refactor:`
- Be descriptive: `refactor: extract ProgressSection from TrainingHeader`
- Keep commits focused (one logical change per commit)

## Performance Considerations

### Bundle Size
- Barrel exports don't increase bundle size significantly
- Tree-shaking works with proper exports
- Check bundle size: `npm run build -- --analyze` (if available)

### Memoization
```typescript
// Consider memo for expensive sub-components
export const ExpensiveComponent = React.memo(({ data }) => {
  // ...
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensive(data);
}, [data]);
```

## Quick Reference

```bash
# Check for unused files
grep -r "import.*ComponentName" frontend/src

# Check for console.log
grep -r "console\." frontend/src/components/featureName

# Run linter
npm run lint

# Find all TypeScript files
find frontend/src/components/featureName -name "*.tsx" -o -name "*.ts"

# Check for circular dependencies
npm run check-circular  # If available, or use madge

# Find component usage
grep -r "from.*featureName" frontend/src

# Check TypeScript compilation
npx tsc --noEmit
```

## Success Criteria

✅ All components <200 lines  
✅ Each component has single responsibility  
✅ Barrel exports working correctly  
✅ No linter errors  
✅ No unused files  
✅ All imports resolve  
✅ Type safety maintained  
✅ Tests passing (unit + integration)  
✅ No circular dependencies  
✅ State management properly handled  
✅ Performance maintained or improved  

---

## Migration Strategy

### Incremental Refactoring
1. **Start small**: Extract one sub-component at a time
2. **Test frequently**: Verify after each extraction
3. **Keep old file**: Don't delete until all extractions are complete
4. **Update imports gradually**: Use find/replace for consistency
5. **Final cleanup**: Delete old file only after full verification

### Large Component Strategy
For components >1000 lines:
1. Extract obvious sub-components first (buttons, headers, etc.)
2. Extract state management logic (custom hooks)
3. Extract utility functions
4. Extract remaining UI components
5. Refactor main orchestrator last

### Rollback Plan
- Keep old file in git history (don't force delete)
- Use feature branch for refactoring
- Test thoroughly before merging
- Have reviewer test functionality manually

---

**Note**: Refactor incrementally. Test after each major change. When in doubt, extract smaller components first—they can always be merged later if needed.

