// CVMind design tokens for the app, taken from the website (frontend/src/styles/theme.css):
// ink #0d0d0d for actions, CVMind green #2dc08d as the accent, white paper, hairline borders.

export const colors = {
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f6',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',

  ink: '#0d0d0d',
  text: '#374151',
  muted: '#6b7280',
  faint: '#9ca3af',
  onDark: '#ffffff',

  brand: '#0d0d0d', // ink: primary actions, like the site's pill buttons
  brandDark: '#000000',
  brandSoft: '#eaf8f2', // the site's green tint behind selected things
  green: '#2dc08d', // CVMind green: the fill on press, the wordmark dot
  greenInk: '#1b7a5a', // green that reads as text on white
  teal: '#2dc08d',
  tealSoft: '#e5f8f1',
  blue: '#2997ff',
  blueSoft: '#e7f2ff',
  amber: '#f59e0b',
  amberSoft: '#fff4de',
  rose: '#f43f5e',
  roseSoft: '#ffe9ed',

  danger: '#e5484d',
  dangerSoft: '#fdecec',
  overlay: 'rgba(13, 13, 13, 0.45)',
} as const;

export const gradients = {
  brand: ['#1b7a5a', '#2dc08d'] as const,
  hero: ['#0d0d0d', '#1b7a5a', '#2dc08d'] as const,
  sale: ['#0d0d0d', '#1f3d33'] as const,
  soft: ['#f1fbf7', '#f9fafb'] as const,
};

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
  mono: 'SpaceMono_400Regular',
  display: 'InstrumentSans_700Bold',
  displaySemi: 'InstrumentSans_600SemiBold',
  script: 'Caveat_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const shadow = {
  card: {
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink, letterSpacing: -1.1 },
  title: { fontFamily: fonts.display, fontSize: 23, lineHeight: 28, color: colors.ink, letterSpacing: -0.7 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 23, color: colors.ink, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.text },
  tiny: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted },
  // The site's mono section label (.cv-label): small caps-spaced, green
  label: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.greenInk },
  // Extra right padding: Android measures Caveat narrow and would drop the last word
  script: { fontFamily: fonts.script, fontSize: 26, lineHeight: 30, color: colors.ink, paddingRight: 8 },
} as const;

export type TypeVariant = keyof typeof type;
