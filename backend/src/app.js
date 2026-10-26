import { randomUUID } from 'node:crypto'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { authenticate, issueToken, requireRole } from './auth.js'
import { ApiError, badRequest, conflict, notFound } from './errors.js'
import { fields, courseInput, scoreInput, text } from './validation.js'
import { createStore, safeUser } from './store.js'
import { gpaForGrades } from './grading.js'

// A missing username still performs a password comparison.
const dummyPasswordHash = bcrypt.hashSync('unused-account-password', 12)

export function createApp({ db, secret, origin = 'http://localhost:5173', logger = console.error }) {
  if (!secret || secret.length < 32) throw new Error('A JWT secret of at least 32 characters is required.')
  const app = express()
  const store = createStore(db)
  const admin = requireRole('administrator')
  const student = requireRole('client')
  app.disable('x-powered-by')
  app.use(cors({ origin, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'] }))
  app.use(express.json({ limit: '16kb' }))
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  app.get('/api/health', (req, res) => {
    db.prepare('SELECT 1').get()
    res.json({ status: 'ok', database: 'ok' })
  })

  app.post('/api/auth/login', async (req, res) => {
    fields(req.body, ['username', 'password'])
    const username = text(req.body.username, 'username', 80)
    const password = req.body.password
    if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      badRequest('password must be a non-empty string of at most 72 UTF-8 bytes.')
    }
    const user = store.userByUsername(username)
    const matches = await bcrypt.compare(password, user?.password_hash || dummyPasswordHash)
    if (!user || !matches) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.')
    res.json({ token: issueToken(user.id, secret), tokenType: 'Bearer', expiresIn: 3600, user: safeUser(user) })
  })

  app.use('/api', authenticate(store, secret))

  app.get('/api/auth/me', (req, res) => {
    const user = safeUser(req.user)
    res.json(req.user.role === 'client' ? { user, gpa: gpaForGrades(store.grades(req.user.id)) } : { user })
  })

  app.get('/api/students', admin, (req, res) => res.json({ data: store.students() }))

  app.get('/api/courses', (req, res) => res.json({ data: store.courses() }))
  app.get('/api/courses/:id', (req, res) => {
    const course = store.course(req.params.id)
    if (!course) notFound()
    res.json({ data: course })
  })
  app.post('/api/courses', admin, (req, res) => {
    const course = courseInput(req.body)
    const id = `c-${randomUUID()}`
    db.prepare(`INSERT INTO courses (id, code, title, credits, term, instructor, capacity)
      VALUES (@id, @code, @title, @credits, @term, @instructor, @capacity)`).run({ id, ...course })
    res.status(201).json({ data: store.course(id) })
  })
  app.put('/api/courses/:id', admin, (req, res) => {
    const input = courseInput(req.body)
    const course = db.transaction(() => {
      const previous = store.course(req.params.id)
      if (!previous) notFound()
      const hasEnrollments = db.prepare('SELECT 1 FROM enrollments WHERE course_id = ?').get(previous.id)
      if (hasEnrollments && (input.code !== previous.code || input.term !== previous.term)) {
        conflict('Course code and term cannot change after an enrollment exists.')
      }
      if (input.capacity < previous.enrolled) conflict('Capacity cannot be lower than the approved enrollment count.')
      db.prepare(`UPDATE courses SET code=@code, title=@title, credits=@credits, term=@term,
        instructor=@instructor, capacity=@capacity WHERE id=@id`).run({ id: previous.id, ...input })
      return store.course(previous.id)
    }).immediate()
    res.json({ data: course })
  })
  app.delete('/api/courses/:id', admin, (req, res) => {
    db.transaction(() => {
      if (!store.course(req.params.id)) notFound()
      if (db.prepare('SELECT 1 FROM enrollments WHERE course_id = ?').get(req.params.id)) {
        conflict('A course with enrollments cannot be deleted.')
      }
      db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id)
    }).immediate()
    res.status(204).end()
  })

  function visibleEnrollment(req) {
    const enrollment = store.enrollment(req.params.id)
    if (!enrollment || (req.user.role === 'client' && enrollment.userId !== req.user.id)) notFound()
    return enrollment
  }

  app.get('/api/enrollments', (req, res) => {
    res.json({ data: store.enrollments(req.user.role === 'client' ? req.user.id : null) })
  })
  app.get('/api/enrollments/:id', (req, res) => {
    res.json({ data: store.publicEnrollment(visibleEnrollment(req)) })
  })
  app.post('/api/enrollments', student, (req, res) => {
    fields(req.body, ['courseId'])
    const courseId = text(req.body.courseId, 'courseId', 100)
    const id = `e-${randomUUID()}`
    const enrollment = db.transaction(() => {
      const course = store.course(courseId)
      if (!course) notFound()
      if (db.prepare('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?').get(req.user.id, courseId)) {
        conflict('You already have an enrollment request for this course and term.')
      }
      if (course.enrolled >= course.capacity) conflict('This course is already full.')
      db.prepare('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)').run(id, req.user.id, courseId)
      return store.publicEnrollment(store.enrollment(id))
    }).immediate()
    res.status(201).json({ data: enrollment })
  })
  app.patch('/api/enrollments/:id/status', admin, (req, res) => {
    fields(req.body, ['status'])
    if (!['approved', 'rejected'].includes(req.body.status)) badRequest('status must be approved or rejected.')
    const enrollment = db.transaction(() => {
      const previous = store.enrollment(req.params.id)
      if (!previous) notFound()
      if (previous.status !== 'pending') conflict('Only pending enrollment requests can be approved or rejected.')
      const course = store.course(previous.courseId)
      if (req.body.status === 'approved' && course.enrolled >= course.capacity) conflict('This course is already full.')
      db.prepare('UPDATE enrollments SET status = ? WHERE id = ?').run(req.body.status, previous.id)
      return store.publicEnrollment(store.enrollment(previous.id))
    }).immediate()
    res.json({ data: enrollment })
  })
  app.delete('/api/enrollments/:id', (req, res) => {
    db.transaction(() => {
      const previous = visibleEnrollment(req)
      if (db.prepare('SELECT 1 FROM grades WHERE enrollment_id = ?').get(previous.id)) {
        conflict('An enrollment with a grade cannot be deleted.')
      }
      if (req.user.role === 'client' && previous.status !== 'pending') {
        conflict('Students can withdraw only pending enrollment requests.')
      }
      if (req.user.role === 'administrator' && previous.status === 'approved') {
        conflict('Only pending or rejected enrollment requests can be deleted.')
      }
      db.prepare('DELETE FROM enrollments WHERE id = ?').run(previous.id)
    }).immediate()
    res.status(204).end()
  })

  app.get('/api/grades', (req, res) => {
    res.json({ data: store.grades(req.user.role === 'client' ? req.user.id : null) })
  })
  app.get('/api/grades/:id', (req, res) => {
    const grade = store.grade(req.params.id)
    if (!grade || (req.user.role === 'client' && grade.userId !== req.user.id)) notFound()
    res.json({ data: store.publicGrade(grade) })
  })
  app.post('/api/grades', admin, (req, res) => {
    fields(req.body, ['enrollmentId', 'score'])
    const enrollmentId = text(req.body.enrollmentId, 'enrollmentId', 100)
    const score = scoreInput(req.body.score)
    const id = `g-${randomUUID()}`
    const grade = db.transaction(() => {
      const enrollment = store.enrollment(enrollmentId)
      if (!enrollment) notFound()
      if (enrollment.status !== 'approved') conflict('Grades require an approved enrollment.')
      db.prepare('INSERT INTO grades (id, enrollment_id, score) VALUES (?, ?, ?)').run(id, enrollmentId, score)
      return store.publicGrade(store.grade(id))
    }).immediate()
    res.status(201).json({ data: grade })
  })
  app.put('/api/grades/:id', admin, (req, res) => {
    fields(req.body, ['score'])
    const score = scoreInput(req.body.score)
    const grade = db.transaction(() => {
      const previous = store.grade(req.params.id)
      if (!previous) notFound()
      if (store.enrollment(previous.enrollmentId).status !== 'approved') conflict('Grades require an approved enrollment.')
      db.prepare('UPDATE grades SET score = ? WHERE id = ?').run(score, previous.id)
      return store.publicGrade(store.grade(previous.id))
    }).immediate()
    res.json({ data: grade })
  })
  app.delete('/api/grades/:id', admin, (req, res) => {
    const result = db.prepare('DELETE FROM grades WHERE id = ?').run(req.params.id)
    if (!result.changes) notFound()
    res.status(204).end()
  })

  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint was not found.')))
  // Express identifies error middleware by its four parameters.
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } })
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'The request body must contain valid JSON.' } })
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'The request body exceeds 16 KB.' } })
    }
    if (['SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY', 'SQLITE_CONSTRAINT_FOREIGNKEY'].includes(error.code)) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists or is linked to another record.' } })
    }
    if (['SQLITE_CONSTRAINT_CHECK', 'SQLITE_CONSTRAINT_NOTNULL'].includes(error.code)) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'The record violates a data constraint.' } })
    }
    logger(error)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } })
  })
  return app
}
