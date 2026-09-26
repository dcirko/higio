import { render } from '@testing-library/react-native';
import { AppButton } from '@/design-system/components/controls';
import { Snackbar } from '@/design-system/components/snackbar';
import { useAppTheme } from '@/design-system/theme';
import { lightTheme, darkTheme } from '@/design-system/tokens';

jest.mock('@/design-system/theme', () => ({ useAppTheme: jest.fn() }));

function luminance(hex: string) {
  const values = hex
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}

describe.each([lightTheme, darkTheme])(
  'text contrast (dark=$isDark)',
  (theme) => {
    it('keeps text at least 4.5:1 against its background', () => {
      const c = theme.colors;
      const pairs: [string, string][] = [
        [c.onPrimary, c.primary],
        [c.snackbarText, c.snackbarBackground],
        [c.snackbarAction, c.snackbarBackground],
        [c.warningText, c.warningSurface],
        [c.dangerText, c.dangerSurface],
        [c.infoText, c.infoSurface],
      ];
      for (const background of [c.background, c.surface, c.surfaceMuted]) {
        for (const text of [c.text, c.textMuted, c.textSubtle])
          pairs.push([text, background]);
      }
      for (const [text, background] of pairs) {
        const a = luminance(text!);
        const b = luminance(background!);
        expect(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('applies the contrasting colors to buttons and snackbar text', async () => {
      jest.mocked(useAppTheme).mockReturnValue(theme);
      const screen = await render(
        <>
          <AppButton label="Spremi" />
          <Snackbar
            visible
            message="Spremljeno"
            actionLabel="Poništi"
            onAction={() => {}}
          />
        </>,
      );
      expect(screen.getByText('Spremi')).toHaveStyle({
        color: theme.colors.onPrimary,
      });
      expect(screen.getByText('Spremljeno')).toHaveStyle({
        color: theme.colors.snackbarText,
      });
      expect(screen.getByText('Poništi')).toHaveStyle({
        color: theme.colors.snackbarAction,
      });
    });
  },
);
