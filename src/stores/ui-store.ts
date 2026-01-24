import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showCompletedTasks: boolean;
  setShowCompletedTasks: (show: boolean) => void;
  showWeekend: boolean;
  setShowWeekend: (show: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showCompletedTasks: false, // Default to hiding completed tasks
      setShowCompletedTasks: (show) => set({ showCompletedTasks: show }),
      showWeekend: true, // Default to showing weekend in weekly view
      setShowWeekend: (show) => set({ showWeekend: show }),
    }),
    {
      name: 'nowly-ui-storage',
    }
  )
);
