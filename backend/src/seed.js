import bcrypt from 'bcryptjs'
import { fixtures } from './seed-data.js'

// Only an empty database is seeded. Never reset or replace existing records.
export function seedDatabase(db) {
  return db.transaction(() => {
    const total = ['users', 'courses', 'enrollments', 'grades'].reduce(
      (count, table) => count + db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count, 0,
    )
    if (total > 0) return { seeded: false, message: 'Database is not empty; all existing records were preserved.' }

    const addUser = db.prepare(`INSERT INTO users
      (id, username, password_hash, role, name, email, staff_id, title, department, student_id, program, year)
      VALUES (@id, @username, @passwordHash, @role, @name, @email, @staffId, @title, @department, @studentId, @program, @year)`)
    for (const user of fixtures.users) {
      addUser.run({
        staffId: null, title: null, department: null, studentId: null, program: null, year: null,
        ...user, passwordHash: bcrypt.hashSync(user.password, 12),
      })
    }
    const addCourse = db.prepare(`INSERT INTO courses (id, code, title, credits, term, instructor, capacity)
      VALUES (@id, @code, @title, @credits, @term, @instructor, @capacity)`)
    for (const course of fixtures.courses) addCourse.run(course)

    const addEnrollment = db.prepare(`INSERT INTO enrollments (id, student_id, course_id, status, enrolled_at)
      VALUES (?, ?, ?, ?, ?)`)
    for (const enrollment of fixtures.enrollments) {
      const user = fixtures.users.find((item) => item.studentId === enrollment.studentId)
      const course = fixtures.courses.find((item) => item.code === enrollment.courseCode && item.term === enrollment.term)
      addEnrollment.run(enrollment.id, user.id, course.id, enrollment.status, enrollment.enrolledAt)
    }
    const addGrade = db.prepare('INSERT INTO grades (id, enrollment_id, score) VALUES (?, ?, ?)')
    for (const grade of fixtures.grades) {
      const enrollment = fixtures.enrollments.find((item) => item.studentId === grade.studentId &&
        item.courseCode === grade.courseCode && item.term === grade.term && item.status === 'approved')
      addGrade.run(grade.id, enrollment.id, grade.score)
    }
    return { seeded: true, message: 'Seeded 3 accounts, 6 courses, 8 enrollments, and 4 grades.' }
  }).immediate()
}
