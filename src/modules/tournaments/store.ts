import { create } from "zustand";
import type { TournamentMatch } from "@/core/types";

// Las pestañas ya no viven aquí: están en la URL (useTabParam), para que cada
// una tenga enlace propio. Aquí queda solo lo que no tiene sentido compartir.
interface TournamentState {
  scoreModalOpen: boolean;
  selectedMatch: TournamentMatch | null;
  resolutionModalOpen: boolean;
  seedingModalOpen: boolean;
  isScanning: boolean;
  openScoreModal: (match: TournamentMatch) => void;
  closeScoreModal: () => void;
  openResolutionModal: (match: TournamentMatch) => void;
  closeResolutionModal: () => void;
  openSeedingModal: () => void;
  closeSeedingModal: () => void;
  setScanning: (scanning: boolean) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  scoreModalOpen: false,
  selectedMatch: null,
  resolutionModalOpen: false,
  seedingModalOpen: false,
  isScanning: false,
  openScoreModal: (match) => set({ scoreModalOpen: true, selectedMatch: match }),
  closeScoreModal: () => set({ scoreModalOpen: false, selectedMatch: null }),
  openResolutionModal: (match) => set({ resolutionModalOpen: true, selectedMatch: match }),
  closeResolutionModal: () => set({ resolutionModalOpen: false, selectedMatch: null }),
  openSeedingModal: () => set({ seedingModalOpen: true }),
  closeSeedingModal: () => set({ seedingModalOpen: false }),
  setScanning: (isScanning) => set({ isScanning }),
}));
