# Campus Portal — Grades & Enrollment

University campus portal for Web & Mobile Application Development (Team 11). One Express API, one
React web app, one Expo phone app and one database. A student checks their enrollments and grades and
requests a seat in a course; an administrator approves requests, records grades and manages courses.

## Live system

| Part | URL |
|---|---|
| Web app | <https://group-11-campusportal.github.io/Midterm_Project_Campus_Portal/> |
| API | `https://campus-portal-api.onrender.com` — **not deployed yet** (task A4); check `/api/health` |
| Phone app | not hosted; runs in Expo Go from [`mobile-app/`](mobile-app/README.md) |
| Database | Turso in production, a local SQLite file in development |

The API's free Render instance sleeps after ~15 minutes; the first request afterwards can take
30–60 seconds.

Design Document: [`docs/design/README.md`](docs/design/README.md) ·
Status: [`PROGRESS.md`](PROGRESS.md) · Agent rules: [`AGENTS.md`](AGENTS.md) ·
Week 13 plan: [`docs/WEEK13_TEAM_WORKFLOW.md`](docs/WEEK13_TEAM_WORKFLOW.md)

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Client (Student) | `andi` | `student123` |
| Client (Student) | `bella` | `student123` |

## Run it

The API first, then the web app and/or the phone.

```bash
# API — http://127.0.0.1:3000/api/health
cd backend
cp .env.example .env        # set JWT_SECRET; the command is in the file
npm install
npm run db:seed             # only seeds an empty database
npm run dev

# Web — http://localhost:5173
npm install
cp .env.example .env        # VITE_API_URL=http://127.0.0.1:3000
npm run dev

# Phone — Expo Go, scan the QR code
cd mobile-app
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL, see mobile-app/README.md
npx expo start
```

Other web scripts: `npm run build`, `npm run preview`, `npm run lint`. API tests: `npm test` inside
`backend/`.

## How it fits together

- **Login** posts to `/api/auth/login` and stores the JWT (`localStorage` on the web,
  `expo-secure-store` on the phone). Every later request sends `Authorization: Bearer <token>`.
- **Authorization** is decided on the server from the token and the role in the database. A student
  only ever receives their own enrollments and grades; an administrator receives everyone's.
- **Calculated, never stored**: letter grade and grade points come from the raw score, GPA is
  credit-weighted, and a course's taken seats are the count of approved enrollments.
- The contract both clients follow is [`docs/design/05-api-contract.md`](docs/design/05-api-contract.md).

## Routes

| Web route | Page | Notes |
|---|---|---|
| `/login` | Login | public |
| `/dashboard` | Dashboard | role-based, login required |
| `/form` | Record Grade (admin) / Enroll in Course (student) | login required |
| `/output` | Grade Records (admin) / My Submissions (student) | login required |
| anything else | 404 | |

The web app uses `HashRouter` and `vite.config.js` sets `base: './'`, so any route can be refreshed
or opened directly on GitHub Pages. The phone app uses Expo Router: a guarded stack sends a signed-out
user to login, and four tabs (Dashboard, Enrollments, Grades, Profile).

## Project structure

```
backend/            Express 5 API, schema, seed, tests
  src/              app.js routes, store.js queries, auth.js, validation.js, schema.sql
  test/api.test.js
src/                web app (React 19 + Vite)
  pages/            Login, Dashboard, FormPage, FormOutput, NotFound
  components/       Navbar, Sidebar, StatCard, DataTable, StatusBadge, EmptyState, Spinner, ProtectedRoute
  lib/api.js        the only fetch wrapper
  layouts/          MainLayout
mobile-app/         Expo app (Expo Router)
  src/app/          screens: login, (tabs) dashboard/enrollments/grades/profile
  src/lib/          api.js, config.js, session.js, useApiList.js
  src/components/   PrimaryButton, ListRow, StatCard, StateView
  src/theme.js      colours, spacing, radii, minimum tap target
docs/design/        Design Document, one file per section
docs/wireframes/    SVG wireframes
```

## Deploy

- **API** — Render blueprint in [`render.yaml`](render.yaml): root `backend/`, `npm ci`, `npm start`,
  health check `/api/health`, secrets typed into the dashboard. Production is seeded once from the
  command line; see [`backend/README.md`](backend/README.md).
- **Web** — `.github/workflows/deploy.yml` builds `main` and publishes `dist/` to `gh-pages`. Set
  `VITE_API_URL` for that build, otherwise the app falls back to `localhost`.
- **CORS** — the API only accepts origins listed in `CORS_ORIGIN`. A new web URL must be added there.

## Team

| Member | GitHub | Owns |
|---|---|---|
| Bian Krisna | `BianKrisna` | Backend, database, wireframes |
| David Benz Susanto | `DavidBenzSusanto` | Web app, AI feature |
| Mochamad Fasya Fadillah | `mfasyafdl` | Mobile core, web ↔ mobile, git |
| Ramadhan Islamay Dermawan | `ladzey` | Mobile UX, Design Document, tests |

Details per task: [`docs/design/08-division-of-work.md`](docs/design/08-division-of-work.md).
