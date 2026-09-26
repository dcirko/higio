import { createContext, type PropsWithChildren, useContext } from 'react';

import type { ReminderStore } from '@/domain/reminders';

const ReminderStoreContext = createContext<ReminderStore | null>(null);

export function ReminderStoreProvider({
  children,
  store,
}: PropsWithChildren<{ store: ReminderStore }>) {
  return (
    <ReminderStoreContext.Provider value={store}>
      {children}
    </ReminderStoreContext.Provider>
  );
}

export function useReminderStore() {
  const store = useContext(ReminderStoreContext);

  if (!store) {
    throw new Error('ReminderStore nije dostupan izvan DatabaseBoundaryja.');
  }

  return store;
}
