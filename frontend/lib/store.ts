"use client";
import { create } from "zustand";
import { TaskId } from "./types";

interface AppState {
  theme: "dark" | "light";
  toggleTheme: () => void;
  selectedModel: Partial<Record<TaskId, string>>;
  setSelectedModel: (task: TaskId, modelId: string) => void;
  threshold: Partial<Record<TaskId, number>>;
  setThreshold: (task: TaskId, value: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  selectedModel: {},
  setSelectedModel: (task, modelId) =>
    set((s) => ({ selectedModel: { ...s.selectedModel, [task]: modelId } })),
  threshold: {},
  setThreshold: (task, value) =>
    set((s) => ({ threshold: { ...s.threshold, [task]: value } })),
}));
