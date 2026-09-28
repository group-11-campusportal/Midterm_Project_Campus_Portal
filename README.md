# Campus Portal — Grades & Enrollment

A university campus portal built as the **Midterm (UTS)** project for Web &
Mobile Application Development. This stage is a **front-end only** React
application: every account and record is **hardcoded** in the source, with no
backend and no database. It is the first stage of a system that will later be
reconnected to a real backend and extended with a Client-only mobile app.

## What the app does

- **Simulated login** against a hardcoded user list, with role-based access.
- Two roles, exactly as the brief requires:
  - **Administrator** (registrar / academic staff) — management dashboard,
    records grades through the form, and views all grade records.
  - **Client (Student)** — personal dashboard with profile and GPA, enrolls in
    courses through the form, and views their own submissions.
- The same pages render **different content per role**; the menu also changes
  with the role.
- A shared **form output** page backed by state lifted to `App`, so multiple
  entries stack up and survive navigation.
- Loading, empty, validation, and error states.

## What the app does **not** do (yet)

- No backend / API (Express) — comes later in the course.
- No database (SQL) — all data is hardcoded.
- No real authentication or security (no hashing, tokens, or third-party auth).
- No mobile app — comes later.
- Data is **in memory only**: refreshing the page logs you out and resets the
  records you added. That is expected for this stage.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Client (Student) | `andi` | `student123` |
| Client (Student) | `bella` | `student123` |

## Run it

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Routes

| Route | Page | Notes |
|---|---|---|
| `/login` | Login | public |
| `/dashboard` | Dashboard | role-based content, login required |
| `/form` | Form | Record Grade (admin) / Enroll in Course (student) |
| `/output` | Form output | Grade Records (admin) / My Submissions (student) |
| anything else | 404 | |

The app uses `HashRouter`, and `vite.config.js` sets `base: './'`. Together these
mean any route can be refreshed (or opened directly) without a 404, which is
what GitHub Pages needs.

## Project structure

```
src/
├─ main.jsx, App.jsx, index.css     # entry, routing + shared state, global CSS
├─ data/                            # hardcoded data (single source of truth)
│  ├─ users.js        courses.js
│  ├─ enrollments.js  grades.js
├─ utils/grade.js                   # raw score -> letter/points, GPA
├─ layouts/MainLayout.jsx           # header + side menu + content + footer
├─ components/                      # reusable, prop-driven UI
│  ├─ Navbar, Sidebar, StatCard, DataTable,
│  │  StatusBadge, EmptyState, Spinner, ProtectedRoute
└─ pages/                           # Login, Dashboard, FormPage, FormOutput, NotFound
docs/                               # proposal deliverables (A1–A4)
├─ proposal.md  use-case.md  activity-diagram.md  wireframes.md
└─ wireframes/*.svg
```

## Grading rubric map

The midterm rubric has five sections. Where each is satisfied:

| Section | Where |
|---|---|
| **A1** actors & permission matrix | `docs/proposal.md` |
| **A2** use case diagram + written use case | `docs/use-case.md` |
| **A3** activity diagram (login → dashboard → form → output, failure branches) | `docs/activity-diagram.md` |
| **A4** UI wireframes (all pages) | `docs/wireframes.md` + `docs/wireframes/` |
| **B1** login, role-based | `src/pages/Login.jsx`, `src/data/users.js` |
| **B2** menu / routing, per-role menu, 404, protected pages | `src/App.jsx`, `src/components/Sidebar.jsx`, `ProtectedRoute.jsx`, `pages/NotFound.jsx` |
| **B3** dashboard from data with `map()` + keys, empty state | `src/pages/Dashboard.jsx`, `src/components/DataTable.jsx` |
| **B4** controlled form, `preventDefault`, validation | `src/pages/FormPage.jsx` |
| **B5** form output from lifted state | `src/pages/FormOutput.jsx`, state in `src/App.jsx` |
| **C1** components + props + state placement | `src/components/`, `src/layouts/`, state in `App` |
| **C2** semantic HTML, flexbox, responsive, separate CSS | `src/index.css`, `MainLayout.jsx` |
| **C3** hardcoded data in separate files with ids | `src/data/*.js` |
| **D1** repo, commits, README | this file + git history |
| **D2** GitHub Pages | `HashRouter` + `base: './'` (deploy steps below) |

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Build: `npm run build`.
3. Deploy the `dist/` folder to the `gh-pages` branch (for example with
   `npx gh-pages -d dist`), or use a GitHub Actions Pages workflow.
4. In the repository **Settings → Pages**, set the source to the `gh-pages`
   branch.
5. Open `https://<user>.github.io/<repo>/` and check that refreshing a deep
   route (e.g. `#/form`) still works.

`base: './'` and `HashRouter` are already configured, so no further changes are
needed for a project-page deployment.

## Team & suggested commit plan (D1)

The rubric wants real, incremental commits from **every** member. Split the work
by feature so each person can explain their own files (E2). Suggested sequence:

1. **M1 — setup & auth:** `chore: scaffold vite react app`, `feat: add
   hash router + protected routes`, `feat: build app shell (navbar + sidebar)`,
   `feat: add simulated role-based login`.
2. **M2 — data & dashboard:** `feat(data): add hardcoded users, courses,
   enrollments, grades`, `feat(ui): add stat card, data table, badge, empty
   state, spinner`, `feat(dashboard): add role-based dashboard`.
3. **M3 — form & output:** `feat(form): add controlled grade/enrollment form
   with validation`, `feat(state): lift data into App and add form output page`,
   `feat(utils): add raw-score grade scale and GPA helper`.
4. **M4 — quality & docs:** `style: add responsive global stylesheet`,
   `docs: add proposal, use case, activity diagram, wireframes`, `docs: write
   README`.

Each member should commit their own files under their own GitHub account.
