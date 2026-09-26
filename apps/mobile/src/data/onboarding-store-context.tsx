import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { OnboardingState, OnboardingStore } from '@/domain/onboarding';

const OnboardingStoreContext = createContext<OnboardingStore | null>(null);

export function OnboardingStoreProvider({
  children,
  store,
}: PropsWithChildren<{ store: OnboardingStore }>) {
  return (
    <OnboardingStoreContext.Provider value={store}>
      {children}
    </OnboardingStoreContext.Provider>
  );
}

export function useOnboarding() {
  const store = useContext(OnboardingStoreContext);
  const [state, setState] = useState<OnboardingState | null>(null);

  if (!store) {
    throw new Error('OnboardingStore nije dostupan u trenutnom stablu.');
  }

  useEffect(() => {
    let active = true;
    const load = () =>
      store.getState().then((next) => active && setState(next));
    void load();
    const unsubscribe = store.subscribe?.(() => void load());
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [store]);

  return { complete: () => store.complete(), state };
}
