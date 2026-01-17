# Code Patterns — Nowly v2

This document contains reusable code patterns. Copy and adapt these for consistency.

## Data Fetching Hooks

### Basic Query Hook

```typescript
// src/hooks/useTasks.ts
import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

export function useTasks(scheduledDate: string) {
  const supabase = createClient();
  
  return useQuery(
    supabase
      .from('tasks')
      .select(`
        *,
        category:categories(id, name, color),
        subtasks:tasks!parent_task_id(id, title, is_completed)
      `)
      .eq('scheduled_date', scheduledDate)
      .is('parent_task_id', null)  // Only top-level tasks
      .order('position')
  );
}
```

### Mutation Hook with Optimistic Update

```typescript
// src/hooks/useToggleTaskComplete.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types/supabase';

export function useToggleTaskComplete() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed: !task.is_completed,
          completed_at: !task.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', task.id);
      
      if (error) throw error;
    },
    
    onMutate: async (task) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      // Optimistically update
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) =>
          t.id === task.id
            ? { ...t, is_completed: !t.is_completed }
            : t
        )
      );
      
      return { previousTasks };
    },
    
    onError: (err, task, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks'], context?.previousTasks);
    },
    
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### Insert Mutation

```typescript
// src/hooks/useCreateTask.ts
import { useInsertMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

export function useCreateTask() {
  const supabase = createClient();
  
  return useInsertMutation(
    supabase.from('tasks'),
    ['id'],  // Primary key for cache invalidation
    null,    // No count needed
    {
      onSuccess: () => {
        // Additional side effects if needed
      },
    }
  );
}
```

## Zustand Stores

### UI State Store

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;  // Icons only mode
  currentView: 'today' | 'upcoming' | 'inbox';
  selectedDate: string;  // ISO date string
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setView: (view: UIState['currentView']) => void;
  setSelectedDate: (date: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      currentView: 'today',
      selectedDate: new Date().toISOString().split('T')[0],
      
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setView: (view) => set({ currentView: view }),
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'nowly-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        currentView: state.currentView,
      }),
    }
  )
);
```

## Form Patterns

### Task Form with Zod + react-hook-form

```typescript
// src/components/features/tasks/TaskForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  scheduled_date: z.date().optional(),
  due_date: z.date().optional(),
  priority: z.number().min(0).max(3).default(0),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  defaultValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => void;
  isLoading?: boolean;
}

export function TaskForm({ defaultValues, onSubmit, isLoading }: TaskFormProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 0,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="What needs to be done?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scheduled_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Schedule for</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Task'}
        </Button>
      </form>
    </Form>
  );
}
```

## Server Action Pattern

```typescript
// src/app/(dashboard)/tasks/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { taskSchema } from '@/schemas/task';

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  
  // Validate auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  
  // Parse and validate input
  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    scheduled_date: formData.get('scheduled_date'),
    workspace_id: formData.get('workspace_id'),
  };
  
  const validated = taskSchema.pick({
    title: true,
    description: true,
    scheduled_date: true,
    workspace_id: true,
  }).safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }
  
  // Insert
  const { error } = await supabase.from('tasks').insert({
    ...validated.data,
    user_id: user.id,
  });
  
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/dashboard');
  return { success: true };
}
```

## Component Composition Pattern

```typescript
// Compound component pattern for TaskCard
// src/components/features/tasks/TaskCard.tsx

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { Task } from '@/types/supabase';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  className?: string;
}

export function TaskCard({ task, onToggleComplete, className }: TaskCardProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border p-3 transition-colors',
        'hover:bg-accent/50',
        task.is_completed && 'opacity-60',
        className
      )}
    >
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={() => onToggleComplete(task)}
        className="mt-0.5"
      />
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium truncate',
          task.is_completed && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>
        
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {task.description}
          </p>
        )}
        
        <TaskCard.Meta task={task} />
      </div>
      
      <TaskCard.Actions task={task} />
    </div>
  );
}

// Sub-components
TaskCard.Meta = function TaskCardMeta({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
      {task.due_date && (
        <span className={cn(
          'flex items-center gap-1',
          new Date(task.due_date) < new Date() && !task.is_completed && 'text-destructive'
        )}>
          <FlagIcon className="h-3 w-3" />
          {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
      {/* Add more meta items */}
    </div>
  );
};

TaskCard.Actions = function TaskCardActions({ task }: { task: Task }) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Quick action buttons */}
    </div>
  );
};
```

## Error Boundary Pattern

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground mt-2">
            {this.state.error?.message}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```
