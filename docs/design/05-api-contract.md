# Design Document §5: API contract

Owner: Ramadhan. This page is the agreement between `backend/`, `src/` and `mobile-app/`. If the code
and this page disagree, the code is the bug and the whole team changes together. Implementation:
`backend/src/app.js`, field names: `backend/src/store.js`.

## 5.1 Basics

| Item | Value |
|---|---|
| Base URL (development) | `http://127.0.0.1:3000` |
| Base URL (deployed) | `https://midtermprojectcampusportal-production.up.railway.app` (`GET /` answers a JSON status) |
| Prefix | every route starts with `/api` |
| Request body | `application/json`, maximum 16 KB, only the fields listed below |
| Auth | `Authorization: Bearer <token>` on every route except `GET /api/health` and `POST /api/auth/login` |
| Token | JWT, HS256, subject = user id, issuer `campus-portal`, audience `campus-portal-clients`, **expires in 1 hour**, no refresh route — re-login when it expires |
| Caching | every `/api` response carries `Cache-Control: no-store` |
| Roles | `administrator` or `client` (a client is a student); read from the database on every request, never from the token |
| Time | `enrolledAt` is a date string, `YYYY-MM-DD` |

### Response envelopes

Success, one record or a list:

```json
{ "data": { } }
{ "data": [ ] }
```

Success, login:

```json
{ "token": "…", "tokenType": "Bearer", "expiresIn": 3600, "user": { } }
```

Success, nothing to return: `204 No Content`, empty body.

Failure:

```json
{ "error": { "code": "CONFLICT", "message": "This course is already full." } }
```

`code` is for the program, `message` is safe to show to a user. Both clients display `message`.

## 5.2 Error codes

| Status | `code` | When | Client action |
|---|---|---|---|
| 400 | `INVALID_INPUT` | missing/extra field, wrong type, value out of range, `status` not `approved`/`rejected`, body not an object | show `message` under the field |
| 400 | `INVALID_JSON` | body is not valid JSON | a bug in the client — log it |
| 401 | `INVALID_CREDENTIALS` | login with a wrong username or password | show `Invalid username or password.` |
| 401 | `UNAUTHENTICATED` | header missing, malformed, expired, or the account was deleted | clear the token, go to login |
| 403 | `FORBIDDEN` | the role cannot perform this action (a student calling an admin route) | hide the control instead of calling |
| 404 | `NOT_FOUND` | the record does not exist **or is not visible to this user** | show an empty/«not found» state |
| 404 | `NOT_FOUND` | unknown path under `/api` | a client bug |
| 409 | `CONFLICT` | duplicate enrollment, duplicate `(code, term)`, capacity reached, status already decided, deleting a linked record | show `message`, do not retry blindly |
| 413 | `BODY_TOO_LARGE` | body over 16 KB | a client bug |
| 502 | `AI_FAILED` / `AI_BAD_RESPONSE` | the AI provider errored or answered something unusable | show `message` and a retry button |
| 503 | `AI_UNAVAILABLE` / `AI_RATE_LIMITED` | AI key not configured / provider still busy after a retry and the fallback model | show `message`; the rest of the app still works |
| 504 | `AI_TIMEOUT` | the AI provider took longer than 25 s | show `message` and a retry button |
| 500 | `INTERNAL_ERROR` | an unexpected server error; details are logged on Railway, never returned | show a generic failure and a retry |

There is **no rate limiting** and **no password reset**. Both are outside this milestone.

## 5.3 Shared object shapes

`user` — a student (`role: "client"`):

```json
{
  "id": "u2", "username": "andi", "role": "client", "name": "Andi Pratama",
  "email": "andi.pratama@student.campus.edu", "studentId": "CS2023001",
  "program": "Computer Science", "year": 3
}
```

`user` — an administrator: the same keys, but `staffId`, `title`, `department` instead of
`studentId`, `program`, `year`. `password_hash` is **never** returned.

| Field | Type | Notes |
|---|---|---|
| `id` | string | `u1`… |
| `role` | string | `administrator` \| `client` |
| `studentId` | string | only clients |
| `staffId` | string | only administrators |
| `year` | integer \| null | only clients |

`course`:

```json
{
  "id": "c2", "code": "CS201", "title": "Data Structures", "credits": 4,
  "term": "2024/2025", "instructor": "Dr. Budi Hartono",
  "capacity": 35, "enrolled": 1
}
```

`enrolled` is **calculated**: the number of *approved* enrollments, not a stored column. A client
must never write it.

`enrollment` (`userId` is removed before the response):

```json
{
  "id": "e2", "studentId": "CS2023001", "studentName": "Andi Pratama",
  "courseId": "c3", "courseCode": "CS210", "courseTitle": "Discrete Mathematics",
  "credits": 3, "term": "2024/2025", "status": "pending", "enrolledAt": "2025-08-19"
}
```

| Field | Type | Notes |
|---|---|---|
| `status` | string | `pending` (new requests), `approved`, `rejected` |
| `studentId` | string | the university id (`CS2023001`), not the row id |
| `courseId` | string | use this to create or filter, never `courseCode` |

`grade`:

```json
{
  "id": "g2", "enrollmentId": "e1", "score": 79,
  "studentId": "CS2023001", "studentName": "Andi Pratama",
  "courseId": "c2", "courseCode": "CS201", "courseTitle": "Data Structures",
  "credits": 4, "term": "2024/2025", "letter": "B+", "points": 3.3
}
```

`score` is the only stored value. `letter` and `points` are computed on every response:
`A` ≥ 85 (4.0), `A-` ≥ 80 (3.7), `B+` ≥ 75 (3.3), `B` ≥ 70 (3.0), `B-` ≥ 65 (2.7), `C+` ≥ 60 (2.3),
`C` ≥ 55 (2.0), `C-` ≥ 50 (1.7), `D` ≥ 40 (1.0), otherwise `F` (0). GPA is credit-weighted from
`points` and is only returned by `GET /api/auth/me`.

## 5.4 Endpoints

### Health

| Method | Path | Who |
|---|---|---|
| GET | `/api/health` | public |

No auth, no body. `200`:

```json
{ "status": "ok", "database": "ok" }
```

It runs `SELECT 1`, so a database problem surfaces here rather than in a login attempt. `500` when the
database cannot be reached.

### Authentication

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any signed-in user |

**POST /api/auth/login** — request:

```json
{ "username": "andi", "password": "student123" }
```

`200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": { "id": "u2", "username": "andi", "role": "client", "name": "Andi Pratama", "…": "…" }
}
```

Errors: `400 INVALID_INPUT` (missing field, `username` over 80 characters, `password` over 72 UTF-8
bytes), `401 INVALID_CREDENTIALS` (same message whether the username or the password was wrong),
`400 INVALID_JSON`.

**GET /api/auth/me** — no body. `200` for a student:

```json
{ "user": { "id": "u2", "…": "…" }, "gpa": 3.6 }
```

For an administrator the `gpa` key is absent. `gpa` is `0` when the student has no grades yet.
Errors: `401 UNAUTHENTICATED`.

Clients call this once at start-up with the stored token: a `200` means "still signed in", a `401`
means "clear the token and show login".

### Students

| Method | Path | Who |
|---|---|---|
| GET | `/api/students` | administrator |

`200`: `{ "data": [ user, … ] }`, one entry per `role = "client"`, ordered by `studentId`.
Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`.

### Courses

| Method | Path | Who |
|---|---|---|
| GET | `/api/courses` | any signed-in user |
| GET | `/api/courses/:id` | any signed-in user |
| POST | `/api/courses` | administrator |
| PUT | `/api/courses/:id` | administrator |
| DELETE | `/api/courses/:id` | administrator |

**GET /api/courses** — `200`: `{ "data": [ course, … ] }`, ordered by `code`, `term`, `id`.

**GET /api/courses/:id** — `200`: `{ "data": course }`, `404 NOT_FOUND`.

**POST /api/courses** — request (all six fields required):

```json
{ "code": "CS410", "title": "Machine Learning", "credits": 3,
  "term": "2025/2026", "instructor": "Dr. Rina Marlina", "capacity": 30 }
```

`201` with the created `course` (including `"enrolled": 0`). Errors: `400 INVALID_INPUT` (`credits`
1–12 integer, `capacity` ≥ 1 integer, `code` ≤ 30 chars, `term` ≤ 40 chars, `title`/`instructor`
≤ 200), `409 CONFLICT` (the pair `code` + `term` already exists), `403 FORBIDDEN`.

**PUT /api/courses/:id** — same six fields, all required (a full replace, not a patch). `200` with the
updated `course`. Errors: `404 NOT_FOUND`, `409 CONFLICT` when the course already has enrollments and
`code`/`term` changed, or when `capacity` is lower than the approved count, `400 INVALID_INPUT`.

**DELETE /api/courses/:id** — `204`. Errors: `404 NOT_FOUND`, `409 CONFLICT` when the course has any
enrollment (`A course with enrollments cannot be deleted.`).

### Enrollments

| Method | Path | Who |
|---|---|---|
| GET | `/api/enrollments` | any signed-in user — a student sees only their own |
| GET | `/api/enrollments/:id` | any signed-in user — only their own |
| POST | `/api/enrollments` | **student only** |
| PATCH | `/api/enrollments/:id/status` | administrator |
| DELETE | `/api/enrollments/:id` | owner (pending only) or administrator (pending/rejected only) |

**GET /api/enrollments** — `200`: `{ "data": [ enrollment, … ] }`, ordered by `enrolledAt`, `id`.
A student's list is filtered by `student_id = <the user in the token>`; the administrator sees all.
There is no query parameter for this — a `?studentId=` is ignored.

**GET /api/enrollments/:id** — `200`: `{ "data": enrollment }`. Another student's id returns
`404 NOT_FOUND`, not `403`: the row must not even be confirmed to exist.

**POST /api/enrollments** — request:

```json
{ "courseId": "c4" }
```

`201`:

```json
{
  "data": {
    "id": "e-9f2c…", "studentId": "CS2023001", "studentName": "Andi Pratama",
    "courseId": "c4", "courseCode": "CS301", "courseTitle": "Design and Analysis of Algorithms",
    "credits": 3, "term": "2024/2025", "status": "pending", "enrolledAt": "2026-11-18"
  }
}
```

The student comes from the token; the body has **only** `courseId`. A new row is always `pending`.
Errors: `400 INVALID_INPUT`, `403 FORBIDDEN` (administrator), `404 NOT_FOUND` (unknown course),
`409 CONFLICT` — `You already have an enrollment request for this course and term.` or
`This course is already full.`

**PATCH /api/enrollments/:id/status** — request:

```json
{ "status": "approved" }
```

Only `approved` and `rejected` are accepted. `200` with the updated `enrollment`. Errors:
`400 INVALID_INPUT` (`status must be approved or rejected.`), `404 NOT_FOUND`,
`409 CONFLICT` (`Only pending enrollment requests can be approved or rejected.`,
`This course is already full.`).

**DELETE /api/enrollments/:id** — `204`. Rules, in order: `404` when not visible; `409` when the
enrollment has a grade (`An enrollment with a grade cannot be deleted.`); a student may delete only
`pending` rows, an administrator may delete only `pending` or `rejected` rows.

### Grades

| Method | Path | Who |
|---|---|---|
| GET | `/api/grades` | any signed-in user — a student sees only their own |
| GET | `/api/grades/:id` | any signed-in user — only their own |
| POST | `/api/grades` | administrator |
| PUT | `/api/grades/:id` | administrator |
| DELETE | `/api/grades/:id` | administrator |

**GET /api/grades** — `200`: `{ "data": [ grade, … ] }`. A student's list is filtered by the token;
another student's grade returns `404` from `GET /api/grades/:id`.

**POST /api/grades** — request:

```json
{ "enrollmentId": "e1", "score": 79 }
```

`201` with the created `grade` (`letter` and `points` included). `score` must be a number from 0 to
100 (decimals allowed). Errors: `400 INVALID_INPUT`, `403 FORBIDDEN`, `404 NOT_FOUND` (unknown
enrollment), `409 CONFLICT` — a grade requires an **approved** enrollment, and an enrollment can
have only one grade.

**PUT /api/grades/:id** — request `{ "score": 84 }` (only the score changes). `200` with the updated
`grade`. Errors: `400 INVALID_INPUT`, `404 NOT_FOUND`, `409 CONFLICT` when the enrollment is no longer
approved.

**DELETE /api/grades/:id** — `204`, `404 NOT_FOUND`.

### AI: at-risk student report (UC-8)

`POST /api/ai/at-risk-summary` — **administrator only** (a student gets `403 FORBIDDEN`).

Request: `{ "term": "2024/2025" }` (only this field; `400 INVALID_INPUT` otherwise).

Response `200`:

```json
{ "data": {
  "term": "2024/2025", "generatedAt": "2026-11-22T09:00:00.000Z", "aiGenerated": true,
  "overallSummary": "One of two students shows risk indicators this term.",
  "atRiskStudents": [
    { "studentId": "CS2023002", "studentName": "Bella Kusuma", "gpa": 3.0, "riskLevel": "medium",
      "reason": "Request for CS302 was rejected.", "recommendation": "Suggest an open 3-credit elective." }
  ]
} }
```

- `riskLevel` is `high` | `medium` | `low`; the list is sorted high → low.
- `studentName` and `gpa` come from the database, not from the model. Only students that exist are kept.
- No enrollments in that term → `aiGenerated: false`, empty list, provider not called.
- Clients must label `overallSummary`, `reason` and `recommendation` as **AI-generated**.
- Errors: `502 AI_FAILED`, `502 AI_BAD_RESPONSE`, `503 AI_UNAVAILABLE`, `503 AI_RATE_LIMITED`,
  `504 AI_TIMEOUT` (see 5.2). The AI call can take up to 25 s: show a loading state and disable the button.

## 5.5 Worked example (copy and paste)

Sign in as the student, read the scoped list, then request a seat:

```bash
API=http://127.0.0.1:3000

TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"andi","password":"student123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

curl -s "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/courses" -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/enrollments" -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$API/api/enrollments" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"courseId":"c4"}'
```

`GET /api/enrollments` as `andi` returns three rows (`CS101` and `CS201` approved, `CS210` pending).
As `bella` the same call returns five different rows, never `andi`'s.

## 5.6 Rules every client follows

1. All requests go through one wrapper: `src/lib/api.js` (web) or `mobile-app/src/lib/api.js`
   (phone). No screen calls `fetch` directly.
2. Send field names exactly as written here. `courseId`, not `course_id`; `enrolledAt`, not
   `enrolled_at`.
3. `401` → clear the token and show login. `409` → keep the user on the screen and show `message`
   under or next to the field. Never retry a `409` automatically.
4. The server decides which rows a user sees. Do not send your own user id to filter a list.
5. Read the token from storage on start-up and confirm it with `GET /api/auth/me` before rendering
   the app.
6. Allow for a slow first response: wait at least 20 seconds before reporting a network
   failure, then offer a retry.
7. `DELETE` returns `204` with no body — do not call `response.json()` on it.
