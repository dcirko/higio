import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

type PreferencesContextValue = {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
};

const PreferencesContext = createContext<PreferencesContextValue>({
  hapticsEnabled: true,
  setHapticsEnabled: () => undefined,
});

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const value = useMemo(
    () => ({ hapticsEnabled, setHapticsEnabled }),
    [hapticsEnabled],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
