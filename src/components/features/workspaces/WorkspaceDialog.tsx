'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useUpdateWorkspace } from '@/hooks/useUpdateWorkspace';
import { toast } from 'sonner';
import type { Workspace } from '@/types/supabase';
import { COLOR_SWATCHES } from '@/lib/constants/colors';

interface WorkspaceDialogProps {
  workspace?: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  workspaceCount: number;
}

const MAX_WORKSPACES = 10;

export function WorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  userId,
  workspaceCount,
}: WorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0].value);

  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  const isEditing = !!workspace;

  // Reset form when dialog opens/closes or workspace changes
  useEffect(() => {
    if (open) {
      if (workspace) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(workspace.name);

        setIcon(workspace.icon || '');

        setColor(workspace.color || COLOR_SWATCHES[0].value);
      } else {
        setName('');

        setIcon('');

        setColor(COLOR_SWATCHES[0].value);
      }
    }
  }, [open, workspace]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    // Check workspace limit when creating
    if (!isEditing && workspaceCount >= MAX_WORKSPACES) {
      toast.error(`Maximum ${MAX_WORKSPACES} workspaces allowed`, {
        description: 'Delete an existing workspace to create a new one',
      });
      return;
    }

    try {
      if (isEditing && workspace) {
        await updateWorkspace.mutateAsync({
          id: workspace.id,
          name: name.trim(),
          icon: icon.trim() || null,
          color,
        });
        toast.success('Workspace updated');
      } else {
        await createWorkspace.mutateAsync([
          {
            user_id: userId,
            name: name.trim(),
            icon: icon.trim() || null,
            color,
          },
        ]);
        toast.success('Workspace created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        isEditing ? 'Failed to update workspace' : 'Failed to create workspace',
        {
          description:
            error instanceof Error ? error.message : 'Please try again',
        }
      );
    }
  };

  const isLoading = createWorkspace.isPending || updateWorkspace.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Workspace' : 'Create Workspace'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Personal, Work"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon (optional)</Label>
            <Input
              id="icon"
              placeholder="Paste an emoji (e.g., 📋, 💼, 🏠)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
