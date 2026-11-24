# PROGRESS.md

Living status for Week 13 (S52 milestone: the API answers at a public URL with a hosted database, and
both the web app and a phone on mobile data read from it). Updated by whoever merges the change.
Status date: **24 November 2026**.

## Done

| Area | What works | Evidence |
|---|---|---|
| API | Express 5 + JWT API: health, login, me, students, courses, enrollments (create/approve/reject/withdraw), grades (create/update/delete), scoped by token | `backend/src/app.js`, `backend/test/api.test.js` (`npm test`) |
| Database | One `@libsql/client` driver for a local SQLite file and Turso; schema v1 with FK rules, capacity checks, one grade per enrollment | `backend/src/schema.sql`, `backend/src/store.js` |
| Seed | 3 accounts, 6 courses, 8 enrollments, 4 grades; seeding an already-filled database changes nothing | `backend/src/seed-data.js` |
| Deploy | API on Railway with Turso; root `backend`, `npm ci` / `npm start`, health check `/api/health`, secrets in Railway Variables | `backend/README.md` |
| Web | Real login, session restore from `localStorage`, all lists from the API, create enrollment, record grade, approve/reject with reload-safe status | `src/lib/api.js`, `src/App.jsx`, `src/pages/*` |
| Web deploy | GitHub Actions builds `main` and publishes `dist/` to `gh-pages`; `HashRouter` + `base: './'` make deep links refreshable | `.github/workflows/deploy.yml`, `vite.config.js` |
| Mobile | Expo Router skeleton, `AuthProvider`, JWT in `expo-secure-store`, login/logout, dashboard, enrollments (admin approve/reject), grades, profile, pull-to-refresh, 401 → login | `mobile-app/src/` |
| Mobile UX | Enrollment form: course picker as a modal, inline validation, 48 pt targets, submit in the thumb zone, one tap = one request | `mobile-app/src/app/enroll.js` |
| Design tokens | Web-aligned `theme.js` (colors, spacing, radii, `minTap` 48) and `PrimaryButton` with busy/disabled state | `mobile-app/src/theme.js`, `mobile-app/src/components/PrimaryButton.js` |
| Docs | Design Document §3 architecture, §4 data model, §5 API contract, §8 division of work; URLs page; AI feature plan; repo-wide agent rules | `docs/design/`, `README.md`, `AGENTS.md` |

## Next

The API is live on Railway (`https://midtermprojectcampusportal-production.up.railway.app`, Turso
database). Nothing is "done" until the test script has been run against the deployed system.

| # | Task | Owner | Blocked by |
|---|---|---|---|
| 1 | ~~Deploy the API with Turso~~ done on Railway | Bian | — |
| 2 | ~~Deployed web origin in `CORS_ORIGIN`~~ done (`https://group-11-campusportal.github.io`) | Bian | — |
| 3 | `VITE_API_URL` set in `deploy.yml`; confirm the Pages bundle calls Railway after the next deploy | Fasya / David | merge |
| 4 | Phone pointed at Railway, checked on iPhone **and** Android with Wi-Fi off | Fasya | — |
| 5 | Branch protection on `main` (PR + 1 review) | Fasya | — |
| 6 | Run the test script and the five deployment checks, then fill the table below | everyone | 3–4 |
| 7 | Walks through checklist A–J are prepared: one live flow per member | everyone | 3–4 |

Contact the API after deploying so nobody develops against a dead URL: `GET /api/health` must answer.

## Known bugs and gaps

| # | Problem | Impact | Workaround / next step |
|---|---|---|---|
| 1 | Pages bundle built before 24 Nov calls `http://127.0.0.1:3000` | deployed web app cannot log in | fixed in `deploy.yml`; redeploy and check DevTools → Network |
| 2 | Admin can record grades on web and phone (Grades → Record Grade), but cannot create/edit courses or edit/delete grades on either; no client uses the course CRUD routes | "manages courses" is not demonstrable | say so in the demo, do not claim it |
| 3 | `src/data/*.js` is now unused dead data | misleading for a reviewer of checklist C | delete in a small `chore/web-remove-hardcoded-data` PR |
| 4 | Hardcoded placeholder content on web and phone (term labels, "Dean's List", "84 / 144 SKS", tuition, UPH links) | numbers that do not come from the API | see the 24 Nov audit |
| 5 | No login rate limit while demo passwords are public | brute force / demo account takeover if they exist in production | add a limiter; confirm production has no demo accounts |
| 6 | No lint/format gate for `mobile-app/`; CI does not run backend tests | regressions reach `main` | add both to CI |

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
| 4 | All list requests go to `…up.railway.app` with a Bearer header | | | | | |
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
| 2 | Data survives a Railway restart (hosted database) | | | |
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
2. Read the logs in this order: Railway → Deploy Logs (server error and stack), then the browser's Network or
   the Expo terminal (client error), then the database (is the row there?).
3. Add it to `Known bugs` above with an impact and a next step — not a fix commit on the day of the
   demo.
4. If the API slept, wake it and retry once before recording anything.

## How to update this file

- Change **Done** only with a merged PR or a test result you can point at.
- Move a line out of **Next** when it is merged, and add it to **Done** with its evidence.
- A new bug gets a number, an impact, and a next step. "Doesn't work" is not a bug report.
- Record a decision when it is reversible only with effort, with the reason, not the discussion.
