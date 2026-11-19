# Design Document — Campus Portal (Team 11)

Web & Mobile Application Development · Midterm project · Team 11: Bian Krisna, David Benz Susanto,
Mochamad Fasya Fadillah, Ramadhan Islamay Dermawan.

## Live system

| Part | URL | Status |
|---|---|---|
| Web app (GitHub Pages) | <https://group-11-campusportal.github.io/Midterm_Project_Campus_Portal/> | live |
| API (Render) | `https://campus-portal-api.onrender.com` (from `render.yaml`) | **not deployed yet** — task A4; `/api/health` does not answer |
| Phone app | not hosted; runs in Expo Go from `mobile-app/` | see `mobile-app/README.md` |
| Database | Turso, region nearest Singapore | created, not yet seeded from Render (A2–A3) |

The API sleeps after ~15 minutes on Render's free tier. The first request afterwards can take
30–60 seconds; the phone client waits 20 seconds and then offers a retry.

Seed accounts (present in every seeded database):

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Student | `andi` | `student123` |
| Student | `bella` | `student123` |

## 1. Overview

Campus Portal is one system with two clients and one source of truth. A student sees their own
enrollment requests and grades and can request a seat in a course. An administrator (registrar)
sees every request, approves or rejects pending ones, records a grade for an approved enrollment,
and manages course offerings. Both clients read the same rows from the same API and the same
database, so a request made on the phone appears in the browser on the next refresh.

## 2. Scope of this milestone (Week 13)

**In:** real login with a JWT, hostnames for the clients, every list and form on the web backed by
the API, the phone app reading the same API, a hosted database that survives a Render restart, and
one written contract that both clients follow.

**Out (stated, not hidden):** payments, file uploads, notifications, password reset, refresh tokens,
course management from the phone, an offline cache. Where the design would put these is recorded in
§4 (files) and §5 (errors).

## Document index

| § | File | Owner | Contents |
|---|---|---|---|
| 1–2, URLs | this page | Ramadhan | Live addresses, scope, accounts |
| 3 | [`03-architecture.md`](03-architecture.md) | Ramadhan | Components, ports, platforms, data flow, trust boundaries |
| 4 | [`04-data-model.md`](04-data-model.md) | Bian | Tables, rules, calculated values, where files would go |
| 5 | [`05-api-contract.md`](05-api-contract.md) | Ramadhan | Every endpoint: method, path, who, request, response, errors |
| 8 | [`08-division-of-work.md`](08-division-of-work.md) | Ramadhan | Who owns which layer and which rubric section |

## Screens

| Web route | Phone tab | Student sees | Administrator sees |
|---|---|---|---|
| `/login` | Login screen | login form | login form |
| `/dashboard` | Dashboard | own GPA, enrollments, course catalog | totals, pending requests, course table |
| `/form` | Enrollment form (modal) | enroll in a course | record a grade |
| `/output` | Enrollments / Grades | own submissions | all submissions and grades |
| anything else | — | 404 page | 404 page |

The web app uses `HashRouter`, phone screens use Expo Router tabs with a guarded stack
(logged out → login, logged in → tabs). Screen-level detail is in §5 (fields) and in
`docs/wireframes/`.
