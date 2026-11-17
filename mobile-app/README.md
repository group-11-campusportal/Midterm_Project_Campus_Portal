# Campus Portal Mobile (Expo)

Student and admin app for Campus Portal. JavaScript, Expo SDK 58, Expo Router. It reads the same backend as the web app.

## Run it

```bash
cd mobile-app
npm install
cp .env.example .env        # Windows: copy .env.example .env
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iPhone). Phone and laptop must be on the same Wi-Fi when you use a local backend.

### Which API address goes in `.env`

| Backend | `EXPO_PUBLIC_API_URL` |
|---|---|
| Local, on your laptop | `http://<your laptop LAN IP>:3000` (Windows: `ipconfig` → IPv4). Start the backend with `HOST=0.0.0.0` in `backend/.env`, otherwise it only listens on the laptop itself |
| Deployed | The Render URL, for example `https://campus-portal-api.onrender.com` |

`localhost` on a phone means the phone itself, so it only works over USB (Android) after `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081`, started with `npx expo start -c --localhost`. Use this when the Wi-Fi blocks device-to-device traffic (campus/public Wi-Fi). After changing `.env` press `r`; if the old address is still used, run `npx expo start -c`.

Seed accounts (from `backend/src/seed-data.js`): `andi` / `student123`, `bella` / `student123`, `admin` / `admin123`.

## Structure

```
src/
  app/                  every file is a screen (Expo Router)
    _layout.js          AuthProvider + route guard (logged out → login, logged in → tabs)
    login.js
    (tabs)/             Courses, My enrollments, My grades, Profile (log out)
  context/AuthContext.js  useAuth(): status, user, gpa, signIn, signOut, clearSession
  lib/
    config.js           reads and validates EXPO_PUBLIC_API_URL
    api.js              apiFetch: Bearer header, timeout, error shape, 401 → clearSession
    session.js          JWT in expo-secure-store (never AsyncStorage)
    useApiList.js       load + pull-to-refresh for list screens
  components/           PrimaryButton (busy = disabled), StateView, ListRow
  theme.js              colors, spacing, radius, minTap (owner: Ramadhan)
```

## Rules

- All requests go through `src/lib/api.js`. No `fetch` in screens.
- Field names follow the §5 API contract; the server decides which rows a user sees from the token, never from an id the app sends.
- Screens use `theme.js` names, not raw colors or numbers.
- Never commit `.env`.
