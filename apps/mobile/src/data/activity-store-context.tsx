import { createContext, type PropsWithChildren, useContext } from 'react';

import type { ActivityStore } from '@/domain/activities';

const ActivityStoreContext = createContext<ActivityStore | null>(null);

type ActivityStoreProviderProps = PropsWithChildren<{
  store: ActivityStore;
}>;

export function ActivityStoreProvider({
  children,
  store,
}: ActivityStoreProviderProps) {
  return (
    <ActivityStoreContext.Provider value={store}>
      {children}
    </ActivityStoreContext.Provider>
  );
}

export function useActivityStore() {
  const store = useContext(ActivityStoreContext);

  if (!store) {
    throw new Error('ActivityStore nije dostupan u trenutnom stablu.');
  }

  return store;
}

export function useOptionalActivityStore() {
  return useContext(ActivityStoreContext);
}
