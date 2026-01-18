'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/useCreateTask';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface QuickAddBacklogProps {
  workspaceId: string;
}

export function QuickAddBacklog({ workspaceId }: QuickAddBacklogProps) {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const createTask = useCreateTask();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !userId) return;

    try {
      await createTask.mutateAsync([
        {
          title: title.trim(),
          workspace_id: workspaceId,
          user_id: userId,
          is_completed: false,
        },
      ]);

      setTitle('');
      setIsExpanded(false);
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/50 flex w-full items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-left transition-colors hover:border-solid"
      >
        <Plus className="h-4 w-4 text-blue-500" />
        <span>Add a task to the backlog...</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background flex w-full items-center gap-2 rounded-lg border px-4 py-3"
    >
      <Plus className="h-4 w-4 flex-shrink-0 text-blue-500" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task to the backlog..."
        className="h-auto border-0 p-0 focus-visible:ring-0"
        autoFocus
        onBlur={() => {
          if (!title.trim()) {
            setIsExpanded(false);
          }
        }}
      />
      {title.trim() && (
        <Button type="submit" size="sm" disabled={createTask.isPending}>
          {createTask.isPending ? 'Adding...' : 'Add'}
        </Button>
      )}
    </form>
  );
}
