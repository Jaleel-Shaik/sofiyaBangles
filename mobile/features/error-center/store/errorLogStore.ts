import { create } from "zustand";

export interface LoggedError {
  id: string;
  ts: number;
  type: string;
  statusCode?: number;
  title: string;
  message: string;
  technical?: string;
  url?: string;
  retriable: boolean;
  systemic: boolean;
}

interface ErrorLogState {
  errors: LoggedError[];
  addError: (entry: Omit<LoggedError, "id" | "ts">) => void;
  clearErrors: () => void;
}

const MAX_ENTRIES = 200;

export const useErrorLogStore = create<ErrorLogState>((set, get) => ({
  errors: [],

  addError: (entry) => {
    const record: LoggedError = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
    };
    set({ errors: [record, ...get().errors].slice(0, MAX_ENTRIES) });
  },

  clearErrors: () => set({ errors: [] }),
}));
