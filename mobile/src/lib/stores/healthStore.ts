import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
  unit: 'lbs' | 'kg';
  note?: string;
}

export interface MeasurementEntry {
  id: string;
  date: string;
  neck?: number;
  waist?: number;
  hips?: number;
  chest?: number;
  unit: 'in' | 'cm';
}

export interface HealthGoal {
  targetWeight: number;
  targetBodyFat?: number;
  targetDate?: string;
  startWeight: number;
  startDate: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  uri: string;
  note?: string;
}

interface HealthState {
  weightEntries: WeightEntry[];
  measurementEntries: MeasurementEntry[];
  progressPhotos: ProgressPhoto[];
  goal: HealthGoal | null;

  // Actions
  addWeightEntry: (entry: Omit<WeightEntry, 'id'>) => void;
  deleteWeightEntry: (id: string) => void;
  addMeasurementEntry: (entry: Omit<MeasurementEntry, 'id'>) => void;
  addProgressPhoto: (photo: Omit<ProgressPhoto, 'id'>) => void;
  deleteProgressPhoto: (id: string) => void;
  setGoal: (goal: HealthGoal) => void;

  // Computed helpers
  getLatestWeight: () => WeightEntry | null;
  getLatestMeasurements: () => MeasurementEntry | null;
  getWeightTrend: (days: number) => WeightEntry[];
  calculateBMI: (heightInches: number) => number | null;
  calculateBodyFat: (
    gender: 'male' | 'female',
    waist: number,
    neck: number,
    hips: number | undefined,
    height: number
  ) => number | null;
}

const generateId = () => `health-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Generate 14 days of realistic weight data showing slight downward trend
// Starting at 195 lbs, ending ~192.4 lbs with small daily fluctuations
const generateSeedWeightEntries = (): WeightEntry[] => {
  const entries: WeightEntry[] = [];
  const startWeight = 195;
  const dailyChange = -0.2; // avg daily loss
  const fluctuations = [0.3, -0.4, 0.2, -0.1, 0.5, -0.3, 0.1, -0.2, 0.4, -0.5, 0.2, -0.3, 0.1, -0.2];

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    const dateStr = d.toISOString().split('T')[0];
    const trend = startWeight + dailyChange * i;
    const fluctuation = fluctuations[i] ?? 0;
    const weight = Math.round((trend + fluctuation) * 10) / 10;

    entries.push({
      id: `seed-weight-${i}`,
      date: dateStr,
      weight,
      unit: 'lbs',
    });
  }

  return entries;
};

const seedWeightEntries = generateSeedWeightEntries();

const seedMeasurementEntry: MeasurementEntry = {
  id: 'seed-measure-1',
  date: new Date().toISOString().split('T')[0],
  neck: 15.5,
  waist: 34.0,
  hips: 38.5,
  chest: 40.0,
  unit: 'in',
};

const seedGoal: HealthGoal = {
  startWeight: 195,
  startDate: seedWeightEntries[0]?.date ?? new Date().toISOString().split('T')[0],
  targetWeight: 180,
  targetBodyFat: 18,
};

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      weightEntries: seedWeightEntries,
      measurementEntries: [seedMeasurementEntry],
      progressPhotos: [],
      goal: seedGoal,

      addWeightEntry: (entry) =>
        set((state) => ({
          weightEntries: [
            ...state.weightEntries,
            { ...entry, id: generateId() },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      deleteWeightEntry: (id) =>
        set((state) => ({
          weightEntries: state.weightEntries.filter((e) => e.id !== id),
        })),

      addMeasurementEntry: (entry) =>
        set((state) => ({
          measurementEntries: [
            ...state.measurementEntries,
            { ...entry, id: generateId() },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      addProgressPhoto: (photo) =>
        set((state) => ({
          progressPhotos: [
            ...state.progressPhotos,
            { ...photo, id: generateId() },
          ],
        })),

      deleteProgressPhoto: (id) =>
        set((state) => ({
          progressPhotos: state.progressPhotos.filter((p) => p.id !== id),
        })),

      setGoal: (goal) => set({ goal }),

      getLatestWeight: () => {
        const { weightEntries } = get();
        if (weightEntries.length === 0) return null;
        return weightEntries[weightEntries.length - 1] ?? null;
      },

      getLatestMeasurements: () => {
        const { measurementEntries } = get();
        if (measurementEntries.length === 0) return null;
        return measurementEntries[measurementEntries.length - 1] ?? null;
      },

      getWeightTrend: (days: number) => {
        const { weightEntries } = get();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        return weightEntries.filter((e) => e.date >= cutoffStr);
      },

      calculateBMI: (heightInches: number) => {
        const { weightEntries } = get();
        if (weightEntries.length === 0 || heightInches <= 0) return null;
        const latest = weightEntries[weightEntries.length - 1];
        if (!latest) return null;
        const weightLbs = latest.unit === 'kg' ? latest.weight * 2.20462 : latest.weight;
        return Math.round((weightLbs * 703) / (heightInches * heightInches) * 10) / 10;
      },

      calculateBodyFat: (
        gender: 'male' | 'female',
        waist: number,
        neck: number,
        hips: number | undefined,
        height: number
      ) => {
        if (gender === 'male') {
          const denom = waist - neck;
          if (denom <= 0) return null;
          return Math.round((495 / (1.0324 - 0.19077 * Math.log10(denom) + 0.15456 * Math.log10(height)) - 450) * 10) / 10;
        } else {
          if (!hips) return null;
          const denom = waist + hips - neck;
          if (denom <= 0) return null;
          return Math.round((495 / (1.29579 - 0.35004 * Math.log10(denom) + 0.22100 * Math.log10(height)) - 450) * 10) / 10;
        }
      },
    }),
    {
      name: 'pantryiq-health-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
