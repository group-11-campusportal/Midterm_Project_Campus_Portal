import bcrypt from 'bcryptjs'
import { fixtures } from './seed-data.js'

// Only an empty database is seeded. Never reset or replace existing records.
export async function seedDatabase(db) {
  // Hash before the transaction opens so the write lock is held as briefly as possible.
  const users = fixtures.users.map(({ password, ...user }) => ({
    staffId: null, title: null, department: null, studentId: null, program: null, year: null,
    ...user, passwordHash: bcrypt.hashSync(password, 12),
  }))
  return db.transaction(async (tx) => {
    let total = 0
    for (const table of ['users', 'courses', 'enrollments', 'grades']) {
      total += (await tx.get(`SELECT count(*) AS count FROM ${table}`)).count
    }
    if (total > 0) return { seeded: false, message: 'Database is not empty; all existing records were preserved.' }

    for (const user of users) {
      await tx.run(`INSERT INTO users
        (id, username, password_hash, role, name, email, staff_id, title, department, student_id, program, year)
        VALUES (@id, @username, @passwordHash, @role, @name, @email, @staffId, @title, @department, @studentId, @program, @year)`, user)
    }
    for (const course of fixtures.courses) {
      await tx.run(`INSERT INTO courses (id, code, title, credits, term, instructor, capacity)
        VALUES (@id, @code, @title, @credits, @term, @instructor, @capacity)`, course)
    }
    for (const enrollment of fixtures.enrollments) {
      const user = fixtures.users.find((item) => item.studentId === enrollment.studentId)
      const course = fixtures.courses.find((item) => item.code === enrollment.courseCode && item.term === enrollment.term)
      await tx.run(`INSERT INTO enrollments (id, student_id, course_id, status, enrolled_at)
        VALUES (?, ?, ?, ?, ?)`, [enrollment.id, user.id, course.id, enrollment.status, enrollment.enrolledAt])
    }
    for (const grade of fixtures.grades) {
      const enrollment = fixtures.enrollments.find((item) => item.studentId === grade.studentId &&
        item.courseCode === grade.courseCode && item.term === grade.term && item.status === 'approved')
      await tx.run('INSERT INTO grades (id, enrollment_id, score) VALUES (?, ?, ?)', [grade.id, enrollment.id, grade.score])
    }
    return { seeded: true, message: 'Seeded 3 accounts, 6 courses, 8 enrollments, and 4 grades.' }
  })
}
