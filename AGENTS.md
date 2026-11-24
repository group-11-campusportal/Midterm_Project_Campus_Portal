# AGENTS.md — how to work in this repository

Campus Portal (Team 11): one Express API, one React web app, one Expo app, one database.
If you are an AI agent or a new team member, read this file and `docs/WEEK13_TEAM_WORKFLOW.md`
before you change anything. `PROGRESS.md` says what is done and what is next.

## Folder map

| Path | What it is | Stack | Owner |
|---|---|---|---|
| `backend/` | The only API and the only code that talks to the database | Node 22, Express 5, `@libsql/client` (SQLite file / Turso), JWT | Bian |
| `src/` | Web app served from GitHub Pages | React 19, Vite 8, React Router 7 (`HashRouter`) | David |
| `mobile-app/` | Phone app | Expo SDK 58, Expo Router, `expo-secure-store` | Fasya (core), Ramadhan (UX) |
| `docs/design/` | Design Document, section per file (`03`, `04`, `05`, `08`…) | Markdown | Ramadhan |
| `docs/wireframes/` | SVG wireframes | SVG | Bian |

There is no shared code package. The three apps agree through the **API contract**
(`docs/design/05-api-contract.md`), not through imports.

## Run it

```bash
# API — http://127.0.0.1:3000/api/health
cd backend && cp .env.example .env   # set JWT_SECRET (command is inside the file)
npm install && npm run db:seed && npm run dev

# Web — http://localhost:5173
npm install && npm run dev           # from the repository root

# Phone — Expo Go, QR code
cd mobile-app && cp .env.example .env && npm install && npx expo start
```

Seed accounts (`backend/src/seed-data.js`): `admin` / `admin123`, `andi` / `student123`,
`bella` / `student123`. They exist in every seeded local database.

## Where the API address comes from

| App | Variable | Read when | Default |
|---|---|---|---|
| Web | `VITE_API_URL` | **build time** — it is baked into `dist/` | `http://127.0.0.1:3000` |
| Phone | `EXPO_PUBLIC_API_URL` | **bundle time** — `src/lib/config.js` refuses to start a request without it | none (an error is shown) |
| API | `HOST` / `PORT` / `CORS_ORIGIN` | process start | `127.0.0.1:3000`, `http://localhost:5173` |

- Changing either variable needs a restart, and for Expo a cache clear: `npx expo start -c`.
- `localhost` in the phone app means the phone. On a real device use the laptop's LAN IP
  (with `HOST=0.0.0.0` on the API) or the deployed Railway URL, or USB with
  `adb reverse tcp:3000 tcp:3000`.
- The API only accepts origins listed in `CORS_ORIGIN`. A new deployed web URL must be added
  there by Bian, or every request fails in the browser with a CORS error.

## The contract rule

A field name (`courseCode`, `studentId`, `enrolledAt`, `letter`, `points`, `enrolled`, …) or a
response shape (`{ data }` / `{ token, user }` / `{ error: { code, message } }`) is used by both
clients. **Changing one requires the whole team**: update `backend/src/store.js`, the web app, the
mobile app, `docs/design/05-api-contract.md` and the API tests in the same change, or ask Bian for
an additive field instead.

Two more rules the API keeps and clients must not work around:

- The server decides which rows a user sees from the token subject. No client ever sends a user id
  to filter a list; a `userId` in a body, query or header is ignored.
- Roles come from the database on every request, not from the token.

## Secrets

- `.env` is ignored by git. Only `.env.example` (names, no values) is committed.
- Never paste `JWT_SECRET`, `TURSO_AUTH_TOKEN` or an AI provider key into source, a screenshot, a
  commit message or a chat. Production values live in the Railway service's Variables only.
- Never put the Turso URL/token in a laptop `.env`; production is seeded once from the command line
  (`backend/README.md`).
- Server-side only: any future AI feature calls its provider from `backend/`, never from `src/` or
  `mobile-app/`, because a key shipped to a browser or a phone is a public key.

## Git

- One branch = one task, named after the task (`feat/web-real-data`, `docs/api-contract`).
  Never work directly on `main`; never commit "fix everything".
- Every PR description answers **What / AI wrote / I checked**. Reviewer pairs:
  Bian ↔ David, Fasya ↔ Ramadhan.
- Commit messages: `feat(web): …`, `fix(api): …`, `docs: …`, `chore: …`.
- Do not commit `node_modules/`, `dist/`, `backend/data/`, `*.db`, `.env`, or `mobile-app/.expo/`.

## Known traps

| Symptom | Cause | Fix |
|---|---|---|
| Web app on Pages calls `localhost` | `VITE_API_URL` was not set when `npm run build` ran | rebuild with the variable set |
| Phone shows the old API URL | Metro cached the bundle | `npx expo start -c` |
| First request takes long, then works | API was redeploying or cold | retry; the phone client already waits 20 s |
| Deployed web app: CORS error | its origin is missing from `CORS_ORIGIN` | Bian adds it, restart the service |
| `401` then a blank screen | expected — `apiFetch` clears the token | check the login screen appeared |
| `SQLITE_CONSTRAINT` on a second enrollment | duplicate `(student_id, course_id)` | show the 409 message, do not retry |

## Working with an AI agent

- One small task per session. "Fix everything" produces unreviewable diffs.
- Read the diff before you commit, and be able to explain every line — the lecturer asks each member
  to walk through one full flow (screen → API → database → back).
- An agent must not touch `.env`, must not push to `main`, and must not invent endpoint or field
  names. Point it at `docs/design/05-api-contract.md` and `backend/src/app.js` instead.
- Anything the agent wrote goes in the PR body under **AI wrote**, with what you verified under
  **I checked**.

## Who answers for what (checklist A–J)

| Section | Owner |
|---|---|
| A Backend, B Files | Bian |
| C Web, F AI feature | David |
| D Mobile (core), E Web ↔ Mobile, G Git | Fasya |
| D Mobile (UX), H Agents, I Design Doc, J Demo | Ramadhan |

Every member must be able to explain the whole flow of the section they own, not only the files they
typed.
