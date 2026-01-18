'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useCreateTask';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface QuickAddTaskProps {
  scheduledDate: string;
  workspaceId?: string | null; // Optional when Master is selected
}

export function QuickAddTask({
  scheduledDate,
  workspaceId,
}: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(
    workspaceId || ''
  );
  const createTask = useCreateTask();
  const supabase = createClient();
  const { data: workspaces } = useWorkspaces();

  const needsWorkspaceSelector = !workspaceId;

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

  // Set default workspace when workspaces load
  useEffect(() => {
    if (needsWorkspaceSelector && workspaces && workspaces.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedWorkspace(workspaces[0].id);
    }
  }, [workspaces, needsWorkspaceSelector]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !userId) return;

    const targetWorkspace = workspaceId || selectedWorkspace;
    if (!targetWorkspace) {
      toast.error('Please select a workspace');
      return;
    }

    try {
      await createTask.mutateAsync([
        {
          title: title.trim(),
          scheduled_date: scheduledDate,
          workspace_id: targetWorkspace,
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
        <span>Add a task to Today...</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background flex w-full flex-col gap-3 rounded-lg border px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 flex-shrink-0 text-blue-500" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task to Today..."
          className="h-auto border-0 p-0 focus-visible:ring-0"
          autoFocus
          onBlur={() => {
            if (!title.trim() && !needsWorkspaceSelector) {
              setIsExpanded(false);
            }
          }}
        />
      </div>
      {needsWorkspaceSelector && workspaces && workspaces.length > 0 && (
        <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                <div className="flex items-center gap-2">
                  <span>{workspace.icon || '📋'}</span>
                  <span>{workspace.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {title.trim() && (
        <Button
          type="submit"
          size="sm"
          disabled={createTask.isPending}
          className="self-end"
        >
          {createTask.isPending ? 'Adding...' : 'Add'}
        </Button>
      )}
    </form>
  );
}
