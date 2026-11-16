// The API address is read once, at bundle time, from EXPO_PUBLIC_API_URL in mobile-app/.env.
// After changing .env press r in the Expo terminal; if the old address is still used,
// stop and run `npx expo start -c` to clear the bundler cache.
const raw = process.env.EXPO_PUBLIC_API_URL

export const API_URL = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : ''

export function apiUrlProblem() {
  if (!API_URL) return 'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and fill it in.'
  if (!/^https?:\/\//.test(API_URL)) return 'EXPO_PUBLIC_API_URL must start with http:// or https://.'
  return null
}

// localhost only reaches the laptop through a USB `adb reverse tcp:3000 tcp:3000` (Android).
export const usesLocalhost = /localhost|127\.0\.0\.1/.test(API_URL)
