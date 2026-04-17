import { create } from 'zustand';

interface ConfigState {
  readOnly: boolean;
  loaded: boolean;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  readOnly: false,
  loaded: false,
  fetchConfig: async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      set({ readOnly: data.readOnly ?? false, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
