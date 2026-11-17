// Modern design tokens strictly aligned with web app with elevated mobile aesthetics
export const colors = {
  primary: '#2563eb',       // Web --color-primary (Royal Blue)
  primaryDark: '#1d4ed8',   // Web --color-primary-dark
  primaryDeep: '#082d8c',   // Deep Royal Blue
  primaryMidnight: '#02184d', // Midnight Blue from reference image
  primarySoft: '#eff6ff',   // Very soft blue tint
  primaryMuted: '#dbeafe',  // Light blue border/accent
  primaryText: '#ffffff',
  
  text: '#0f172a',          // Web --color-text (Slate 900)
  textSecondary: '#334155', // Slate 700
  muted: '#64748b',         // Slate 500
  mutedLight: '#94a3b8',    // Slate 400
  
  border: '#d8e2ee',        // Web --color-border
  borderLight: '#e8eef7',   // Very subtle separator
  
  background: '#edf2f9',    // Modern soft ambient mesh base (replaces flat white/gray)
  surface: '#ffffff',       // Pure white card surface
  surfaceTint: '#f6f9fe',   // Soft tinted surface
  surfaceHover: '#f1f5fa',
  
  danger: '#dc2626',        // Web --color-danger
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  
  success: '#16a34a',       // Web --color-success
  successSoft: '#ecfdf3',
  successBorder: '#bbf7d0',
  
  warning: '#d97706',       // Web --color-warning
  warningSoft: '#fff7ed',
  warningBorder: '#fed7aa',
  
  purple: '#7c3aed',
  purpleSoft: '#f5f3ff',
}

export const gradients = {
  hero: ['#02184d', '#082d8c', '#1d4ed8'],
  heroAdmin: ['#030d22', '#0c1c38', '#1e293b'],
  gpa: ['#02184d', '#0b329e'],
  card: ['#ffffff', '#f5f9fe'],
  cardSubtle: ['#ffffff', '#fafcff'],
  blueSubtle: ['#eff6ff', '#ffffff'],
  cardHover: ['#ffffff', '#f0f5fc'],
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
}

export const radius = 16

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
}

export const shadow = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  glow: {
    shadowColor: '#082d8c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
}

export const minTap = 48

export const font = {
  xs: 11,
  small: 13,
  body: 15,
  title: 18,
  heading: 22,
  display: 28,
}
