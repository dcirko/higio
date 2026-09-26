import { type ColorValue, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/app-text';

type TabGlyphProps = {
  color: ColorValue;
  glyph: string;
  focused: boolean;
};

export function TabGlyph({ color, focused, glyph }: TabGlyphProps) {
  return (
    <View style={styles.root}>
      <AppText
        style={[styles.glyph, { color }]}
        variant="bodyLarge"
        weight="bold"
      >
        {glyph}
      </AppText>
      <View
        style={[
          styles.indicator,
          { backgroundColor: focused ? color : 'transparent' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 38,
  },
  glyph: {
    lineHeight: 22,
  },
  indicator: {
    borderRadius: 3,
    bottom: -3,
    height: 3,
    position: 'absolute',
    width: 18,
  },
});
