export const palette = {
  mint50: '#F2FBF7',
  mint100: '#DDF5EA',
  mint200: '#BDE9D5',
  mint500: '#2B9B72',
  mint600: '#217D5C',
  mint700: '#176247',
  ink900: '#14211D',
  ink700: '#42534D',
  ink500: '#596C63',
  white: '#FFFFFF',
  stone100: '#EDF2F0',
  stone200: '#D8E1DE',
  dark950: '#0D1512',
  dark900: '#131E1A',
  dark800: '#1B2924',
  dark700: '#293B35',
  darkText: '#F4FAF7',
  darkMuted: '#A8B8B2',
  amber100: '#FFF1D3',
  amber600: '#875510',
  rose100: '#FFE4E5',
  rose600: '#A53D45',
  blue100: '#DFEEFF',
  blue600: '#386B9E',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  label: 14,
  body: 16,
  bodyLarge: 18,
  heading: 22,
  title: 30,
  display: 38,
} as const;

export const lineHeight = {
  caption: 16,
  label: 20,
  body: 24,
  bodyLarge: 27,
  heading: 29,
  title: 37,
  display: 44,
} as const;

export const touchTarget = 48;

export const lightTheme = {
  isDark: false,
  colors: {
    background: palette.mint50,
    surface: palette.white,
    surfaceMuted: '#EAF4F0',
    surfaceElevated: palette.white,
    primary: palette.mint600,
    onPrimary: palette.white,
    snackbarBackground: palette.ink900,
    snackbarText: palette.darkText,
    snackbarAction: '#9AE4C5',
    primaryStrong: palette.mint700,
    primarySoft: palette.mint100,
    text: palette.ink900,
    textMuted: palette.ink700,
    textSubtle: palette.ink500,
    border: palette.stone200,
    divider: palette.stone100,
    success: palette.mint600,
    warningSurface: palette.amber100,
    warningText: palette.amber600,
    dangerSurface: palette.rose100,
    dangerText: palette.rose600,
    infoSurface: palette.blue100,
    infoText: palette.blue600,
    overlay: 'rgba(13, 21, 18, 0.42)',
    shadow: 'rgba(20, 33, 29, 0.12)',
    tabInactive: palette.ink500,
  },
} as const;

export const darkTheme = {
  isDark: true,
  colors: {
    background: palette.dark950,
    surface: palette.dark900,
    surfaceMuted: palette.dark800,
    surfaceElevated: palette.dark800,
    primary: '#69D2A7',
    onPrimary: palette.ink900,
    snackbarBackground: '#EDF6F2',
    snackbarText: palette.ink900,
    snackbarAction: palette.mint700,
    primaryStrong: '#9AE4C5',
    primarySoft: palette.dark700,
    text: palette.darkText,
    textMuted: palette.darkMuted,
    textSubtle: '#7F918A',
    border: palette.dark700,
    divider: '#22312C',
    success: '#69D2A7',
    warningSurface: '#3B2E17',
    warningText: '#F0C673',
    dangerSurface: '#3B2225',
    dangerText: '#F1A0A6',
    infoSurface: '#1E3043',
    infoText: '#9BC5F0',
    overlay: 'rgba(0, 0, 0, 0.62)',
    shadow: 'rgba(0, 0, 0, 0.34)',
    tabInactive: '#82938D',
  },
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
