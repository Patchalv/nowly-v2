'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProfile } from '@/hooks/useProfile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCategories } from '@/hooks/useCategories';
import { useDeleteWorkspace } from '@/hooks/useDeleteWorkspace';
import { useDeleteCategory } from '@/hooks/useDeleteCategory';
import { WorkspaceDialog } from '@/components/features/workspaces/WorkspaceDialog';
import { CategoryDialog } from '@/components/features/categories/CategoryDialog';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import type { Workspace, Category } from '@/types/supabase';
import { ReplayTourButton } from '@/components/features/onboarding';

export default function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Workspace dialog state
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null
  );

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedWorkspaceForCategory, setSelectedWorkspaceForCategory] =
    useState<string>('');
  const [selectedCategoryCount, setSelectedCategoryCount] = useState(0);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'workspace' | 'category';
    id: string;
    name: string;
  } | null>(null);

  const supabase = createClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const updateProfile = useUpdateProfile();
  const deleteWorkspace = useDeleteWorkspace();
  const deleteCategory = useDeleteCategory();

  // Get current user
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

  // Set full name from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile || !fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        full_name: fullName.trim(),
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error('Failed to log out', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleCreateWorkspace = () => {
    setEditingWorkspace(null);
    setWorkspaceDialogOpen(true);
  };

  const handleEditWorkspace = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setWorkspaceDialogOpen(true);
  };

  const handleDeleteWorkspace = (workspace: Workspace) => {
    // Check if this is the last workspace
    if (workspaces && workspaces.length === 1) {
      toast.error('Cannot delete last workspace', {
        description: 'You must have at least one workspace',
      });
      return;
    }

    setDeleteTarget({
      type: 'workspace',
      id: workspace.id,
      name: workspace.name,
    });
    setDeleteConfirmOpen(true);
  };

  const handleCreateCategory = (workspaceId: string, categoryCount: number) => {
    setEditingCategory(null);
    setSelectedWorkspaceForCategory(workspaceId);
    setSelectedCategoryCount(categoryCount);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (
    category: Category,
    workspaceId: string,
    categoryCount: number
  ) => {
    setEditingCategory(category);
    setSelectedWorkspaceForCategory(workspaceId);
    setSelectedCategoryCount(categoryCount);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setDeleteTarget({ type: 'category', id: category.id, name: category.name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'workspace') {
        await deleteWorkspace.mutateAsync({ id: deleteTarget.id });
        toast.success('Workspace deleted');
      } else {
        await deleteCategory.mutateAsync({ id: deleteTarget.id });
        toast.success('Category deleted');
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(`Failed to delete ${deleteTarget.type}`, {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const isLoading = profileLoading || workspacesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold">Account</h1>

      {/* Account Information Section */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 text-xl font-semibold">Account Information</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Card>

      {/* Onboarding Section */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 text-xl font-semibold">Onboarding</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Replay the introductory tour to refresh your knowledge of
            Nowly&apos;s features.
          </p>
          <ReplayTourButton />
        </div>
      </Card>

      {/* Logout Button */}
      <div className="mb-6">
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full sm:w-auto"
        >
          Log out
        </Button>
      </div>

      <Separator className="my-8" />

      {/* My Workspaces Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">My Workspaces</h2>
          <Button onClick={handleCreateWorkspace} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>

        <div className="space-y-4">
          {workspaces?.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onEdit={handleEditWorkspace}
              onDelete={handleDeleteWorkspace}
              onCreateCategory={handleCreateCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}

          {workspaces?.length === 0 && (
            <p className="text-muted-foreground py-8 text-center">
              No workspaces yet. Create your first workspace to get started.
            </p>
          )}
        </div>
      </div>

      {/* Workspace Dialog */}
      {userId && (
        <WorkspaceDialog
          workspace={editingWorkspace}
          open={workspaceDialogOpen}
          onOpenChange={(open) => {
            setWorkspaceDialogOpen(open);
            if (!open) setEditingWorkspace(null);
          }}
          userId={userId}
          workspaceCount={workspaces?.length || 0}
        />
      )}

      {/* Category Dialog */}
      <CategoryDialog
        category={editingCategory}
        workspaceId={selectedWorkspaceForCategory}
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            setSelectedWorkspaceForCategory('');
            setSelectedCategoryCount(0);
          }
        }}
        categoryCount={selectedCategoryCount}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteTarget?.type}{' '}
              <strong>{deleteTarget?.name}</strong>.
              {deleteTarget?.type === 'workspace' &&
                ' All tasks in this workspace will also be deleted.'}
              {' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface WorkspaceCardProps {
  workspace: Workspace;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
  onCreateCategory: (workspaceId: string, categoryCount: number) => void;
  onEditCategory: (
    category: Category,
    workspaceId: string,
    categoryCount: number
  ) => void;
  onDeleteCategory: (category: Category) => void;
}

function WorkspaceCard({
  workspace,
  onEdit,
  onDelete,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}: WorkspaceCardProps) {
  const { data: categories } = useCategories(workspace.id);
  const categoryCount = categories?.length || 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
            style={{ backgroundColor: workspace.color || '#6366f1' }}
          >
            {workspace.icon || '📋'}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{workspace.name}</h3>
            <p className="text-muted-foreground text-sm">
              {categories?.length || 0} categories
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(workspace)}
            aria-label="Edit workspace"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(workspace)}
            aria-label="Delete workspace"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mt-4 border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-muted-foreground text-sm font-medium uppercase">
            Categories
          </h4>
          <Button
            variant="link"
            size="sm"
            onClick={() => onCreateCategory(workspace.id, categoryCount)}
            className="text-primary h-auto p-0"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Category
          </Button>
        </div>

        <div className="space-y-2">
          {categories?.map((category) => (
            <div
              key={category.id}
              className="hover:bg-accent/50 group flex items-center justify-between rounded-md px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color || '#6366f1' }}
                />
                <span className="text-sm">{category.name}</span>
              </div>
              <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    onEditCategory(category, workspace.id, categoryCount)
                  }
                  aria-label="Edit category"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDeleteCategory(category)}
                  aria-label="Delete category"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {categories?.length === 0 && (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No categories yet
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
