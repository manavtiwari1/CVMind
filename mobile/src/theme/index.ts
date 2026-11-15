// CVMind design tokens for the app. The colours follow the website (frontend/src/styles/theme.css):
// CVMind green, blue and the violet → teal gradient of the sign-in button.

export const colors = {
  bg: '#f6f7fb',
  surface: '#ffffff',
  surfaceAlt: '#f2f4f8',
  border: '#e6e8ef',
  borderStrong: '#d5d9e3',

  ink: '#0d0d12',
  text: '#2b2f3a',
  muted: '#6b7280',
  faint: '#9aa1ad',
  onDark: '#ffffff',

  brand: '#6d4ae6', // violet: primary actions
  brandDark: '#5a38d6',
  brandSoft: '#efeafe',
  teal: '#2dc08d', // CVMind green: success, links
  tealSoft: '#e5f8f1',
  blue: '#2997ff',
  blueSoft: '#e7f2ff',
  amber: '#f59e0b',
  amberSoft: '#fff4de',
  rose: '#f43f5e',
  roseSoft: '#ffe9ed',

  danger: '#e5484d',
  dangerSoft: '#fdecec',
  overlay: 'rgba(13, 13, 18, 0.45)',
} as const;

// The sign-in button gradient on the website
export const gradients = {
  brand: ['#7c3aed', '#4f8fc0'] as const,
  hero: ['#6d4ae6', '#4f8fc0', '#2dc08d'] as const,
  sale: ['#111827', '#3b1d6e'] as const,
  soft: ['#f3efff', '#eaf7f3'] as const,
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
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
  hero: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.ink, letterSpacing: -0.4 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 23, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.text },
  tiny: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted },
  // Extra right padding: Android measures Caveat narrow and would drop the last word
  script: { fontFamily: fonts.script, fontSize: 24, lineHeight: 30, color: colors.brand, paddingRight: 8 },
} as const;

export type TypeVariant = keyof typeof type;
