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

### 7. **Verification**
- [ ] Run linter: `npm run lint`
- [ ] Check for TypeScript errors
- [ ] Test component functionality
- [ ] Verify imports resolve correctly

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
```

## Success Criteria

✅ All components <200 lines  
✅ Each component has single responsibility  
✅ Barrel exports working correctly  
✅ No linter errors  
✅ No unused files  
✅ All imports resolve  
✅ Type safety maintained  

---

**Note**: Refactor incrementally. Test after each major change.

