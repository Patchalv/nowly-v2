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
import { useCreateCategory } from '@/hooks/useCreateCategory';
import { useUpdateCategory } from '@/hooks/useUpdateCategory';
import { toast } from 'sonner';
import type { Category } from '@/types/supabase';
import { COLOR_SWATCHES } from '@/lib/constants/colors';

interface CategoryDialogProps {
  category?: Category | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryCount: number;
}

const MAX_CATEGORIES_PER_WORKSPACE = 20;

export function CategoryDialog({
  category,
  workspaceId,
  open,
  onOpenChange,
  categoryCount,
}: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0].value);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = !!category;

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(category.name);

        setColor(category.color || COLOR_SWATCHES[0].value);
      } else {
        setName('');

        setColor(COLOR_SWATCHES[0].value);
      }
    }
  }, [open, category]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    // Check category limit when creating
    if (!isEditing && categoryCount >= MAX_CATEGORIES_PER_WORKSPACE) {
      toast.error(
        `Maximum ${MAX_CATEGORIES_PER_WORKSPACE} categories per workspace`,
        {
          description: 'Delete an existing category to create a new one',
        }
      );
      return;
    }

    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          name: name.trim(),
          color,
        });
        toast.success('Category updated');
      } else {
        await createCategory.mutateAsync([
          {
            workspace_id: workspaceId,
            name: name.trim(),
            color,
          },
        ]);
        toast.success('Category created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        isEditing ? 'Failed to update category' : 'Failed to create category',
        {
          description:
            error instanceof Error ? error.message : 'Please try again',
        }
      );
    }
  };

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Health, Finance, Projects"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
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
