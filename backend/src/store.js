import { gradeForScore } from './grading.js'

export function safeUser(row) {
  const user = {
    id: row.id, username: row.username, role: row.role, name: row.name, email: row.email,
  }
  return row.role === 'client'
    ? { ...user, studentId: row.student_id, program: row.program, year: row.year }
    : { ...user, staffId: row.staff_id, title: row.title, department: row.department }
}

// db is the database or an open transaction: both expose get/all/run.
export function createStore(db) {
  const courseSelect = `SELECT c.*,
    (SELECT count(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'approved') AS enrolled
    FROM courses c`
  const enrollmentSelect = `SELECT e.id, u.student_id AS studentId, u.name AS studentName,
    c.id AS courseId, c.code AS courseCode, c.title AS courseTitle, c.credits, c.term,
    e.status, e.enrolled_at AS enrolledAt, e.student_id AS userId
    FROM enrollments e JOIN users u ON u.id = e.student_id JOIN courses c ON c.id = e.course_id`
  const gradeSelect = `SELECT g.id, g.enrollment_id AS enrollmentId, g.score,
    u.student_id AS studentId, u.name AS studentName, c.id AS courseId,
    c.code AS courseCode, c.title AS courseTitle, c.credits, c.term, e.student_id AS userId
    FROM grades g JOIN enrollments e ON e.id = g.enrollment_id
    JOIN users u ON u.id = e.student_id JOIN courses c ON c.id = e.course_id`

  // is_open is stored as 0/1; the API speaks camelCase booleans.
  function publicCourse(row) {
    if (!row) return row
    const { is_open: isOpen, ...rest } = row
    return { ...rest, isOpen: Boolean(isOpen) }
  }
  function publicEnrollment({ userId: _userId, ...row }) {
    return row
  }
  function publicGrade({ userId: _userId, ...row }) {
    return { ...row, ...gradeForScore(row.score) }
  }

  return {
    user: (id) => db.get('SELECT * FROM users WHERE id = ?', [id]),
    userByUsername: (username) => db.get('SELECT * FROM users WHERE lower(username) = lower(?)', [username]),
    students: async () => (await db.all("SELECT * FROM users WHERE role = 'client' ORDER BY student_id")).map(safeUser),
    courses: async () => (await db.all(`${courseSelect} ORDER BY c.code, c.term, c.id`)).map(publicCourse),
    course: async (id) => publicCourse(await db.get(`${courseSelect} WHERE c.id = ?`, [id])),
    enrollment: (id) => db.get(`${enrollmentSelect} WHERE e.id = ?`, [id]),
    // userId always comes from the verified token (req.user.id), never from the request.
    enrollments: async (userId) => (await db.all(`${enrollmentSelect}${userId ? ' WHERE e.student_id = ?' : ''}
      ORDER BY e.enrolled_at, e.id`, userId ? [userId] : [])).map(publicEnrollment),
    publicEnrollment,
    grade: (id) => db.get(`${gradeSelect} WHERE g.id = ?`, [id]),
    grades: async (userId) => (await db.all(`${gradeSelect}${userId ? ' WHERE e.student_id = ?' : ''}
      ORDER BY g.rowid`, userId ? [userId] : [])).map(publicGrade),
    publicGrade,
  }
}
