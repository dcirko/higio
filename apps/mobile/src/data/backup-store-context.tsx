import { createContext, type PropsWithChildren, useContext } from 'react';

import type { BackupStore } from '@/domain/backup';

const BackupStoreContext = createContext<BackupStore | null>(null);

export function BackupStoreProvider({
  children,
  store,
}: PropsWithChildren<{ store: BackupStore }>) {
  return (
    <BackupStoreContext.Provider value={store}>
      {children}
    </BackupStoreContext.Provider>
  );
}

export function useBackupStore() {
  const store = useContext(BackupStoreContext);

  if (!store) {
    throw new Error('BackupStore nije dostupan izvan DatabaseBoundaryja.');
  }

  return store;
}
