# Campus Portal API (backend)

Express + JWT API. One database driver, `@libsql/client`, for both environments:

| Environment | Database | Selected by |
|---|---|---|
| Your laptop | SQLite file at `DB_PATH` (default `backend/data/campus.db`) | `TURSO_DATABASE_URL` empty |
| Production (Railway) | Turso (hosted libSQL, AWS Singapore) | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` set |

A hosting platform's disk is wiped on every restart or redeploy, which is why production data lives in Turso.

**Live API:** https://midtermprojectcampusportal-production.up.railway.app/api
(health: [`/api/health`](https://midtermprojectcampusportal-production.up.railway.app/api/health))

The Week 13 slides use Render. Render asked for card verification on the free plan, so the service runs
on Railway's trial instead (one-time $5 credit, 30 days). The code has nothing platform-specific in it:
moving back to Render needs only the same environment variables.

## Run locally

```bash
cd backend
cp .env.example .env        # then set JWT_SECRET (command is in the file)
npm install
npm run db:seed             # only seeds an empty database
npm run dev                 # http://127.0.0.1:3000/api/health
npm test
```

Seed accounts: `admin` / `admin123`, `andi` / `student123`, `bella` / `student123`.

## Environment variables

| Name | Laptop | Railway |
|---|---|---|
| `JWT_SECRET` | random, 32+ characters | random, 32+ characters (different from your laptop's) |
| `DB_PATH` | `./data/campus.db` | not used |
| `TURSO_DATABASE_URL` | **empty** | `libsql://campus-portal-biankrisna.aws-ap-southeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | **empty** | read & write token |
| `CORS_ORIGIN` | `http://localhost:5173` | comma-separated list of the deployed web origins |
| `HOST` | `127.0.0.1` | `0.0.0.0` |
| `PORT` | `3000` | provided by Railway |

## Production setup (Railway)

- Service settings: root directory `/backend`, region Southeast Asia (Singapore), default build, start `npm start`.
- Public domain generated under Settings → Networking.
- The first start creates the tables. Production was seeded **once** from the service's Console tab:
  `"$(readlink -f /proc/1/exe)" src/setup.js seed` (`npm` is not on the console's PATH). Running it again
  changes nothing: the seed refuses to touch a database that already has rows.
- Auto-deploy is off: after a merge to `main`, redeploy from the Deployments tab.
- A6: when the web app has its Vercel URL, append it to `CORS_ORIGIN`, separated by a comma.

## Deployment checks owned by the backend (verified 17 Nov 2026)

1. `/api/health` returns `{"status":"ok","database":"ok"}`.
2. `GET /api/courses` with a token returns the 6 seeded courses.
5. A course created through the API was still there after restarting the service (data is in Turso).

## Rules the code keeps

- Every list route filters by `req.user.id`, which comes from the verified token. A user id sent in the
  query string, a header or the body is ignored (see `list routes scope by the token…` in the tests).
- Roles are read from the database on every request, not from the token.
- Secrets live only in `.env` (ignored by git) and the Railway Variables tab.
