import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FastingProtocol = '16:8' | '18:6' | '20:4' | 'OMAD' | '5:2' | 'custom';
export type FastingPhase = 'Fed State' | 'Early Fasting' | 'Fasting State' | 'Deep Fasting' | 'Metabolic Advantage' | 'Extended Fast';

export interface FastingSession {
  id: string;
  startTime: number; // Unix timestamp
  protocol: FastingProtocol;
  customHours?: number;
  isActive: boolean;
  endTime?: number;
  date: string; // YYYY-MM-DD
}

export interface FastingHistory {
  completedSessions: FastingSession[];
  currentSession: FastingSession | null;
}

interface FastingState {
  history: FastingHistory;
  notificationsEnabled: boolean;
  preferredProtocol: FastingProtocol;

  // Actions
  startFast: (protocol: FastingProtocol, customHours?: number) => void;
  endFast: () => void;
  cancelFast: () => void;
  getCurrentPhase: () => { phase: FastingPhase; hoursElapsed: number };
  getHistoryForDate: (date: string) => FastingSession[];
  toggleNotifications: (enabled: boolean) => void;
  setPreferredProtocol: (protocol: FastingProtocol) => void;
}

const defaultHistory: FastingHistory = {
  completedSessions: [],
  currentSession: null,
};

export const useFastingStore = create<FastingState>()(
  persist(
    (set, get) => ({
      history: defaultHistory,
      notificationsEnabled: true,
      preferredProtocol: '16:8',

      startFast: (protocol, customHours) =>
        set((state) => {
          const now = Date.now();
          const today = new Date().toISOString().split('T')[0];

          return {
            history: {
              ...state.history,
              currentSession: {
                id: `fast-${Date.now()}`,
                startTime: now,
                protocol,
                customHours,
                isActive: true,
                date: today,
              },
            },
          };
        }),

      endFast: () =>
        set((state) => {
          const session = state.history.currentSession;
          if (!session) return state;

          return {
            history: {
              ...state.history,
              completedSessions: [
                ...state.history.completedSessions,
                { ...session, isActive: false, endTime: Date.now() },
              ],
              currentSession: null,
            },
          };
        }),

      cancelFast: () =>
        set((state) => ({
          history: {
            ...state.history,
            currentSession: null,
          },
        })),

      getCurrentPhase: () => {
        const state = get();
        const session = state.history.currentSession;

        if (!session) {
          return { phase: 'Fed State' as FastingPhase, hoursElapsed: 0 };
        }

        const now = Date.now();
        const hoursElapsed = (now - session.startTime) / (1000 * 60 * 60);

        let phase: FastingPhase;
        if (hoursElapsed < 3) phase = 'Fed State';
        else if (hoursElapsed < 12) phase = 'Early Fasting';
        else if (hoursElapsed < 16) phase = 'Fasting State';
        else if (hoursElapsed < 24) phase = 'Deep Fasting';
        else if (hoursElapsed < 48) phase = 'Metabolic Advantage';
        else phase = 'Extended Fast';

        return { phase, hoursElapsed };
      },

      getHistoryForDate: (date) => {
        const state = get();
        return state.history.completedSessions.filter((s) => s.date === date);
      },

      toggleNotifications: (enabled) =>
        set({ notificationsEnabled: enabled }),

      setPreferredProtocol: (protocol) =>
        set({ preferredProtocol: protocol }),
    }),
    {
      name: 'pantryiq-fasting-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
