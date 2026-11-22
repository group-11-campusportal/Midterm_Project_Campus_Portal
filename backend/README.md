# Campus Portal API (backend)

Express + JWT API. One database driver, `@libsql/client`, for both environments:

| Environment | Database | Selected by |
|---|---|---|
| Your laptop | SQLite file at `DB_PATH` (default `backend/data/campus.db`) | `TURSO_DATABASE_URL` empty |
| Production (Railway) | Turso (hosted libSQL, AWS Singapore) | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` set |

A hosting platform's disk is wiped on every restart or redeploy, which is why production data lives in Turso.

**Live API:** https://midtermprojectcampusportal-production.up.railway.app
(`/` answers with a short JSON status; health: `/api/health`)

## Run locally

```bash
cd backend
cp .env.example .env        # then set JWT_SECRET (command is in the file); GEMINI_API_KEY is optional
npm install
npm run db:seed             # laptop only; refuses to run when TURSO_DATABASE_URL is set
npm run dev                 # http://127.0.0.1:3000/api/health
npm test
```

Seed accounts: `admin` / `admin123`, `andi` / `student123`, `bella` / `student123`.

## Environment variables

Secrets live in `backend/.env` on a laptop (ignored by git) and in the Railway service's **Variables**
tab in production. Nothing else: not in source, not in `VITE_*` or `EXPO_PUBLIC_*`, not in a screenshot.

| Name | Laptop | Railway |
|---|---|---|
| `JWT_SECRET` | random, 32+ characters | random, 32+ characters (different from your laptop's) |
| `DB_PATH` | `./data/campus.db` | not used |
| `TURSO_DATABASE_URL` | **empty** | `libsql://campus-portal-biankrisna.aws-ap-southeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | **empty** | read & write token |
| `GEMINI_API_KEY` | optional (empty → AI route answers `503 AI_UNAVAILABLE`) | Google AI Studio key |
| `GEMINI_MODEL` | `gemini-3.8-flash` | `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite` (used when the main model is busy or retired) |
| `CORS_ORIGIN` | `http://localhost:5173` | comma-separated list of the deployed web origins |
| `HOST` | `127.0.0.1` | `0.0.0.0` (automatic when `RAILWAY_ENVIRONMENT` is set) |
| `PORT` | `3000` | provided by Railway |

## Production setup (Railway)

- Service settings: root directory `/backend`, region Southeast Asia (Singapore), start `npm start`.
- `npm start` only starts the server. It creates the tables on an empty database and applies pending
  migrations; it **never seeds**.
- Production was seeded once, before this rule existed. `npm run db:seed` now exits with
  `Refusing to seed` whenever `TURSO_DATABASE_URL` is set, so demo accounts can never be re-created there.
- Auto-deploy is off: after a merge to `main`, redeploy from the Deployments tab.

## Changing the schema

`src/schema.sql` is version 1 and is never edited again, because production already has those tables.
A change is appended to `migrations` in `src/database.js` as the next version:

```js
export const migrations = [
  { version: 2, sql: 'ALTER TABLE courses ADD COLUMN description TEXT' },
]
```

On the next start each pending step runs in its own transaction together with the version bump, so the
rows already in Turso stay, and a failing step leaves the database at the previous version. Never edit
or reorder a step that has been deployed. (Tested in `test/capstone.test.js`.)

## AI route

`POST /api/ai/at-risk-summary` (administrator only, body `{ "term": "2024/2025" }`). The server reads
grades and enrollments for that term, sends the provider **student numbers and numbers only** (no names),
validates the model's JSON (unknown students and risk levels are dropped; name and GPA come from the
database) and returns `aiGenerated: true`. A busy answer (429/500/503) is retried once, then
`GEMINI_FALLBACK_MODEL` is tried, all within 25 s. Every provider failure is a JSON error with a message safe to
show a user: `503 AI_UNAVAILABLE`, `503 AI_RATE_LIMITED`, `504 AI_TIMEOUT` (25 s), `502 AI_FAILED`,
`502 AI_BAD_RESPONSE`. The provider's own error text goes to the Railway logs only.

## Deployment checks owned by the backend

1. `/` and `/api/health` both answer `200`; health is `{"status":"ok","database":"ok"}`.
2. `GET /api/courses` with a token returns the courses.
3. `GET /api/students` with a **student** token answers `403 FORBIDDEN`.
4. A course created through the API is still there after restarting the service (data is in Turso).
5. `POST /api/ai/at-risk-summary` as `admin` returns a report; with `GEMINI_API_KEY` removed it returns
   `503 AI_UNAVAILABLE` instead of crashing.

## Rules the code keeps

- Every list route filters by `req.user.id`, which comes from the verified token. A user id sent in the
  query string, a header or the body is ignored (see `list routes scope by the token…` in the tests).
- Roles are read from the database on every request, not from the token. A student calling an
  administrator route gets `403 FORBIDDEN`.
- The AI provider is called only from `backend/`; the key is never returned in a response.
