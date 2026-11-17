# Week 13 Team Workflow: Campus Portal (Team 11)

Based on the Week 13 slides (S49 Mobile UX, S50 Capstone Architecture, S51 Team Workflow, S52 Walking Skeleton) and the repository state on `main` @ `4161e8b` (10 Nov 2026).

**Milestone for this week (S52):** the backend answers at a public URL with data from a hosted database, and both the web app and the phone (iPhone + Android, on mobile data) read from it.

**How we are assessed:** within the next two weeks the lecturer asks the team questions from Checklist A–J on the deployed system. Every member must be able to explain one full flow (screen → API → database → back), including parts they did not write.

---

## 1. Where the repository stands

| Already done | Still missing |
|---|---|
| React + Vite web app with routing, protected routes, app shell, dashboards, forms, approve/reject enrollment | The web app still reads hardcoded data from `src/data/`. There is no `fetch` and no `VITE_API_URL` anywhere in `src/` |
| Express backend in `backend/` with JWT login, roles, CRUD for courses, enrollments and grades, plus API tests | The backend uses `better-sqlite3` with a local file, which Render's free tier wipes on every restart |
| `backend/.env.example`; `JWT_SECRET` is required; CORS is set through `CORS_ORIGIN` | No mobile app (`mobile-app/`) |
| GitHub Actions workflow that deploys the web app to GitHub Pages | No `AGENTS.md`, no `PROGRESS.md`, no root `.env.example` |
| | Nothing deployed except the static web app |

### Backend routes that already exist (input for the §5 API contract)

| Method | Path | Who |
|---|---|---|
| GET | `/api/health` | public |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | logged in |
| GET | `/api/students` | admin |
| GET | `/api/courses`, `/api/courses/:id` | logged in |
| POST / PUT / DELETE | `/api/courses`, `/api/courses/:id` | admin |
| GET | `/api/enrollments`, `/api/enrollments/:id` | logged in (scoped to the user) |
| POST | `/api/enrollments` | student |
| PATCH | `/api/enrollments/:id/status` | admin |
| DELETE | `/api/enrollments/:id` | logged in |
| GET | `/api/grades`, `/api/grades/:id` | logged in (scoped to the user) |
| POST / PUT / DELETE | `/api/grades`, `/api/grades/:id` | admin |

---

## 2. Who has built what so far

Taken from the commit history on all branches. This is why each person gets the role below.

| Member | GitHub | What they built |
|---|---|---|
| **Bian** | `BianKrisna` | The whole `backend/` (Express, SQLite schema, seed data, JWT auth, validation, API tests), CSS styling, wireframes, README |
| **David** (David Benz Susanto) | `DavidBenzSusanto` | Role-based login page, controlled grade/enrollment form with validation, lifted state, FormOutput, grade/GPA helpers, approve/reject enrollment + detail modal (PR #1) |
| **Fasya** (Mochamad Fasya Fadillah) | `mfasyafdl` | Vite scaffold, HashRouter, ProtectedRoute, app shell (Navbar, Sidebar, MainLayout), responsive/mobile layout fixes, GitHub Actions deploy workflow |
| **Ramadhan** (Ramadhan Islamay Dermawan) | `ladzey` | Reusable UI components (StatCard, DataTable, StatusBadge, EmptyState, Spinner), all hardcoded data (users, courses, enrollments, grades) |

---

## 3. Roles

The split is by layer. Two people work on mobile because the mobile app starts from zero and is the largest piece of work this week.

| Role | Owner | Why this person | Shared job they own | Checklist |
|---|---|---|---|---|
| **A. Backend & Database** | **Bian** | Wrote the entire backend, schema and seed | Deployment + database schema | A (Backend), B (Files) |
| **B. Web App** | **David** | Wrote most of the web logic: login, forms, enrollment actions | AI feature | C (Web), F (AI feature) |
| **C. Mobile Core** | **Fasya** | Set up the web app's scaffold, routing, auth guard and deploy pipeline; the mobile app needs exactly that from scratch | Git workflow and repository settings | D (Mobile), E (Web ↔ Mobile), G (Git) |
| **D. Mobile UX + Docs + QA** | **Ramadhan** | Built the reusable UI components and knows the data shape best | Design Document | H (Agents), I (Design Doc), J (Demo) |

Reviewer pairs (every PR is reviewed by your pair): **Bian ↔ David**, **Fasya ↔ Ramadhan**.

---

## 4. Tasks per person

### A. Bian: Backend & Database

| # | Issue | Branch | Done when |
|---|---|---|---|
| A1 | Switch `better-sqlite3` to `@libsql/client` (local file in dev, Turso in production) | `feat/libsql-turso` | `npm test` passes locally against `app.db` |
| A2 | Create the Turso database (region near Singapore) and a read & write token | — | URL and token shared privately with the team, never in the repo |
| A3 | Seed production **once**, then remove `TURSO_*` from your laptop `.env` | — | Seeded rows visible in Turso's SQL console |
| A4 | Deploy the backend to Render with `JWT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CORS_ORIGIN` | `chore/render-deploy` | `https://…onrender.com/api/health` returns JSON |
| A5 | Confirm every list route filters by `req.user.id` from the token, never by a user id sent by the client | `fix/scope-by-token` | A student token never returns another student's rows (add a test) |
| A6 | Add the Vercel URL to `CORS_ORIGIN` once David deploys | — | No CORS error on the deployed web app |
| A7 | Design Document §4 data model, including where files would be stored | — | §4 matches `schema.sql` |

### B. David: Web App + AI feature

| # | Issue | Branch | Done when |
|---|---|---|---|
| B1 | Add `src/lib/api.js`: `apiFetch` using `import.meta.env.VITE_API_URL` and `Authorization: Bearer <token>` | `feat/web-api-client` | One helper used by every request |
| B2 | Replace the simulated login with `POST /api/auth/login`; store the token; 401 → clear token, go to `/login` | `feat/web-real-login` | Seed accounts log in against the API |
| B3 | Replace `src/data/` in Dashboard, FormPage and enrollment actions with API calls (use the §5 example responses as fake data until a route works) | `feat/web-real-data` | `src/data/` no longer imported by any page |
| B4 | Approve/reject enrollment calls `PATCH /api/enrollments/:id/status` | `feat/web-enrollment-status-api` | Status survives a page reload |
| B5 | Deploy to Vercel (or keep GitHub Pages) with `VITE_API_URL`; add a root `.env.example` | `chore/vercel-deploy` | Network tab shows requests to `…onrender.com` |
| B6 | Propose the AI feature (Checklist F): what it does, which route, where the API key lives (backend env only) | `docs/ai-feature-plan` | Written in §5 and agreed by the team |

### C. Fasya: Mobile Core + Web ↔ Mobile + Git

| # | Issue | Branch | Done when |
|---|---|---|---|
| C1 | Create `mobile-app/` (Expo + Expo Router) with `.env.example` containing `EXPO_PUBLIC_API_URL=` | `feat/mobile-skeleton` | App opens in Expo Go on iPhone and Android |
| C2 | `lib/api.js` with the Bearer header; token in **`expo-secure-store`** (not AsyncStorage) | `feat/mobile-api-client` | Token survives an app restart |
| C3 | `AuthProvider` + `useAuth()` in `app/_layout.js`, login screen, log out button, 401 → `clearSession` → login | `feat/mobile-login` | Log in, kill app, reopen: still logged in; log out works |
| C4 | Course list screen, then "My enrollments" and "My grades" (student) from the deployed API | `feat/mobile-lists` | Same data as the web app for the same account |
| C5 | Checklist E: web and mobile use the same field names from §5 and the same seed accounts | — | One account works on both with identical data |
| C6 | Git setup: everyone is a collaborator, branch protection on `main` (PR + 1 review), PR template "What / AI wrote / I checked" | `chore/pr-template` | Direct pushes to `main` are blocked |

### D. Ramadhan: Mobile UX + Docs + QA

| # | Issue | Branch | Done when |
|---|---|---|---|
| D1 | Write `AGENTS.md` (folder structure, where the API address comes from, contract changes need the team, never commit `.env`) and `PROGRESS.md` (Done / Next / Known bugs / Decisions); check `.gitignore` has `node_modules/`, `.env`, `*.db` | `docs/agents-progress` | Both files merged on day 1 |
| D2 | Design Document §5 API contract from the route table above: method, path, who, request fields, example response, errors | `docs/api-contract` | Merged **before** web and mobile start real calls |
| D3 | Design Document §3 architecture (names, ports, platforms) and §8 division of work (copy section 3 of this file) | `docs/design-doc-week13` | Lecturer can read who owns what |
| D4 | `mobile-app/theme.js` (colors, spacing, radius, min tap size) and a `PrimaryButton` with a busy/disabled state | `feat/mobile-theme` | No hardcoded colors or spacing in screens |
| D5 | Enrollment form on mobile: 48pt tap targets, main action in the thumb zone with `useSafeAreaInsets().bottom`, keyboard never covers a field, errors under the field (no pop-ups), `returnKeyType` Next → Go | `feat/mobile-enroll-form` | One tap creates exactly one enrollment |
| D6 | Test script and device testing on 1 iPhone + 1 Android with Wi-Fi off; lead the five deployment checks; record a backup demo video | `docs/test-script` | Results logged in `PROGRESS.md` |
| D7 | Write all URLs on the first page of the Design Document and in the README | `docs/urls` | Backend, web and mobile instructions in one place |

---

## 5. Order of work and dependencies

```
Phase 1  Setup + contract (day 1)
  Everyone  clone on your own laptop, create .env from .env.example, npm install, seed locally
  Ramadhan  AGENTS.md, PROGRESS.md, .gitignore (D1)  ── start of §5 contract (D2)
  Bian      review D2 against the real routes
  Fasya     collaborators, branch protection, PR template (C6), write the Issues

Phase 2  Build in parallel (days 2–3)
  Bian      libsql + Turso + seed once (A1–A3)
  David     api.js + screens on fake data from §5 (B1, B3)
  Fasya     Expo skeleton + secure-store login on fake data (C1–C3)
  Ramadhan  theme.js + PrimaryButton + enrollment form (D4, D5)

Phase 3  Deploy (day 3–4)
  Bian      backend on Render  ──► sends the URL to everyone (A4)
  David     web points at Render, deploys to Vercel (B2, B4, B5)  ──► Bian adds the URL to CORS (A6)
  Fasya     mobile points at Render (C4, C5)

Phase 4  Prove it (day 5)
  Ramadhan leads the five checks; everyone fixes what fails; update PROGRESS.md and the Design Doc
```

Blocking chain to watch: **D2 contract → B3 / C4** and **A4 Render URL → B5 / C4 / A6**. If the contract slips, web and mobile wait.

---

## 6. The five deployment checks (definition of done this week)

| # | Check | Owner |
|---|---|---|
| 1 | Backend URL + a real path returns JSON in a browser | Bian |
| 2 | A list endpoint returns the seeded rows | Bian |
| 3 | The deployed web app's Network tab shows requests to `…onrender.com`, not `localhost` | David |
| 4 | Wi-Fi off, mobile data: the app loads and logs in on iPhone **and** Android | Fasya |
| 5 | Create a record → Render Manual Deploy / Restart → the record is still there | Ramadhan (with Bian) |

When something fails, read the logs in this order: Render Logs → Vercel Build Logs → browser Network tab → phone error screen. Share the first red line, not "it doesn't work".

---

## 7. Team rules (S51)

- Everyone works from their own laptop. Never the whole team on one laptop.
- One branch = one task, named after the task, not the person.
- Small PRs with the description **What / AI wrote / I checked**, reviewed and merged by your pair.
- `main` always runs. Every merge to `main` deploys.
- Never commit secrets: `.env` stays out, `.env.example` lists the names only.
- With AI agents: one small task per session, read every diff, never ask for "fix everything".
- Short daily stand-up in the group chat: done yesterday / doing today / blocked by.
- A blocked task gets help the same day. If someone stops contributing, give them a named Issue; if nothing changes, tell the lecturer early.
- **S51 milestone:** each of the four members has at least one reviewed PR merged this week.

## 8. Checklist A–J owners

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
| J Demo | Ramadhan (everyone presents their own flow) |
