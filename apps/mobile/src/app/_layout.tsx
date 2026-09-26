import { router, Stack, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DatabaseBoundary } from '@/data/database-boundary';
import { AppThemeProvider, useAppTheme } from '@/design-system/theme';
import { ReminderRuntimeProvider } from '@/features/reminders/reminder-runtime';
import { PreferencesProvider } from '@/shared/preferences';
import { PrivacySafeErrorBoundary } from '@/shared/observability/privacy-safe-error-boundary';
import { AppSecurityProvider } from '@/shared/security/app-security';
import { useOnboarding } from '@/data/onboarding-store-context';

function RootNavigator() {
  const theme = useAppTheme();
  const { state } = useOnboarding();
  const segments = useSegments();
  const isOnboardingRoute = String(segments[0]) === 'onboarding';

  useEffect(() => {
    if (!state) return;
    if (!state.isCompleted && !isOnboardingRoute)
      router.replace('/onboarding' as Href);
    if (state.isCompleted && isOnboardingRoute) router.replace('/' as Href);
  }, [isOnboardingRoute, state]);

  if (!state) return null;

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="activities" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="dog" />
        <Stack.Screen name="routines" />
        <Stack.Screen name="templates" />
        <Stack.Screen name="data-privacy" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <PrivacySafeErrorBoundary>
          <PreferencesProvider>
            <AppSecurityProvider>
              <DatabaseBoundary>
                <ReminderRuntimeProvider>
                  <RootNavigator />
                </ReminderRuntimeProvider>
              </DatabaseBoundary>
            </AppSecurityProvider>
          </PreferencesProvider>
        </PrivacySafeErrorBoundary>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
