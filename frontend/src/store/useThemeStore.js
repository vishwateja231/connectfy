import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("connectfy-theme") || "coffee",
  setTheme: (theme) => {
    localStorage.setItem("connectfy-theme", theme);
    set({ theme });
  },
}));
