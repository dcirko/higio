import { createContext, type PropsWithChildren, useContext } from 'react';

import type { TodayStore } from '@/domain/today-store';

const TodayStoreContext = createContext<TodayStore | null>(null);

type TodayStoreProviderProps = PropsWithChildren<{
  store: TodayStore;
}>;

export function TodayStoreProvider({
  children,
  store,
}: TodayStoreProviderProps) {
  return (
    <TodayStoreContext.Provider value={store}>
      {children}
    </TodayStoreContext.Provider>
  );
}

export function useTodayStoreContext() {
  return useContext(TodayStoreContext);
}
