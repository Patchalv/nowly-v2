---
name: sentry-instrumentation
description: Sentry breadcrumb and transaction patterns for Nowly v2. Use when adding Sentry.addBreadcrumb calls for user actions, or wrapping multi-step operations in Sentry.startSpan transactions.
---

# Sentry Instrumentation Patterns

Error-handler usage (`handleSupabaseError`, `handleAuthError`), the key principles,
and the GDPR user-context rule live in `AGENTS.md` and always apply.

**Add breadcrumbs for user actions:**

```typescript
import * as Sentry from '@sentry/nextjs';

// ✅ CORRECT: Add breadcrumbs before critical operations
async function createTask(taskData: TaskInput) {
  Sentry.addBreadcrumb({
    category: 'task',
    message: 'Creating new task',
    level: 'info',
    data: {
      workspace_id: taskData.workspace_id,
      category_id: taskData.category_id,
      // Don't include PII like task title
    },
  });

  const { data, error } = await supabase.from('tasks').insert(taskData);
  // ... error handling
}

// ✅ CORRECT: Track user interactions
function handleWorkspaceSwitch(workspaceId: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: 'Switched workspace',
    level: 'info',
    data: { workspace_id: workspaceId },
  });
}
```

**Monitor critical operations with transactions:**

```typescript
import * as Sentry from '@sentry/nextjs';

// ✅ CORRECT: Use transactions for complex operations
async function completeRecurringTask(taskId: string) {
  return await Sentry.startSpan(
    {
      op: 'task.complete_recurring',
      name: 'Complete Recurring Task',
      attributes: { task_id: taskId },
    },
    async () => {
      // Mark current instance complete
      const { error: completeError } = await supabase
        .from('tasks')
        .update({ is_completed: true })
        .eq('id', taskId);

      if (completeError) {
        handleSupabaseError(completeError, {
          table: 'tasks',
          operation: 'update',
          source: 'completeRecurringTask',
        });
        throw completeError;
      }

      // Generate next instance
      const { error: generateError } = await generateNextInstance(taskId);
      if (generateError) throw generateError;

      return { success: true };
    }
  );
}
```

See [`src/lib/errors/README.md`](../../../src/lib/errors/README.md) for detailed examples.
