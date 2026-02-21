export const Colors = {
  // Primary palette
  navy: '#0A1628',
  navyCard: '#0F2040',
  surface: '#162645',
  surfaceLight: '#1E3258',

  // Accent
  green: '#2ECC71',
  greenDark: '#27AE60',
  greenMuted: 'rgba(46,204,113,0.15)',

  // Warning / amber
  amber: '#F39C12',
  amberMuted: 'rgba(243,156,18,0.15)',

  // Error
  error: '#E74C3C',
  errorMuted: 'rgba(231,76,60,0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.35)',
  textDisabled: 'rgba(255,255,255,0.2)',

  // Border / dividers
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.06)',

  // Background
  bgDark: '#0A1628',
  bgCard: '#0F2040',

  // Transparent overlays
  overlay10: 'rgba(255,255,255,0.10)',
  overlay05: 'rgba(255,255,255,0.05)',
  navyOverlay: 'rgba(10,22,40,0.85)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Typography = {
  // Display (Playfair Display)
  display: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    lineHeight: 42,
    color: Colors.textPrimary,
  },
  displayMd: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimary,
  },
  displaySm: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textPrimary,
  },

  // Body (DM Sans)
  bodyLg: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodySm: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  bodyXs: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textTertiary,
  },

  // Labels
  labelLg: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  labelSm: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },

  // Bold
  bold: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  boldSm: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;
