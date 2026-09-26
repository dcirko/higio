import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { TabGlyph } from '@/design-system/components';
import { fontSize } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

export default function TabLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryStrong,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
          Platform.select({
            default: {
              elevation: 10,
              shadowColor: theme.colors.shadow,
              shadowOffset: { height: -3, width: 0 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
            },
            web: {
              boxShadow: `0 -3px 12px ${theme.colors.shadow}`,
            },
          }),
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Danas',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} glyph="✓" />
          ),
          title: 'Danas',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarAccessibilityLabel: 'Povijest',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} glyph="↺" />
          ),
          title: 'Povijest',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          tabBarAccessibilityLabel: 'Statistika',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} glyph="▥" />
          ),
          title: 'Statistika',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: 'Više',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} glyph="•••" />
          ),
          title: 'Više',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 68,
    paddingBottom: 7,
    paddingTop: 6,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
});
