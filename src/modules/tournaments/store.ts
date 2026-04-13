import { create } from "zustand";
import type { TournamentMatch } from "@/core/types";

interface TournamentState {
  activeTab: "overview" | "players" | "bracket";
  overviewSubTab: "details" | "rules" | "prizes" | "contact";
  bracketSubTab: "bracket" | "standings";
  scoreModalOpen: boolean;
  selectedMatch: TournamentMatch | null;
  resolutionModalOpen: boolean;
  seedingModalOpen: boolean;
  isScanning: boolean;
  setActiveTab: (tab: "overview" | "players" | "bracket") => void;
  setOverviewSubTab: (tab: "details" | "rules" | "prizes" | "contact") => void;
  setBracketSubTab: (tab: "bracket" | "standings") => void;
  openScoreModal: (match: TournamentMatch) => void;
  closeScoreModal: () => void;
  openResolutionModal: (match: TournamentMatch) => void;
  closeResolutionModal: () => void;
  openSeedingModal: () => void;
  closeSeedingModal: () => void;
  setScanning: (scanning: boolean) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  activeTab: "overview",
  overviewSubTab: "details",
  bracketSubTab: "bracket",
  scoreModalOpen: false,
  selectedMatch: null,
  resolutionModalOpen: false,
  seedingModalOpen: false,
  isScanning: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setOverviewSubTab: (tab) => set({ overviewSubTab: tab }),
  setBracketSubTab: (tab) => set({ bracketSubTab: tab }),
  openScoreModal: (match) => set({ scoreModalOpen: true, selectedMatch: match }),
  closeScoreModal: () => set({ scoreModalOpen: false, selectedMatch: null }),
  openResolutionModal: (match) => set({ resolutionModalOpen: true, selectedMatch: match }),
  closeResolutionModal: () => set({ resolutionModalOpen: false, selectedMatch: null }),
  openSeedingModal: () => set({ seedingModalOpen: true }),
  closeSeedingModal: () => set({ seedingModalOpen: false }),
  setScanning: (isScanning) => set({ isScanning }),
}));
