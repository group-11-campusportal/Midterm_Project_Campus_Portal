# Design Document §8: Division of work

Owner: Ramadhan. The split is by layer, not by screen, so every member can explain one complete flow
from screen to database and back. Reviewer pairs: **Bian ↔ David**, **Fasya ↔ Ramadhan**.

## 8.1 Roles

| Role | Owner | Why this person | Shared job they own | Rubric section |
|---|---|---|---|---|
| **A. Backend & Database** | **Bian** (`BianKrisna`) | Wrote the whole `backend/`: Express, schema, seed, JWT, validation, API tests, CSS, wireframes | Deployment, database schema | A (Backend), B (Files) |
| **B. Web App + AI feature** | **David** (`DavidBenzSusanto`) | Role-based login, controlled forms with validation, lifted state, approve/reject, grade/GPA helpers | The AI feature | C (Web), F (AI feature) |
| **C. Mobile Core + Web ↔ Mobile + Git** | **Fasya** (`mfasyafdl`) | Set up the web scaffold, routing, auth guard and deploy pipeline; the phone app needs exactly the same from scratch | Git workflow, repository settings | D (Mobile core), E (Web ↔ Mobile), G (Git) |
| **D. Mobile UX + Docs + QA** | **Ramadhan** (`ladzey`) | Built the reusable UI pieces and knows the data shape best | Design Document, test script | D (Mobile UX), H (Agents), I (Design Doc), J (Demo) |

## 8.2 Tasks per person

### Bian — backend and database

| # | Task | Branch | Done when |
|---|---|---|---|
| A1 | `@libsql/client` instead of `better-sqlite3` (file in dev, Turso in production) | `feat/libsql-turso` | `npm test` passes against `app.db` |
| A2 | Create the Turso database (region near Singapore) and a read & write token | — | URL and token shared privately, never in the repo |
| A3 | Seed production **once**, then remove `TURSO_*` from the laptop `.env` | — | rows visible in Turso's console |
| A4 | Deploy the API to Render with `JWT_SECRET`, `TURSO_*`, `CORS_ORIGIN` | `chore/render-deploy` | `…onrender.com/api/health` returns JSON |
| A5 | Confirm every list route filters by `req.user.id` from the token | `fix/scope-by-token` | a student token never returns another student's rows (test) |
| A6 | Add the deployed web origin to `CORS_ORIGIN` | — | no CORS error in the browser |
| A7 | §4 data model, including where files would be stored | — | §4 matches `schema.sql` |

### David — web app and AI feature

| # | Task | Branch | Done when |
|---|---|---|---|
| B1 | `src/lib/api.js`: `apiFetch` with `VITE_API_URL` and the Bearer header | `feat/web-api-client` | one helper used by every request |
| B2 | Real login through `POST /api/auth/login`, token stored, `401` → login | `feat/web-real-login` | seed accounts log in against the API |
| B3 | Replace hardcoded data in Dashboard, FormPage, enrollment actions | `feat/web-real-data` | no page imports `src/data/` |
| B4 | Approve/reject through `PATCH /api/enrollments/:id/status` | `feat/web-enrollment-status-api` | status survives a reload |
| B5 | Deploy with `VITE_API_URL` (Pages build or Vercel) + root `.env.example` | `chore/vercel-deploy` | Network tab shows `…onrender.com` |
| B6 | AI feature: what it does, which route, key in the backend env only | `docs/ai-feature-plan` | written in §5 and agreed |

### Fasya — mobile core, web ↔ mobile, git

| # | Task | Branch | Done when |
|---|---|---|---|
| C1 | `mobile-app/` (Expo + Expo Router) with `EXPO_PUBLIC_API_URL` in `.env.example` | `feat/mobile-skeleton` | opens in Expo Go on iPhone and Android |
| C2 | `lib/api.js` with the Bearer header, token in `expo-secure-store` | `feat/mobile-api-client` | token survives an app restart |
| C3 | `AuthProvider` + `useAuth()`, login, logout, `401` → login | `feat/mobile-login` | log in, kill, reopen: still signed in |
| C4 | Course list, my enrollments, my grades from the deployed API | `feat/mobile-lists` | same data as the web app for the same account |
| C5 | Same field names as §5 and the same seed accounts on both clients | — | one account works on both identically |
| C6 | Collaborators, branch protection on `main`, PR template | `chore/pr-template` | direct pushes to `main` are blocked |

### Ramadhan — mobile UX, docs, QA

| # | Task | Branch | Done when |
|---|---|---|---|
| D1 | `AGENTS.md`, `PROGRESS.md`, `.gitignore` check | `docs/agents-progress` | merged on day 1 |
| D2 | §5 API contract from the real routes | `docs/api-contract` | merged **before** the clients call the API |
| D3 | §3 architecture, §8 division of work | `docs/design-doc-week13` | the lecturer can read who owns what |
| D4 | `mobile-app/theme.js` and `PrimaryButton` with a busy state | `feat/mobile-theme` | no hardcoded colours or spacing in screens |
| D5 | Phone enrollment form: 48 pt targets, thumb-zone submit, keyboard hides no field, inline errors, Next → Go | `feat/mobile-enroll-form` | one tap creates exactly one enrollment |
| D6 | Test script, device testing (1 iPhone + 1 Android, Wi-Fi off), the five deployment checks, backup demo video | `docs/test-script` | results logged in `PROGRESS.md` |
| D7 | All URLs on the first page of this document and in the README | `docs/urls` | one place for API, web and phone instructions |

## 8.3 Rubric ownership

| Section | Owner |
|---|---|
| A Backend | Bian |
| B Files | Bian |
| C Web | David |
| D Mobile | Fasya (core), Ramadhan (UX) |
| E Web ↔ Mobile | Fasya |
| F AI feature | David |
| G Git | Fasya |
| H Agents | Ramadhan |
| I Design Doc | Ramadhan |
| J Demo | Ramadhan leads; everyone presents their own flow |

## 8.4 What each member must be able to show unaided

| Member | The flow the lecturer may ask for |
|---|---|
| Bian | Approve a pending enrollment on the web → `PATCH` → row changes in Turso → the student's phone shows `approved`; then explain why the seat count is a `COUNT(*)` and not a column |
| David | Log in with a seed account on the web → JWT stored → dashboard lists come from `/api/courses`, `/api/enrollments`, `/api/grades` → record a grade and see `letter`/`points` come back computed |
| Fasya | Kill and reopen the phone app → token read from the secure store → `/api/auth/me` → tabs appear; then a `401` on any screen returns to login |
| Ramadhan | On the phone, open the enrollment form from a course, submit, and show exactly one new row; then the same account on the web shows the same request |
