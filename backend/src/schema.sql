CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'client')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  staff_id TEXT,
  title TEXT,
  department TEXT,
  student_id TEXT UNIQUE,
  program TEXT,
  year INTEGER CHECK (year IS NULL OR year >= 1),
  CHECK (role != 'client' OR student_id IS NOT NULL)
);

-- Each row represents a course offering in one term.
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (typeof(credits) = 'integer' AND credits BETWEEN 1 AND 12),
  term TEXT NOT NULL,
  instructor TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (typeof(capacity) = 'integer' AND capacity >= 1),
  UNIQUE (code, term)
);

CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  enrolled_at TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE (student_id, course_id)
);

CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE RESTRICT,
  score REAL NOT NULL CHECK (typeof(score) IN ('integer', 'real') AND score BETWEEN 0 AND 100)
);

CREATE INDEX enrollments_course_status ON enrollments(course_id, status);
CREATE INDEX grades_enrollment ON grades(enrollment_id);
PRAGMA user_version = 1;
