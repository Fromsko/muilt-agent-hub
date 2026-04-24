import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StateCreator } from 'zustand';
import type { PersistOptions } from 'zustand/middleware';

interface PersistConfig<T extends object> {
  name: string;
  version?: number;
  partialize?: (state: T) => Partial<T>;
  merge?: (persistedState: unknown, currentState: T) => T;
}

export function createPersistentStore<T extends object>(
  initializer: StateCreator<T, [], []>,
  config: PersistConfig<T>,
) {
  const persistConfig: PersistOptions<T, Partial<T>> = {
    name: config.name,
    ...(config.version !== undefined ? { version: config.version } : {}),
    ...(config.partialize !== undefined ? { partialize: config.partialize } : {}),
    ...(config.merge !== undefined ? { merge: config.merge } : {}),
  };

  return create<T>()(persist(initializer, persistConfig));
}
