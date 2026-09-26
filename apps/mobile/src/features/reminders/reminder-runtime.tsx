import { router, type Href } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { useReminderStore } from '@/data/reminder-store-context';
import { useTodayStoreContext } from '@/data/today-store-context';
import {
  DEFAULT_REMINDER_PREFERENCES,
  parseReminderPreferences,
  type ReminderPreferences,
} from '@/domain/reminders';
import { ReminderCoordinator } from '@/features/reminders/reminder-coordinator';
import type { NotificationPermissionState } from '@/shared/notifications/notification-types';
import { notificationGateway } from '../../shared/notifications/notification-gateway';

type ReminderRuntimeValue = {
  errorMessage: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  openSystemSettings: () => Promise<void>;
  permission: NotificationPermissionState;
  preferences: ReminderPreferences;
  refresh: () => Promise<void>;
  savePreferences: (preferences: ReminderPreferences) => Promise<void>;
  scheduledCount: number;
  setRemindersEnabled: (enabled: boolean) => Promise<boolean>;
};

const ReminderRuntimeContext = createContext<ReminderRuntimeValue | null>(null);

function errorToMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Podsjetnici se trenutačno nisu mogli osvježiti.';
}

export function ReminderRuntimeProvider({ children }: PropsWithChildren) {
  const reminderStore = useReminderStore();
  const todayStore = useTodayStoreContext();
  const coordinator = useMemo(
    () =>
      todayStore
        ? new ReminderCoordinator(
            reminderStore,
            todayStore,
            notificationGateway,
          )
        : null,
    [reminderStore, todayStore],
  );
  const [preferences, setPreferences] = useState(DEFAULT_REMINDER_PREFERENCES);
  const [permission, setPermission] =
    useState<NotificationPermissionState>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queuedReconcile = useRef<Promise<void>>(Promise.resolve());

  const refresh = useCallback(async () => {
    if (!coordinator) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);

    queuedReconcile.current = queuedReconcile.current
      .catch(() => undefined)
      .then(async () => {
        const nextPermission = await notificationGateway.getPermissionState();
        const result = await coordinator.reconcile();
        setPermission(nextPermission);
        setScheduledCount(result.scheduledCount);
      })
      .catch((error) => {
        setErrorMessage(errorToMessage(error));
      })
      .finally(() => {
        setIsSyncing(false);
      });

    await queuedReconcile.current;
  }, [coordinator]);

  useEffect(() => {
    let isActive = true;

    void Promise.all([
      reminderStore.loadPreferences(),
      notificationGateway.getPermissionState(),
    ])
      .then(([storedPreferences, storedPermission]) => {
        if (!isActive) {
          return;
        }

        setPreferences(storedPreferences);
        setPermission(storedPermission);
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(errorToMessage(error));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
          void refresh();
        }
      });

    return () => {
      isActive = false;
    };
  }, [refresh, reminderStore]);

  useEffect(() => {
    if (!todayStore?.subscribe) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = todayStore.subscribe(() => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => void refresh(), 300);
    });

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      unsubscribe();
    };
  }, [refresh, todayStore]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const redirect = (url: string) => {
      if (url === '/') {
        router.push(url as Href);
      }
    };
    const initialUrl = notificationGateway.consumeInitialUrl();

    if (initialUrl) {
      redirect(initialUrl);
    }

    return notificationGateway.subscribeToResponses(redirect);
  }, []);

  const savePreferences = useCallback(
    async (nextPreferences: ReminderPreferences) => {
      const normalized = parseReminderPreferences(nextPreferences);
      await reminderStore.savePreferences(normalized);
      setPreferences(normalized);
      await refresh();
    },
    [refresh, reminderStore],
  );

  const setRemindersEnabled = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        await savePreferences({ ...preferences, enabled: false });
        return true;
      }

      setErrorMessage(null);

      try {
        await notificationGateway.ensureChannel();
        let nextPermission = await notificationGateway.getPermissionState();

        if (nextPermission !== 'granted') {
          nextPermission = await notificationGateway.requestPermission();
        }

        setPermission(nextPermission);

        if (nextPermission !== 'granted') {
          return false;
        }

        await savePreferences({ ...preferences, enabled: true });
        return true;
      } catch (error) {
        setErrorMessage(errorToMessage(error));
        return false;
      }
    },
    [preferences, savePreferences],
  );

  const value = useMemo<ReminderRuntimeValue>(
    () => ({
      errorMessage,
      isLoading,
      isSyncing,
      openSystemSettings: () => notificationGateway.openSystemSettings(),
      permission,
      preferences,
      refresh,
      savePreferences,
      scheduledCount,
      setRemindersEnabled,
    }),
    [
      errorMessage,
      isLoading,
      isSyncing,
      permission,
      preferences,
      refresh,
      savePreferences,
      scheduledCount,
      setRemindersEnabled,
    ],
  );

  return (
    <ReminderRuntimeContext.Provider value={value}>
      {children}
    </ReminderRuntimeContext.Provider>
  );
}

export function useReminderRuntime() {
  const value = useContext(ReminderRuntimeContext);

  if (!value) {
    throw new Error('ReminderRuntime nije dostupan izvan root layouta.');
  }

  return value;
}
