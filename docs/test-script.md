# Week 13 test script — Campus Portal (Team 11)

Owner: Ramadhan. Run this before the demo, on the **deployed** system, and record the result of every
case in the `Testing` section of [`PROGRESS.md`](../PROGRESS.md). A case is only "pass" when someone
else can repeat it from this page alone.

## 0. Before you start

| Prerequisite | Check |
|---|---|
| API deployed (A4) | `curl -s https://campus-portal-api.onrender.com/api/health` → `{"status":"ok","database":"ok"}` |
| Production seeded once (A3) | `admin`, `andi`, `bella` log in on the deployed API |
| Web deployed with `VITE_API_URL` (A6) | DevTools → Network shows requests to `…onrender.com`, not `localhost` |
| Deployed web origin in `CORS_ORIGIN` | no CORS error in the browser console |
| Phone `.env` points at Render | `EXPO_PUBLIC_API_URL=https://…onrender.com`, then `npx expo start -c` |
| One iPhone **and** one Android with Expo Go | both on mobile data for case 8 |

Wake the API first: Render's free instance sleeps after ~15 minutes and the first request afterwards
can take 30–60 seconds. Do not start recording before the health check answers.

## 1. Environment

| Case | Where | Preconditions |
|---|---|---|
| 1–6 | Web, desktop browser | signed out |
| 7–9 | Phone (each platform) | Expo Go installed, `.env` set |
| 10–12 | Either client | two accounts available |

## 2. Test cases

Format: **do this → expect exactly this**.

### Case 1 — Health and database
`GET https://…onrender.com/api/health`
→ `200` with `{"status":"ok","database":"ok"}`. A `500` here means the database is down: nothing else
in this script can pass.

### Case 2 — Login and role
Open the web app, log in as `admin` / `admin123`
→ dashboard shows the administrator navigation, "Pending approvals", and a course table; **no**
"Enroll" action.

### Case 3 — Wrong password
Log out, log in as `andi` / `wrong-password`
→ one message, "Invalid username or password." Neither the web nor the phone may reveal which of the
two was wrong, and no token is stored (reloading the page still shows login).

### Case 4 — Lists come from the API
Log in as `andi` on the web
→ DevTools → Network: `POST /api/auth/login`, then `GET /api/courses`, `GET /api/enrollments`,
`GET /api/grades`, `GET /api/auth/me` — all to `…onrender.com` with a `Authorization: Bearer …`
header (login and health excepted). Nothing is read from `src/data/`.

### Case 5 — Web and phone show the same rows
With `andi` signed in on the web, compare against the phone's My Enrollments
→ same enrollment rows, same statuses, same course codes (`CS101` and `CS201` approved, `CS210`
pending with the seed data). A difference means one client is filtering or caching on its own.

### Case 6 — Approve changes both clients
As `admin` on the web, approve `andi`'s `CS210` pending request, then pull-to-refresh the phone's My
Enrollments as `andi`
→ web shows `approved` immediately, and the phone shows `approved` after the refresh. Reloading the
web page keeps `approved` (it is read back from the database, not from component state).

### Case 7 — Phone survives an app restart
On the phone, log in as `andi`, then force-quit the app (swipe it away) and reopen it
→ no login screen; the dashboard appears. The token is read from the secure store and confirmed with
`GET /api/auth/me`. On Android the token must not be readable in a plain-text file; on iOS it is in
the keychain.

### Case 8 — Mobile data (no Wi-Fi)
Turn Wi-Fi off, keep mobile data on, pull-to-refresh on the phone
→ data refreshes. Then stop the API (or turn mobile data off) and pull again
→ an error with a retry action appears; after ~20 s the message mentions a slow/waking server. The
app must not crash and must not show stale rows as if they were fresh.

### Case 9 — Enrollment on the phone creates exactly one row
As `andi`, tap **Enroll** on an unenrolled course, then **Send enrollment request**; afterwards check
My Enrollments and the web as the same account
→ the success state appears, and **one** new `pending` row exists — not two. Tap Send twice quickly:
still one row. Reopen the form and choose the same course → the row shows "Requested", not a button;
the API's `409` message is shown under the field if the request is forced.

### Case 10 — Keyboard and touch targets
On the phone, open the enrollment form, focus the search field, and type a course code
→ the field and the submit button stay visible above the keyboard; every button and row is at least
48 pt (compare with a fingertip); the Go key on the keyboard selects the matching course. Inline
errors appear under the field, never in a system alert.

### Case 11 — Another student's data
Copy one of `bella`'s enrollment or grade ids from the browser (as `admin`), then call it with
`andi`'s token:
`curl -s https://…onrender.com/api/enrollments/<bella-id> -H "Authorization: Bearer <andi-token>"`
→ `404 NOT_FOUND`, never `200`. The same with `GET /api/enrollments` and `GET /api/grades` returns
only `andi`'s rows.

### Case 12 — Session expiry and restored data
Delete the browser's `campus_portal_token` and call any list route, or wait for the 1-hour token to
expire and click a list
→ the client returns to the login screen (a `401` clears the token). After logging in again the same
rows are still there, and none of the records created in cases 6 and 9 were lost.

## 3. The five deployment checks

Each one must be shown by someone who did not build that part.

| # | Check | Command or action | Pass means |
|---|---|---|---|
| 1 | API answers at a public URL | `curl` the health route from a phone hotspot | `{"status":"ok","database":"ok"}` |
| 2 | Data lives in the hosted database | create an enrollment, restart the Render service from its dashboard, read the row again | the row is still there |
| 3 | Web reads the deployed API | open the GitHub Pages URL with DevTools open | every request goes to `…onrender.com`, no CORS error |
| 4 | Both platforms read it | iPhone **and** Android on mobile data | same rows as the browser |
| 5 | Secrets are not in the repository | `git log -S "TURSO_AUTH_TOKEN" --oneline` and a search of the repo for `JWT_SECRET=` | no real value in history or in any file except `.env` on a laptop (ignored) |

## 4. When something fails

1. Note the case number, the client, the account, the exact message on screen and the time.
2. Read the logs in this order: Render → Logs (server error and stack), then the browser's Network or
   the Expo terminal (client error), then the database (is the row there?).
3. Add it to `Known bugs` in `PROGRESS.md` with an impact and a next step — not a fix commit on the
   day of the demo.
4. If the API slept, wake it and retry once before filing anything.

## 5. Backup demo video

Record once, on a phone with Wi-Fi off, with the deployed API already awake:

1. Health route in the browser.
2. Log in as `andi` on the phone → dashboard, My Enrollments, My Grades.
3. Enroll in a course → success → the new pending row.
4. Log in as `admin` on the web → approve that request.
5. Refresh the phone → the request is `approved`.
6. Record a grade as `admin`, then show it on the phone with its letter and points.

Upload it unlisted and put the link in `PROGRESS.md`. It is the fallback when the campus Wi-Fi or
Render fails during the demo.