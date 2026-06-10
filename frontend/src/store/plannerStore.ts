import { create } from "zustand";
import { getMondayOfWeek, toISODate } from "../lib/dateUtils";

interface PlannerState {
  currentWeekMonday: string;
  setWeek: (monday: string) => void;
  goNextWeek: () => void;
  goPrevWeek: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  currentWeekMonday: toISODate(getMondayOfWeek(new Date())),
  setWeek: (monday) => set({ currentWeekMonday: monday }),
  goNextWeek: () => {
    const d = new Date(get().currentWeekMonday + "T00:00:00");
    d.setDate(d.getDate() + 7);
    set({ currentWeekMonday: toISODate(d) });
  },
  goPrevWeek: () => {
    const d = new Date(get().currentWeekMonday + "T00:00:00");
    d.setDate(d.getDate() - 7);
    set({ currentWeekMonday: toISODate(d) });
  },
}));
