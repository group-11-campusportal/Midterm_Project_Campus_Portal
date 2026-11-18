# PROGRESS.md

Living status for Week 13 (S52 milestone: the API answers at a public URL with a hosted database, and
both the web app and a phone on mobile data read from it). Updated by whoever merges the change.
Status date: **18 November 2026**.

## Done

| Area | What works | Evidence |
|---|---|---|
| API | Express 5 + JWT API: health, login, me, students, courses, enrollments (create/approve/reject/withdraw), grades (create/update/delete), scoped by token | `backend/src/app.js`, `backend/test/api.test.js` (`npm test`) |
| Database | One `@libsql/client` driver for a local SQLite file and Turso; schema v1 with FK rules, capacity checks, one grade per enrollment | `backend/src/schema.sql`, `backend/src/store.js` |
| Seed | 3 accounts, 6 courses, 8 enrollments, 4 grades; seeding an already-filled database changes nothing | `backend/src/seed-data.js` |
| Deploy config | Render blueprint: root `backend`, `npm ci` / `npm start`, health check `/api/health`, secrets from the dashboard | `render.yaml`, `backend/README.md` |
| Web | Real login, session restore from `localStorage`, all lists from the API, create enrollment, record grade, approve/reject with reload-safe status | `src/lib/api.js`, `src/App.jsx`, `src/pages/*` |
| Web deploy | GitHub Actions builds `main` and publishes `dist/` to `gh-pages`; `HashRouter` + `base: './'` make deep links refreshable | `.github/workflows/deploy.yml`, `vite.config.js` |
| Mobile | Expo Router skeleton, `AuthProvider`, JWT in `expo-secure-store`, login/logout, dashboard, enrollments (admin approve/reject), grades, profile, pull-to-refresh, 401 → login | `mobile-app/src/` |
| Mobile UX | Enrollment form: course picker as a modal, inline validation, 48 pt targets, submit in the thumb zone, one tap = one request | `mobile-app/src/app/enroll.js` |
| Design tokens | Web-aligned `theme.js` (colors, spacing, radii, `minTap` 48) and `PrimaryButton` with busy/disabled state | `mobile-app/src/theme.js`, `mobile-app/src/components/PrimaryButton.js` |
| Docs | Design Document §3 architecture, §4 data model, §5 API contract, §8 division of work; URLs page; AI feature plan; repo-wide agent rules | `docs/design/`, `README.md`, `AGENTS.md` |

## Next

Order matters: the Render URL unblocks the web build and the phone, and nothing is "done" until the
test script has been run against the deployed system.

| # | Task | Owner | Blocked by |
|---|---|---|---|
| 1 | Render deploy of the API, then Turso seed once | Bian | Turso token |
| 2 | Add the deployed web origin to `CORS_ORIGIN` | Bian | web URL |
| 3 | `VITE_API_URL` at build time (Pages) or Vercel deploy | David | Render URL |
| 4 | Phone pointed at Render, checked on iPhone **and** Android with Wi-Fi off | Fasya | Render URL |
| 5 | Branch protection on `main` (PR + 1 review) and the PR template | Fasya | — |
| 6 | Run the test script and the five deployment checks, then fill the table below | everyone | 1–4 |
| 7 | Walks through checklist A–J are prepared: one live flow per member | everyone | 1–4 |

Contact the API after deploying so nobody develops against a dead URL: `GET /api/health` must answer.

## Known bugs and gaps

| # | Problem | Impact | Workaround / next step |
|---|---|---|---|
| 1 | API still runs on Render's free tier with Turso **not yet wired in production** | data is lost on every restart until A4 lands | deployment check 2 in `docs/test-script.md` is the proof |
| 2 | Admin cannot create/edit courses or students from the phone | acceptable for now: the brief puts management on the web | say so in the demo, do not claim it |
| 3 | `src/data/*.js` is now unused dead data | misleading for a reviewer of checklist C | delete in a small `chore/web-remove-hardcoded-data` PR |
| 4 | Root `README.md` still describes the app as "front-end only, hardcoded" | wrong first impression | rewritten in the URLs task |
| 5 | Render free instance sleeps after ~15 min | first tap can take 30–60 s | mobile client waits 20 s then shows a "waking up" message; wake it before the demo |
| 6 | No lint/format gate for `mobile-app/` | style drift | cosmetic, not graded |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 18 Nov | Turso (hosted libSQL) instead of a SQLite file on Render | Render's free disk is wiped on restart; one driver keeps dev and prod identical |
| 18 Nov | `students` table replaced by `users.role` and `users.student_id` | the API needs one identity table for both roles |
| 18 Nov | The token decides row visibility; no user id in requests | prevents one student reading another student's grades |
| 18 Nov | Letter grade, points and GPA are computed per request, never stored | a stored copy can disagree with the score |
| 18 Nov | Web keeps `HashRouter` on GitHub Pages | `base: './'` + hash routing means deep links survive a refresh with no server rewrite |
| 18 Nov | Phone stores the JWT in `expo-secure-store`, not `AsyncStorage` | encrypted keychain/keystore, survives an app restart, no plain-text token |
| 18 Nov | Every API call goes through `apiFetch` (`src/lib/api.js`, `mobile-app/src/lib/api.js`) | one place for the Bearer header, the 401 handling and the error shape |
| 18 Nov | Reusable UI (`theme.js`, `PrimaryButton`) instead of per-screen values | checklist D requires no hardcoded colors/spacing in screens |

## Testing

Results are recorded by the person who ran the case, on the deployed system, using
[`docs/test-script.md`](docs/test-script.md). Fill the date and platform in, and keep the row even
when the result is a failure.

| Case | What | Web | iPhone | Android | Date | Evidence |
|---|---|---|---|---|---|---|
| 1 | `GET /api/health` → `{"status":"ok","database":"ok"}` | | | | | |
| 2 | Login as `admin` shows the administrator dashboard, no Enroll action | | | | | |
| 3 | Wrong password shows one neutral message | | | | | |
| 4 | All list requests go to `…onrender.com` with a Bearer header | | | | | |
| 5 | Same rows and statuses on web and phone for `andi` | | | | | |
| 6 | Approve on web → the student's phone shows `approved` after refresh, and after a page reload | | | | | |
| 7 | Force-quit and reopen the phone app → still signed in | | — | | | |
| 8 | Wi-Fi off, mobile data on → refresh works; network off → retry message, no crash | | | | | |
| 9 | Enrolling from the phone creates exactly one `pending` row | | | | | |
| 10 | Keyboard covers no field; targets ≥ 48 pt; Go selects the course | | | | | |
| 11 | Another student's id returns `404`, never `200` | | | | | |
| 12 | Expired/removed token → login; no data lost | | | | | |

Deployment checks, one row per check, initialled by someone who did not build that part:

| # | Check | Result | Who | Date |
|---|---|---|---|---|
| 1 | API answers at a public URL | | | |
| 2 | Data survives a Render restart (hosted database) | | | |
| 3 | Web reads the deployed API, no CORS error | | | |
| 4 | iPhone **and** Android read it on mobile data | | | |
| 5 | No secret in git history or committed files | | | |

| Result | Meaning |
|---|---|
| **Pass** | the observed behaviour is exactly what the case says |
| **Fail** | it is not; the case number goes into `Known bugs` with the screen message and time |
| **Not run** | left empty, with the reason in `Evidence` (no device, API not deployed) |

Process for a failure:

1. Note the case number, the client, the account, the exact message on screen and the time.
2. Read the logs in this order: Render → Logs (server error and stack), then the browser's Network or
   the Expo terminal (client error), then the database (is the row there?).
3. Add it to `Known bugs` above with an impact and a next step — not a fix commit on the day of the
   demo.
4. If the API slept, wake it and retry once before recording anything.

## How to update this file

- Change **Done** only with a merged PR or a test result you can point at.
- Move a line out of **Next** when it is merged, and add it to **Done** with its evidence.
- A new bug gets a number, an impact, and a next step. "Doesn't work" is not a bug report.
- Record a decision when it is reversible only with effort, with the reason, not the discussion.
