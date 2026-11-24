# Design Document §3: Architecture

Owner: Ramadhan. Two clients, one API, one database. No client ever talks to the database and no
client trusts another client's answer.

## 3.1 Components

| Component | Technology | Runs on | Address | Owner |
|---|---|---|---|---|
| Web app | React 19, Vite 8, React Router 7 (`HashRouter`) | the browser; static files from GitHub Pages | `localhost:5173` (dev), <https://group-11-campusportal.github.io/Midterm_Project_Campus_Portal/> (live) | David |
| Phone app | Expo SDK 58, Expo Router, React Native 0.88 | iPhone and Android through Expo Go; Metro bundler on the laptop on `:8081` | `EXPO_PUBLIC_API_URL` | Fasya (core), Ramadhan (UX) |
| API | Node 22, Express 5, `jsonwebtoken`, `bcryptjs`, `cors` | Railway service | `http://127.0.0.1:3000` (dev), `https://midtermprojectcampusportal-production.up.railway.app` (deployed) | Bian |
| Database | libSQL through `@libsql/client`; SQLite file in development, Turso in production | laptop file `backend/data/campus.db`; Turso for production | `DB_PATH` / `TURSO_DATABASE_URL` | Bian |
| Web deploy | GitHub Actions on every push to `main`, `dist/` published to `gh-pages` | GitHub | `.github/workflows/deploy.yml` | Fasya |
| API deploy | Railway service (root `backend/`, `npm ci`, `npm start`, health check `/api/health`) | Railway | `backend/README.md` | Bian |

```
   iPhone / Android                 Browser
   Expo Go, React Native            React + Vite (static)
          │                              │
          │ HTTPS + Bearer JWT           │ HTTPS + Bearer JWT
          └──────────────┬───────────────┘
                         ▼
              ┌──────────────────────┐
              │  Express 5 on Railway │  CORS allow-list, JSON only,
              │  /api/*              │  JWT HS256, 1 h, stateless
              └──────────┬───────────┘
                         │ libSQL protocol (TLS)
                         ▼
              ┌──────────────────────┐
              │   Turso (hosted)     │  users, courses,
              │   libSQL / SQLite    │  enrollments, grades
              └──────────────────────┘
```

## 3.2 Ports and variables

| Where | Variable | Value in development | Value in production |
|---|---|---|---|
| Web | `VITE_API_URL` | `http://127.0.0.1:3000` (default if unset) | the Railway URL, **set at build time** in `deploy.yml` |
| Phone | `EXPO_PUBLIC_API_URL` | laptop LAN IP, or `localhost` over USB with `adb reverse` | the Railway URL |
| API | `HOST` / `PORT` | `127.0.0.1` / `3000` | `0.0.0.0` / `$PORT` (Railway) |
| API | `CORS_ORIGIN` | `http://localhost:5173` | comma-separated deployed web origins |
| API | `JWT_SECRET` | random 32+ characters in `backend/.env` | set in Railway Variables |
| API | `DB_PATH` | `./data/campus.db` | unused |
| API | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | **empty** | set in Railway Variables only |

`VITE_*` and `EXPO_PUBLIC_*` are compiled into the bundle, so they are public by definition. Nothing
secret may ever carry either prefix.

## 3.3 Data flow: one full example

Approve a pending enrollment, from the phone as an administrator:

1. **Screen** — `mobile-app/src/app/(tabs)/enrollments.js` renders rows from `GET /api/enrollments`
   and shows Approve/Reject for `status: 'pending'`.
2. **Client** — `api.updateEnrollmentStatus(id, 'approved')` → `apiFetch` in
   `mobile-app/src/lib/api.js` adds `Authorization: Bearer <JWT>` and
   `Content-Type: application/json`.
3. **Transport** — `PATCH /api/enrollments/e2/status` with body `{"status":"approved"}`.
4. **API** — `authenticate` verifies the JWT, loads the user **from the database**, so the role is
   current; `requireRole('administrator')` allows it. The handler opens a transaction, reads the
   enrollment, refuses unless it is still `pending`, loads the course, refuses when
   `enrolled >= capacity`, updates the row, and returns the reloaded record.
5. **Database** — one `UPDATE enrollments SET status = ?` inside the transaction; the seat count is
   never stored, it is counted from approved rows.
6. **Back** — `200` with `{ "data": { ...enrollment, "status": "approved" } }`; the screen refreshes
   the list, the dashboard's "Pending approvals" drops by one on its next pull-to-refresh.

Login is the same path with one difference: `POST /api/auth/login` is public, and the API returns a
signed token that the client stores (`localStorage` on the web, `expo-secure-store` on the phone).
`GET /api/auth/me` is how each client checks at start-up that the stored token is still accepted.

## 3.4 Trust boundaries

| Boundary | Rule |
|---|---|
| Browser / phone → API | Everything from a client is untrusted: body fields are allow-listed (`validation.js`), the user id in a token decides row visibility, roles are re-read from the database per request |
| Web storage vs phone storage | A JWT in `localStorage` is readable by any script on the page, so the web app keeps no third-party script; the phone keeps it in the OS keychain/keystore through `expo-secure-store` |
| API → database | The only process with a database credential. A leaked `TURSO_AUTH_TOKEN` is a full data breach, which is why it exists only in the Railway Variables |
| Railway → internet | TLS terminated by Railway, no custom domain. CORS restricts browsers (not curl) to the listed origins |

## 3.5 Deliberate limitations

- **No refresh token.** The JWT lasts 1 hour; after that both clients clear the token and show the
  login screen. Acceptable for a demo, recorded in §5.
- **Stateless API.** No session store, so a Railway restart logs nobody out and changes no data.
- **No shared code.** The three apps agree through §5, not through an import. A field rename is a
  three-app change.
- **No offline cache.** A phone with no network shows an error with a retry, not stale data.
- **No file storage.** the service disk is not persistent; §4 says where files would go.
