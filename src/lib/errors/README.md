# Error Handlers

Error handling utilities for Nowly v2 that integrate with Sentry for production error monitoring.

## Features

- **Development-friendly**: Console logging with full error details in development
- **Production-ready**: Automatic Sentry error capture in production
- **Privacy-first**: Automatic PII scrubbing (emails, tokens, sensitive data)
- **Type-safe**: Full TypeScript support with strict typing
- **Context-aware**: Rich error context for better debugging

## Files

- `supabase-error-handler.ts` - Handles Supabase database (Postgrest) errors

## Usage

### Supabase Database Errors

```typescript
import { handleSupabaseError } from '@/lib/errors/supabase-error-handler';

// In a data fetching hook
export function useTasks() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    handleSupabaseError(error, {
      table: 'tasks',
      operation: 'select',
      userId: userId,
      source: 'useTasks',
      metadata: { filters: 'user_id' },
    });

    // Handle error in your UI
    throw error;
  }

  return data;
}
```

### Type Guard Usage

```typescript
import {
  isPostgrestError,
  handleSupabaseError,
} from '@/lib/errors/supabase-error-handler';

try {
  // Some operation
} catch (err) {
  if (isPostgrestError(err)) {
    handleSupabaseError(err, {
      table: 'tasks',
      operation: 'insert',
    });
  }
}
```

### Server Actions

```typescript
'use server';

import { handleSupabaseError } from '@/lib/errors/supabase-error-handler';
import { createClient } from '@/lib/supabase/server';

export async function createTask(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: formData.get('title'),
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    handleSupabaseError(error, {
      table: 'tasks',
      operation: 'insert',
      userId,
      source: 'createTaskAction',
    });

    return { error: 'Failed to create task' };
  }

  return { data };
}
```

## Environment-Based Behavior

### Development (`NODE_ENV=development`)

- Errors logged to console with full details
- No Sentry capture
- Includes hints and detailed error messages

### Production (`NODE_ENV=production`)

- Errors sent to Sentry (if `NEXT_PUBLIC_SENTRY_DSN` is set)
- PII automatically scrubbed
- Structured error context for debugging
- User-friendly error messages

## Sentry Integration

When errors are captured in production, they include:

### Supabase Errors

- **Tags**: `error_type`, `error_code`, `table`, `operation`
- **Contexts**: Full Postgrest error details, operation context
- **User**: User ID (if provided)
- **Extra**: Custom metadata

## Best Practices

1. **Always provide context**: Include `table`, `operation`, `source` for better debugging
2. **Include user ID**: Helps track user-specific issues (PII is automatically scrubbed)
3. **Add metadata**: Custom data that helps understand the error
4. **Use type guards**: Check error types before handling
5. **Handle errors close to source**: Call error handlers where errors occur

## Privacy & Security

- ✅ Email addresses automatically redacted from error messages
- ✅ Phone numbers scrubbed
- ✅ Tokens and secrets removed
- ✅ User data limited to non-PII fields (e.g., user ID only)
- ✅ No sensitive data sent to Sentry in production
- ✅ Full details available in development for debugging
