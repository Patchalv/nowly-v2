'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { RecurringTask } from '@/schemas/recurring-task';

interface QuickAddRecurringProps {
  workspaceId: string;
  onOpenDialog?: (defaultValues: Partial<RecurringTask>) => void;
}

export function QuickAddRecurring({
  workspaceId,
  onOpenDialog,
}: QuickAddRecurringProps) {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMoreOptions = () => {
    if (!title.trim()) return;

    if (onOpenDialog) {
      onOpenDialog({
        title: title.trim(),
        workspace_id: workspaceId,
      });
      setTitle('');
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/50 flex w-full items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-left transition-colors hover:border-solid"
      >
        <Plus className="h-4 w-4 text-blue-500" />
        <span>Add a recurring task...</span>
      </button>
    );
  }

  return (
    <div className="bg-background flex w-full items-center gap-2 rounded-lg border px-4 py-3">
      <Plus className="h-4 w-4 flex-shrink-0 text-blue-500" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a recurring task..."
        className="h-auto border-0 p-0 focus-visible:ring-0"
        autoFocus
        onBlur={() => {
          if (!title.trim()) {
            setIsExpanded(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            handleMoreOptions();
          }
        }}
      />
      {title.trim() && (
        <Button type="button" size="sm" onClick={handleMoreOptions}>
          Configure
        </Button>
      )}
    </div>
  );
}
