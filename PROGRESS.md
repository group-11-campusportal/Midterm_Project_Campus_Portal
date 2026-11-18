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
| Design tokens | Web-aligned `theme.js` (colors, spacing, radii, `minTap` 48) and `PrimaryButton` with busy/disabled state | `mobile-app/src/theme.js`, `mobile-app/src/components/PrimaryButton.js` |
| Docs | Design Document §4 data model; AI feature plan; repo-wide agent rules | `docs/design/04-data-model.md`, `docs/ai-feature-plan.md`, `AGENTS.md` |

## Next

Order matters: the contract and the Render URL unblock everyone else.

| # | Task | Owner | Blocked by |
|---|---|---|---|
| 1 | §5 API contract (method, path, who, request, example, errors) | Ramadhan | — |
| 2 | §3 architecture, §8 division of work, URLs on the first page + README | Ramadhan | Render URL |
| 3 | Web + phone enrollment form on mobile (48 pt targets, inline errors, thumb-zone submit) | Ramadhan | — |
| 4 | Render deploy of the API, then Turso seed once | Bian | Turso token |
| 5 | Add the deployed web origin to `CORS_ORIGIN` | Bian | web URL |
| 6 | `VITE_API_URL` at build time (Pages) or Vercel deploy | David | Render URL |
| 7 | Phone pointed at Render, checked on iPhone **and** Android with Wi-Fi off | Fasya | Render URL |
| 8 | Branch protection on `main` (PR + 1 review) and the PR template | Fasya | — |
| 9 | Walks through checklist A–J are prepared: one live flow per member | everyone | 4–7 |

## Known bugs and gaps

| # | Problem | Impact | Workaround / next step |
|---|---|---|---|
| 1 | API still runs on Render's free tier with Turso **not yet wired in production** | data is lost on every restart until A4 lands | check 5 in `docs/test-script.md` is the proof |
| 2 | Phone app cannot create an enrollment request from the course list (web can) | checklist D is incomplete | enrollment form screen (task 3 above) |
| 3 | Admin cannot create/edit courses or students from the phone | acceptable for now: the brief puts management on the web | say so in the demo, do not claim it |
| 4 | `src/data/*.js` is now unused dead data | misleading for a reviewer of checklist C | delete in a small `chore/web-remove-hardcoded-data` PR |
| 5 | Root `README.md` still describes the app as "front-end only, hardcoded" | wrong first impression | rewritten in the URLs task |
| 6 | Render free instance sleeps after ~15 min | first tap can take 30–60 s | mobile client waits 20 s then shows a "waking up" message; wake it before the demo |
| 7 | No lint/format gate for `mobile-app/` | style drift | cosmetic, not graded |

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

## How to update this file

- Change **Done** only with a merged PR or a test result you can point at.
- Move a line out of **Next** when it is merged, and add it to **Done** with its evidence.
- A new bug gets a number, an impact, and a next step. "Doesn't work" is not a bug report.
- Record a decision when it is reversible only with effort, with the reason, not the discussion.
