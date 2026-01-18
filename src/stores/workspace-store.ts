import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  selectedWorkspaceId: string | null; // null = "Master" (all workspaces)
  setSelectedWorkspaceId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null, // Default to "Master"
      setSelectedWorkspaceId: (id) => set({ selectedWorkspaceId: id }),
    }),
    {
      name: 'nowly-workspace-storage',
    }
  )
);
