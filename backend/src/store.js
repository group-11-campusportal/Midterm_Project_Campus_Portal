import { gradeForScore } from './grading.js'

export function safeUser(row) {
  const user = {
    id: row.id, username: row.username, role: row.role, name: row.name, email: row.email,
  }
  return row.role === 'client'
    ? { ...user, studentId: row.student_id, program: row.program, year: row.year }
    : { ...user, staffId: row.staff_id, title: row.title, department: row.department }
}

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

  function publicEnrollment({ userId: _userId, ...row }) {
    return row
  }
  function publicGrade({ userId: _userId, ...row }) {
    return { ...row, ...gradeForScore(row.score) }
  }

  return {
    user: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
    userByUsername: (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username),
    students: () => db.prepare("SELECT * FROM users WHERE role = 'client' ORDER BY student_id").all().map(safeUser),
    courses: () => db.prepare(`${courseSelect} ORDER BY c.code, c.term, c.id`).all(),
    course: (id) => db.prepare(`${courseSelect} WHERE c.id = ?`).get(id),
    enrollment: (id) => db.prepare(`${enrollmentSelect} WHERE e.id = ?`).get(id),
    enrollments: (userId) => db.prepare(`${enrollmentSelect}${userId ? ' WHERE e.student_id = ?' : ''}
      ORDER BY e.enrolled_at, e.id`).all(...(userId ? [userId] : [])).map(publicEnrollment),
    publicEnrollment,
    grade: (id) => db.prepare(`${gradeSelect} WHERE g.id = ?`).get(id),
    grades: (userId) => db.prepare(`${gradeSelect}${userId ? ' WHERE e.student_id = ?' : ''}
      ORDER BY g.rowid`).all(...(userId ? [userId] : [])).map(publicGrade),
    publicGrade,
  }
}
