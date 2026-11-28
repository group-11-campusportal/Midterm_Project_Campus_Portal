# Campus Portal — Grades & Enrollment

University campus portal for Web & Mobile Application Development (Team 11). One Express API, one
React web app, one Expo phone app and one database. A student checks their enrollments and grades and
requests a seat in a course; an administrator approves requests, records grades and manages courses.
Both clients read the same rows from the same API, so a request made on the phone appears in the
browser on the next refresh.

## Live system

| Part | URL |
|---|---|
| Web app | <https://midterm-project-campus-portal.vercel.app> — hosted on Vercel |
| Web app (secondary) | <https://group-11-campusportal.github.io/Midterm_Project_Campus_Portal/> — GitHub Pages, same build of `main`, kept as a mirror |
| API | <https://midtermprojectcampusportal-production.up.railway.app> — every route lives under `/api`; check `/api/health` |
| Phone app | not hosted; runs in Expo Go from [`mobile-app/`](mobile-app/README.md) |
| Database | Turso (hosted libSQL) in production, a local SQLite file in development |

The API URL is an **origin, not a path**: the clients append `/api/...` themselves. Setting
`VITE_API_URL` or `EXPO_PUBLIC_API_URL` to something ending in `/api` would request `/api/api/health`
and fail. Use `https://midtermprojectcampusportal-production.up.railway.app` exactly.

Railway + Turso means a redeploy loses no data, but the service may cold-start: if a request is slow
right after a deploy, retry once.

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

They exist in every freshly **seeded local** database. Production was seeded once, before the guard in
`backend/src/setup.js` existed; `npm run db:seed` now refuses to run whenever `TURSO_DATABASE_URL` is
set, so demo accounts can never be re-created there.

10 wrong passwords for one username from the same network lock that login for 15 minutes. If a demo
login says "Too many failed sign-in attempts", wait or restart the API. The AI routes allow 5 requests
per user per minute.

## What each role can do

| | Student (`client`) | Administrator |
|---|---|---|
| Dashboard | own GPA, approved credits, open catalog | totals, pending approvals, course table |
| Courses | request a seat, withdraw a pending request | create, edit, close, delete offerings |
| Enrollments | own requests, statuses and history | all requests: approve, reject, undo an approval |
| Grades | own grades, letter and GPA | record, edit, delete; grading to-do list |
| Profile | identity, QR code, academic services | staff identity, QR code |
| AI | course recommendations from their goals | at-risk student report for a term |

The server decides every row: a student's list is filtered by the user in the token, and a `userId`
sent in a query, body or header is ignored. Roles are re-read from the database on every request.

## Stack

| Part | Technology |
|---|---|
| API | Node 22+, Express 5, `jsonwebtoken` (HS256), `bcryptjs`, `cors`, `@libsql/client` |
| Web | React 19, Vite 8, React Router 7 (`HashRouter`), oxlint |
| Phone | Expo SDK 58, Expo Router, React Native 0.88, `expo-secure-store` |
| Database | libSQL — SQLite file in development, Turso in production (one driver for both) |
| CI / deploy | GitHub Actions (lint + build + API tests), Vercel, Railway |

**Prerequisites:** Node 22 or newer, npm, and Expo Go on a phone for the mobile app.

## Run it

The API first, then the web app and/or the phone.

```bash
# API — http://127.0.0.1:3000/api/health
cd backend
cp .env.example .env # set JWT_SECRET (the command is inside the file); GEMINI_API_KEY is optional
npm install
npm run db:seed # seeds an empty database only; refuses when TURSO_DATABASE_URL is set
npm run dev

# Web — http://localhost:5173
npm install
cp .env.example .env # VITE_API_URL=http://127.0.0.1:3000
npm run dev

# Phone — Expo Go, scan the QR code
cd mobile-app
npm install
cp .env.example .env # EXPO_PUBLIC_API_URL, see mobile-app/README.md
npx expo start
```

To point a client at the deployed API instead, use the origin without `/api`:
`VITE_API_URL=https://midtermprojectcampusportal-production.up.railway.app` and the same value for
`EXPO_PUBLIC_API_URL`.

Other web scripts: `npm run build`, `npm run preview`, `npm run lint` (also lints `mobile-app/src`).
API tests: `npm test` inside `backend/` — 50 tests, no network or secrets needed. CI runs lint, the
web build and the API tests on every pull request and every push to `main`
(`.github/workflows/ci.yml`).

## Environment variables

Secrets live in `.env` (git-ignored) on a laptop and in the Railway service's Variables in production.
Nothing with a `VITE_` or `EXPO_PUBLIC_` prefix is secret: those are compiled into the bundle.

| App | Variable | Read when | Notes |
|---|---|---|---|
| API | `JWT_SECRET` | start | required, 32+ random characters |
| API | `HOST` / `PORT` | start | `127.0.0.1:3000`; `0.0.0.0` automatically on Railway |
| API | `CORS_ORIGIN` | start | exact origins, comma-separated, no trailing slash |
| API | `DB_PATH` | start | `./data/campus.db`; unused in production |
| API | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | start | empty on a laptop; set in production only |
| API | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | start | empty key → the AI routes answer `503 AI_UNAVAILABLE` |
| Web | `VITE_API_URL` | **build time** (baked into `dist/`) | defaults to `http://127.0.0.1:3000` |
| Phone | `EXPO_PUBLIC_API_URL` | **bundle time** | no default: `src/lib/config.js` refuses to call without it |

Changing either client variable needs a restart, and for Expo a cache clear: `npx expo start -c`.
`localhost` on a phone means the phone, so use the laptop's LAN IP (with `HOST=0.0.0.0` on the API),
USB with `adb reverse tcp:3000 tcp:3000`, or the Railway URL.

## Project structure

```
backend/ Express 5 API, schema, seed, tests
  src/app.js every route; store.js queries; auth.js JWT + roles; validation.js allow-lists
  src/database.js @libsql/client, schema v1 + versioned migrations
  src/limits.js in-memory rate limits (login, AI)
  src/ai.js Gemini at-risk report and course recommendations, validated server-side
  test/ api.test.js, capstone.test.js
src/ web app (React 19 + Vite)
  pages/ Login, Dashboard, FormPage, FormOutput, Enrollments, Profile, AiAdvisor,
                    CourseRecommendation, Forbidden, NotFound
  components/ Navbar, Sidebar, DataTable, StatCard, StatusBadge, modals, ProfileQr, ...
  lib/api.js the only fetch wrapper (Bearer header, timeout, error shape, 401 handling)
  utils/ grade.js (scale, GPA, score parser), terms.js, profileQr.js
mobile-app/ Expo app (Expo Router)
  src/app/ login, enroll, course/[id], (tabs) dashboard/enrollments/grades/advisor/
                    recommend/profile — the AI tab shown depends on the role
  src/lib/ api.js, config.js, session.js (expo-secure-store), useApiList.js, grading.js
  src/components/ PrimaryButton, CourseCard, StatCard, StateView, sheets and modals
  src/theme.js colours, spacing, radii, minimum 48 pt tap target
docs/design/ Design Document, one file per section
docs/wireframes/ SVG wireframes
```

## API

Every route is under `/api` and needs `Authorization: Bearer <token>` except health and login. Bodies
are JSON, 16 KB maximum, allow-listed fields only. Full contract:
[`docs/design/05-api-contract.md`](docs/design/05-api-contract.md).

| Method | Path | Who |
|---|---|---|
| GET | `/api/health` | public |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | signed in |
| GET | `/api/students` | administrator |
| GET | `/api/courses`, `/api/courses/:id` | signed in |
| POST / PUT / DELETE | `/api/courses`, `/api/courses/:id` | administrator |
| GET | `/api/enrollments`, `/api/enrollments/:id` | signed in (a student sees only their own) |
| POST | `/api/enrollments` | student |
| PATCH | `/api/enrollments/:id/status` | administrator |
| DELETE | `/api/enrollments/:id` | owner (pending only) or administrator (pending/rejected) |
| GET | `/api/grades`, `/api/grades/:id` | signed in (a student sees only their own) |
| POST / PUT / DELETE | `/api/grades`, `/api/grades/:id` | administrator |
| POST | `/api/ai/at-risk-summary` | administrator |
| POST | `/api/ai/course-recommendations` | student |

Responses are `{ "data": … }`, `{ "token", "user" }` for login, `204` for a delete, and
`{ "error": { "code", "message" } }` for a failure. `message` is safe to show a user.

### Calculated, never stored

- **Letter and points** come from the raw score: `A` ≥ 85 (4.0), `A-` ≥ 80 (3.7), `B+` ≥ 75 (3.3),
  `B` ≥ 70 (3.0), `B-` ≥ 65 (2.7), `C+` ≥ 60 (2.3), `C` ≥ 55 (2.0), `C-` ≥ 50 (1.7), `D` ≥ 40 (1.0),
  otherwise `F` (0).
- **GPA** is credit-weighted over graded courses and returned per request.
- **Seats taken** (`enrolled`) is the count of *approved* enrollments.

A score may have at most 2 decimals and is refused rather than rounded, so the stored number is the
number the registrar typed. A course's credits, code and term lock once a grade exists, because
changing them would rewrite past GPAs.

## Limits and error codes

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_INPUT` / `INVALID_JSON` | missing or extra field, wrong type, out of range, malformed body |
| 401 | `INVALID_CREDENTIALS` / `UNAUTHENTICATED` | wrong login / missing, expired or invalid token |
| 403 | `FORBIDDEN` | the role cannot perform this action |
| 404 | `NOT_FOUND` | the record does not exist **or is not visible to this user** |
| 409 | `CONFLICT` | duplicate enrollment, full course, already decided, linked record |
| 413 | `BODY_TOO_LARGE` | body over 16 KB |
| 429 | `TOO_MANY_REQUESTS` | 10 failed logins per IP + username / 15 min, or 5 AI requests per user / min; see `Retry-After` |
| 502 / 503 / 504 | `AI_FAILED`, `AI_BAD_RESPONSE`, `AI_UNAVAILABLE`, `AI_RATE_LIMITED`, `AI_TIMEOUT` | the AI provider failed, is unconfigured, is busy or is slow |
| 503 | `DATABASE_BUSY` | a transaction did not finish within 10 s; nothing was saved |

The JWT lasts 1 hour and there is no refresh route: both clients clear the token and return to login.
Rate limits are held in server memory, so a restart resets them.

## Deploy

- **Web** — the canonical site is Vercel at <https://midterm-project-campus-portal.vercel.app>
  (project `web-dev-11/midterm-project-campus-portal`): root `.`, framework preset Vite
  (`npm run build` → `dist`), Node 22.x, production branch `main`, so every merge deploys. `VITE_API_URL`
  is a Vercel config variable for Production and Preview, set to the Railway origin with no `/api`,
  because Vite bakes it into `dist/` at build time. GitHub Actions (`.github/workflows/deploy.yml`)
  also publishes the same build to `gh-pages` on every push to `main`, so the GitHub Pages URL is a
  mirror, not the submitted site. If the API moves, update `VITE_API_URL` in Vercel **and** the
  repository variable `API_URL` used by the workflow.
- **API** — Railway service, root `backend/`, `npm ci`, `npm start`, health check `/api/health`,
  secrets in Variables. `npm start` creates the tables and applies pending migrations; it **never
  seeds**. Auto-deploy is off: redeploy from the Deployments tab after a merge. Details:
  [`backend/README.md`](backend/README.md).
- **CORS** — the API only accepts origins listed in `CORS_ORIGIN`, and browsers can only call it from
  those. The two production origins (`https://midterm-project-campus-portal.vercel.app` and
  `https://group-11-campusportal.github.io`) are allowed; Vercel preview and team-alias URLs are not,
  so they load but cannot log in. A new web URL must be added there and the service restarted, or
  every browser request fails.

Changing the schema: `src/schema.sql` is version 1 and is never edited again. A change is appended to
`migrations` in `src/database.js` as the next version, and each pending step runs in its own
transaction together with the version bump.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Deployed web app calls `localhost` | `VITE_API_URL` missing when `npm run build` ran | rebuild with the variable set |
| Every request is `404` or `401` on `/api/api/...` | the API URL was set with a trailing `/api` | use the origin only |
| Phone uses the old API URL | Metro cached the bundle | `npx expo start -c` |
| First request slow, then fine | API cold start | retry; the clients already wait 20 s |
| CORS error in the browser | the origin is missing from `CORS_ORIGIN` | add it and restart the API |
| Preview or team-alias Vercel URL loads but login fails | only the canonical origins are listed in `CORS_ORIGIN` | open <https://midterm-project-campus-portal.vercel.app> instead |
| `401` then a blank screen | expected: `apiFetch` cleared the token | check the login screen appeared |
| `409` on a second enrollment | duplicate `(student_id, course_id)` | show the message, never retry blindly |
| Phone cannot reach the API on Wi-Fi | `localhost` means the phone | LAN IP + `HOST=0.0.0.0`, USB `adb reverse`, or the Railway URL |

## Team

| Member | GitHub | Owns |
|---|---|---|
| Bian Krisna | `BianKrisna` | Backend, database, wireframes |
| David Benz Susanto | `DavidBenzSusanto` | Web app, AI feature |
| Mochamad Fasya Fadillah | `mfasyafdl` | Mobile core, web ↔ mobile, git |
| Ramadhan Islamay Dermawan | `ladzey` | Mobile UX, Design Document, tests |

Details per task: [`docs/design/08-division-of-work.md`](docs/design/08-division-of-work.md).
