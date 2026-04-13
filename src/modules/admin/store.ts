"use client";

import { create } from "zustand";

interface AdminState {
  wizardOpen: boolean;
  wizardStep: number;
  openWizard: () => void;
  closeWizard: () => void;
  setWizardStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  wizardOpen: false,
  wizardStep: 0,
  openWizard: () => set({ wizardOpen: true, wizardStep: 0 }),
  closeWizard: () => set({ wizardOpen: false, wizardStep: 0 }),
  setWizardStep: (step) => set({ wizardStep: step }),
  nextStep: () => set((s) => ({ wizardStep: Math.min(s.wizardStep + 1, 3) })),
  prevStep: () => set((s) => ({ wizardStep: Math.max(s.wizardStep - 1, 0) })),
}));
