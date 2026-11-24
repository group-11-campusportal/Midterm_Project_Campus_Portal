# Design Document §4: Data model

Owner: Bian. Source of truth: [`backend/src/schema.sql`](../../backend/src/schema.sql). If the two disagree, the schema wins and this page is wrong.

## Where the data lives

| Environment | Engine | Location |
|---|---|---|
| Development | SQLite file through `@libsql/client` | `backend/data/campus.db` (git-ignored) |
| Production | Turso (hosted libSQL) | `TURSO_DATABASE_URL`, set only in Railway Variables |

The same SQL runs in both. The service disk is not persistent, so nothing is stored on the server itself.

## Tables

```
users 1 ──< enrollments >── 1 courses
                 1
                 │
                 0..1
               grades
```

### users
| Column | Type | Rules |
|---|---|---|
| `id` | TEXT | primary key |
| `username` | TEXT | required, unique |
| `password_hash` | TEXT | required; bcrypt (cost 12), never returned by the API |
| `role` | TEXT | `administrator` or `client` |
| `name` | TEXT | required |
| `email` | TEXT | required, unique |
| `staff_id`, `title`, `department` | TEXT | administrators only |
| `student_id` | TEXT | unique; required when `role = 'client'` |
| `program` | TEXT | students only |
| `year` | INTEGER | null or ≥ 1 |

### courses (one row = one course offering in one term)
| Column | Type | Rules |
|---|---|---|
| `id` | TEXT | primary key |
| `code` | TEXT | required; unique together with `term` |
| `title` | TEXT | required |
| `credits` | INTEGER | 1 to 12 |
| `term` | TEXT | required |
| `instructor` | TEXT | required |
| `capacity` | INTEGER | ≥ 1 |

### enrollments
| Column | Type | Rules |
|---|---|---|
| `id` | TEXT | primary key |
| `student_id` | TEXT | → `users.id`, delete restricted |
| `course_id` | TEXT | → `courses.id`, delete restricted |
| `status` | TEXT | `pending` (default), `approved`, `rejected` |
| `enrolled_at` | TEXT | ISO date, defaults to today |
| | | one row per (`student_id`, `course_id`) |

### grades
| Column | Type | Rules |
|---|---|---|
| `id` | TEXT | primary key |
| `enrollment_id` | TEXT | → `enrollments.id`, unique (one grade per enrollment), delete restricted |
| `score` | REAL | 0 to 100 |

### schema_version
One row holding the schema version (currently `1`). The server refuses to start against a version it does not know.

Indexes: `enrollments(course_id, status)`, `grades(enrollment_id)`.

## Values that are calculated, not stored

- **Letter grade and grade points** come from `score` (`backend/src/grading.js`, same scale as the web app).
- **GPA** is the credit-weighted average of a student's grade points, calculated per request.
- **Seats taken** (`enrolled`) is the count of *approved* enrollments for the course.

Storing only the raw score means these can never disagree with each other.

## Rules enforced by the database and API

- A course with enrollments cannot be deleted, and its code/term cannot change.
- A grade needs an approved enrollment; an enrollment with a grade cannot be deleted.
- Approving is refused when the course is full; capacity cannot drop below the approved count.
- Students only ever read rows where `enrollments.student_id` equals the user id in their token.

## Where files would be stored

The system stores no files today. If one is added (student photo, transcript PDF, enrollment proof):

- The **file bytes** go to object storage (for example Cloudinary or Supabase Storage). They cannot go on the API service's disk (not persistent) and should not go in the database (Turso rows are meant for small values).
- The **database** keeps one row per file in a new `files` table: `id`, `owner_id → users.id`, `kind`, `storage_key`, `mime_type`, `size_bytes`, `created_at`.
- **Upload flow:** the client asks the API for permission, the API checks the token and returns a short-lived signed upload URL, the client uploads straight to storage, then the API saves the row. The storage secret stays in the backend environment only.
- **Download flow:** the API checks that the requester owns the file (or is an administrator) and returns a short-lived signed URL. Storage URLs are never public.
