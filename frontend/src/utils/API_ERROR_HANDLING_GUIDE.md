# API Error Handling Guide

## Overview

This guide explains how to use the centralized error handling system for all API/DB calls. The system provides:

- ✅ **Non-blocking error display** (banners instead of modals)
- ✅ **Automatic retry logic** with exponential backoff
- ✅ **User-friendly error messages**
- ✅ **Easy to use** - just wrap your API calls
- ✅ **Consistent UX** across the entire app

## Components

### 1. `ErrorBanner` Component
Non-blocking inline error display with retry functionality.

### 2. `useApiCall` Hook
Wraps API calls with automatic error handling and retry logic.

### 3. `useApiCallWithBanner` Hook
Combines `useApiCall` + `ErrorBanner` for complete solution.

### 4. `apiErrorHandler` Utilities
Error normalization and user-friendly message extraction.

---

## Quick Start

### Basic Usage (Recommended)

```tsx
import { useApiCallWithBanner } from '../hooks/useApiCallWithBanner';
import { swapExercise } from '../services/trainingService';

function MyComponent() {
  const { execute, loading, ErrorBannerComponent } = useApiCallWithBanner(
    swapExercise,
    {
      retryCount: 3,
      onSuccess: (data) => {
        console.log('Exercise swapped!', data);
      },
    }
  );

  const handleSwap = async () => {
    const result = await execute(exerciseId, newExercise);
    if (result) {
      // Success! result contains the data
    }
    // If null, error is already displayed in banner
  };

  return (
    <View>
      <ErrorBannerComponent />
      <Button onPress={handleSwap} disabled={loading} />
    </View>
  );
}
```

### Advanced Usage (More Control)

```tsx
import { useApiCall } from '../hooks/useApiCall';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { normalizeApiError } from '../utils/apiErrorHandler';

function MyComponent() {
  const { execute, loading, error, retry, clearError } = useApiCall(
    swapExercise,
    {
      retryCount: 3,
      retryDelay: 1000,
      onSuccess: (data) => {
        // Custom success handling
      },
      onError: (error) => {
        // Custom error handling
      },
    }
  );

  const normalizedError = error ? normalizeApiError(error) : null;

  return (
    <View>
      {normalizedError && (
        <ErrorBanner
          error={normalizedError.message}
          onRetry={retry}
          onDismiss={clearError}
          retryable={normalizedError.retryable}
          autoDismiss={true}
          dismissAfter={5000}
        />
      )}
      <Button onPress={() => execute(exerciseId, newExercise)} />
    </View>
  );
}
```

---

## Migration Examples

### Before (Old Way)

```tsx
const handleSwapExercise = async () => {
  try {
    setLoading(true);
    const result = await swapExercise(exerciseId, newExercise);
    // Success
  } catch (error) {
    console.error('Error:', error);
    Alert.alert('Error', 'Failed to swap exercise');
  } finally {
    setLoading(false);
  }
};
```

### After (New Way)

```tsx
const { execute, loading, ErrorBannerComponent } = useApiCallWithBanner(
  swapExercise,
  { retryCount: 3 }
);

const handleSwapExercise = async () => {
  await execute(exerciseId, newExercise);
  // Error is automatically handled and displayed in banner
};

// In JSX:
<ErrorBannerComponent />
```

---

## Options

### `useApiCall` Options

```typescript
{
  onSuccess?: (data: any) => void;      // Called on success
  onError?: (error: Error) => void;     // Called on error (after retries)
  retryCount?: number;                  // Max retry attempts (default: 3)
  retryDelay?: number;                  // Base delay in ms (default: 1000)
  retryable?: boolean;                  // Enable retries (default: true)
  showError?: boolean;                   // Log errors (default: true)
}
```

### `ErrorBanner` Props

```typescript
{
  error: string | Error | null;         // Error to display
  onRetry?: () => void;                 // Retry callback
  onDismiss?: () => void;               // Dismiss callback
  variant?: 'error' | 'warning' | 'info';
  autoDismiss?: boolean;                // Auto-dismiss after timeout
  dismissAfter?: number;                // Dismiss timeout in ms (default: 5000)
  retryable?: boolean;                  // Show retry button
}
```

---

## Error Types Handled

The system automatically categorizes and handles:

- ✅ **Network errors** - Connection issues, timeouts
- ✅ **Server errors** - 5xx status codes
- ✅ **Rate limiting** - 429 status code
- ✅ **Authentication** - 401, 403 status codes
- ✅ **Validation** - 400, 422 status codes
- ✅ **Not found** - 404 status codes

---

## Retry Logic

- **Automatic retries** for network errors and 5xx server errors
- **Exponential backoff** - delays increase: 1s, 2s, 4s, 8s...
- **Max delay** - capped at 30 seconds
- **Non-retryable errors** - 4xx errors (except 429) are not retried

---

## Best Practices

1. **Use `useApiCallWithBanner`** for most cases - it's the simplest
2. **Place `ErrorBannerComponent`** at the top of your screen/component
3. **Set appropriate retry counts** - 3 for most operations, 1-2 for user actions
4. **Use `onSuccess` callback** for side effects (navigation, state updates)
5. **Don't show Alert.alert** - let the banner handle it
6. **Keep error handling consistent** - use the same pattern everywhere

---

## Examples for Training Screen

### Swap Exercise

```tsx
const { execute: swapExercise, loading: swapping, ErrorBannerComponent: SwapErrorBanner } = 
  useApiCallWithBanner(swapExerciseApi, { retryCount: 3 });

const handleSwap = async () => {
  await swapExercise(exerciseId, newExercise);
};
```

### Add Exercise

```tsx
const { execute: addExercise, loading: adding, ErrorBannerComponent: AddErrorBanner } = 
  useApiCallWithBanner(addExerciseApi, { retryCount: 2 });
```

### Remove Exercise

```tsx
const { execute: removeExercise, loading: removing, ErrorBannerComponent: RemoveErrorBanner } = 
  useApiCallWithBanner(removeExerciseApi, { retryCount: 2 });
```

### Complete Training

```tsx
const { execute: completeTraining, loading: completing, ErrorBannerComponent: CompleteErrorBanner } = 
  useApiCallWithBanner(completeTrainingApi, { 
    retryCount: 3,
    onSuccess: () => {
      // Navigate or show success message
    }
  });
```

---

## Testing

The hooks are easy to test:

```tsx
// Mock the API function
const mockApi = jest.fn().mockRejectedValue(new Error('Network error'));

const { result } = renderHook(() => useApiCall(mockApi, { retryCount: 2 }));

await act(async () => {
  await result.current.execute();
});

expect(result.current.error).toBeTruthy();
expect(result.current.loading).toBe(false);
```

---

## Migration Checklist

- [ ] Replace `try-catch` blocks with `useApiCall` or `useApiCallWithBanner`
- [ ] Remove `Alert.alert` for errors
- [ ] Add `ErrorBannerComponent` to JSX
- [ ] Set appropriate `retryCount` for each operation
- [ ] Test error scenarios (network offline, server errors)
- [ ] Verify retry logic works correctly

