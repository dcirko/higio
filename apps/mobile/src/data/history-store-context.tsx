import { createContext, type PropsWithChildren, useContext } from 'react';

import type { HistoryStore } from '@/domain/history-store';

const HistoryStoreContext = createContext<HistoryStore | null>(null);

export function HistoryStoreProvider({
  children,
  store,
}: PropsWithChildren<{ store: HistoryStore }>) {
  return (
    <HistoryStoreContext.Provider value={store}>
      {children}
    </HistoryStoreContext.Provider>
  );
}

export function useHistoryStore() {
  const store = useContext(HistoryStoreContext);

  if (!store) {
    throw new Error('HistoryStore nije dostupan unutar trenutnog ekrana.');
  }

  return store;
}

export function useOptionalHistoryStore() {
  return useContext(HistoryStoreContext);
}
