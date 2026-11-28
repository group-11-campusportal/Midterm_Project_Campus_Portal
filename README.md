# Campus Portal — Grades & Enrollment

University campus portal for Web & Mobile Application Development (Team 11). One Express API, one
React web app, one Expo phone app and one database. A student checks their enrollments and grades and
requests a seat in a course; an administrator approves requests, records grades and manages courses.

## Live system

| Part | URL |
|---|---|
| Web app | <https://group-11-campusportal.github.io/Midterm_Project_Campus_Portal/> |
| API | <https://midtermprojectcampusportal-production.up.railway.app> — live on Railway; check `/api/health` |
| Phone app | not hosted; runs in Expo Go from [`mobile-app/`](mobile-app/README.md) |
| Database | Turso in production, a local SQLite file in development |

The API runs on Railway with the Turso database. If a request is slow right after a deploy, retry once.

Design Document: [`docs/design/README.md`](docs/design/README.md) ·
Status: [`PROGRESS.md`](PROGRESS.md) · Agent rules: [`AGENTS.md`](AGENTS.md) ·
Test script: [`docs/test-script.md`](docs/test-script.md) ·
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

Other web scripts: `npm run build`, `npm run preview`, `npm run lint` (also lints `mobile-app/src`).
API tests: `npm test` inside `backend/`. CI runs lint, the web build and the API tests on every pull
request (`.github/workflows/ci.yml`).

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
| `/form` | Enroll in Course (student) | login required; an administrator is redirected to `/output` |
| `/output` | Grade Records with Record / Edit Grade (admin) / My Submissions (student) | login required |
| `/enrollments` | University Enrollments: approve, reject, undo an approval | administrator only |
| `/profile` | Profile, QR code and academic services | login required |
| `/ai-advisor` | AI at-risk student report | administrator only |
| `/course-recommendation` | AI course recommendations | student only |
| anything else | 404 | |

The web app uses `HashRouter` and `vite.config.js` sets `base: './'`, so any route can be refreshed
or opened directly on GitHub Pages. The phone app uses Expo Router: a guarded stack sends a signed-out
user to login, and five tabs per role: Dashboard, Enrollments, Grades, Profile, plus AI Advisor
(administrator) or Recommend (student).

## Project structure

```
backend/            Express 5 API, schema, seed, tests
  src/              app.js routes, store.js queries, auth.js, validation.js, schema.sql
  src/limits.js     in-memory rate limits (login, AI)
  test/             api.test.js, capstone.test.js
src/                web app (React 19 + Vite)
  pages/            Login, Dashboard, FormPage, FormOutput, Enrollments, Profile, AiAdvisor,
                    CourseRecommendation, Forbidden, NotFound
  components/       Navbar, Sidebar, DataTable, StatCard, StatusBadge, modals (course, grade, details), ...
  lib/api.js        the only fetch wrapper (timeout, error shape, 401 handling)
  utils/            grade.js (scale, GPA, score parser), terms.js, profileQr.js
  layouts/          MainLayout
mobile-app/         Expo app (Expo Router)
  src/app/          screens: login, enroll, course/[id], (tabs) index/enrollments/grades/advisor/recommend/profile
  src/lib/          api.js, config.js, session.js, useApiList.js, grading.js, terms.js
  src/components/   PrimaryButton, ListRow, CourseCard, StatCard, StateView, sheets and modals
  src/theme.js      colours, spacing, radii, minimum tap target
docs/design/        Design Document, one file per section
docs/wireframes/    SVG wireframes
```

## Deploy

- **API** — Railway service with root `backend/`, `npm ci`, `npm start`, health check `/api/health`,
  secrets in the Railway service's Variables; see [`backend/README.md`](backend/README.md).
  The earlier, unused Render blueprint is kept for the record in `docs/archive/render.yaml`.
- **Web** — `.github/workflows/deploy.yml` builds `main` and publishes `dist/` to `gh-pages`. The workflow
  sets `VITE_API_URL` to the Railway URL (override with the repository variable `API_URL`);
  without it the bundle falls back to `127.0.0.1`.
- **CORS** — the API only accepts origins listed in `CORS_ORIGIN`. A new web URL must be added there.

## Team

| Member | GitHub | Owns |
|---|---|---|
| Bian Krisna | `BianKrisna` | Backend, database, wireframes |
| David Benz Susanto | `DavidBenzSusanto` | Web app, AI feature |
| Mochamad Fasya Fadillah | `mfasyafdl` | Mobile core, web ↔ mobile, git |
| Ramadhan Islamay Dermawan | `ladzey` | Mobile UX, Design Document, tests |

Details per task: [`docs/design/08-division-of-work.md`](docs/design/08-division-of-work.md).
