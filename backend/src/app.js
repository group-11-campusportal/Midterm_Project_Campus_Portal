import { randomUUID } from 'node:crypto'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { authenticate, issueToken, requireRole } from './auth.js'
import { ApiError, badRequest, conflict, notFound } from './errors.js'
import { fields, courseInput, scoreInput, text } from './validation.js'
import { createStore, safeUser } from './store.js'
import { gpaForGrades } from './grading.js'
import { checkedReport, createGeminiAdvisor, riskFacts } from './ai.js'

// A missing username still performs a password comparison.
const dummyPasswordHash = bcrypt.hashSync('unused-account-password', 12)

// libsql reports SQLITE_CONSTRAINT plus an extended code locally; the hosted database may only
// send the SQLite message, so both are checked.
function constraintKind(error) {
  const code = [error.extendedCode, error.code].find((value) => /^SQLITE_CONSTRAINT_/.test(value || ''))
  if (code) return code.replace('SQLITE_CONSTRAINT_', '')
  if (!/SQLITE_CONSTRAINT/.test(`${error.code} ${error.message}`)) return null
  const match = /(UNIQUE|FOREIGN KEY|CHECK|NOT NULL) constraint failed/.exec(error.message || '')
  return match ? match[1].replace(' ', '') : null
}

export function createApp({ db, secret, origin = 'http://localhost:5173', logger = console.error,
  advisor = createGeminiAdvisor({ logger }) }) {
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

  // The bare domain answers too, so opening the API URL in a browser does not look broken.
  app.get('/', (req, res) => {
    res.json({ name: 'Campus Portal API', status: 'ok', health: '/api/health', docs: 'docs/design/05-api-contract.md' })
  })

  app.get('/api/health', async (req, res) => {
    await db.get('SELECT 1 AS ok')
    res.json({ status: 'ok', database: 'ok' })
  })

  app.post('/api/auth/login', async (req, res) => {
    fields(req.body, ['username', 'password'])
    const username = text(req.body.username, 'username', 80)
    const password = req.body.password
    if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      badRequest('password must be a non-empty string of at most 72 UTF-8 bytes.')
    }
    const user = await store.userByUsername(username)
    const matches = await bcrypt.compare(password, user?.password_hash || dummyPasswordHash)
    if (!user || !matches) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.')
    res.json({ token: issueToken(user.id, secret), tokenType: 'Bearer', expiresIn: 3600, user: safeUser(user) })
  })

  app.use('/api', authenticate(store, secret))

  app.get('/api/auth/me', async (req, res) => {
    const user = safeUser(req.user)
    res.json(req.user.role === 'client' ? { user, gpa: gpaForGrades(await store.grades(req.user.id)) } : { user })
  })

  app.get('/api/students', admin, async (req, res) => res.json({ data: await store.students() }))

  app.get('/api/courses', async (req, res) => res.json({ data: await store.courses() }))
  app.get('/api/courses/:id', async (req, res) => {
    const course = await store.course(req.params.id)
    if (!course) notFound()
    res.json({ data: course })
  })
  app.post('/api/courses', admin, async (req, res) => {
    const course = courseInput(req.body)
    const id = `c-${randomUUID()}`
    await db.run(`INSERT INTO courses (id, code, title, credits, term, instructor, capacity)
      VALUES (@id, @code, @title, @credits, @term, @instructor, @capacity)`, { id, ...course })
    res.status(201).json({ data: await store.course(id) })
  })
  app.put('/api/courses/:id', admin, async (req, res) => {
    const input = courseInput(req.body)
    const course = await db.transaction(async (tx) => {
      const inTx = createStore(tx)
      const previous = await inTx.course(req.params.id)
      if (!previous) notFound()
      const hasEnrollments = await tx.get('SELECT 1 FROM enrollments WHERE course_id = ?', [previous.id])
      if (hasEnrollments && (input.code !== previous.code || input.term !== previous.term)) {
        conflict('Course code and term cannot change after an enrollment exists.')
      }
      if (input.capacity < previous.enrolled) conflict('Capacity cannot be lower than the approved enrollment count.')
      await tx.run(`UPDATE courses SET code=@code, title=@title, credits=@credits, term=@term,
        instructor=@instructor, capacity=@capacity WHERE id=@id`, { id: previous.id, ...input })
      return inTx.course(previous.id)
    })
    res.json({ data: course })
  })
  app.delete('/api/courses/:id', admin, async (req, res) => {
    await db.transaction(async (tx) => {
      if (!await createStore(tx).course(req.params.id)) notFound()
      if (await tx.get('SELECT 1 FROM enrollments WHERE course_id = ?', [req.params.id])) {
        conflict('A course with enrollments cannot be deleted.')
      }
      await tx.run('DELETE FROM courses WHERE id = ?', [req.params.id])
    })
    res.status(204).end()
  })

  // Ownership is decided by req.user (loaded from the token's subject), never by a client-sent id.
  async function visibleEnrollment(req, source = store) {
    const enrollment = await source.enrollment(req.params.id)
    if (!enrollment || (req.user.role === 'client' && enrollment.userId !== req.user.id)) notFound()
    return enrollment
  }

  app.get('/api/enrollments', async (req, res) => {
    res.json({ data: await store.enrollments(req.user.role === 'client' ? req.user.id : null) })
  })
  app.get('/api/enrollments/:id', async (req, res) => {
    res.json({ data: store.publicEnrollment(await visibleEnrollment(req)) })
  })
  app.post('/api/enrollments', student, async (req, res) => {
    fields(req.body, ['courseId'])
    const courseId = text(req.body.courseId, 'courseId', 100)
    const id = `e-${randomUUID()}`
    const enrollment = await db.transaction(async (tx) => {
      const inTx = createStore(tx)
      const course = await inTx.course(courseId)
      if (!course) notFound()
      if (await tx.get('SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?', [req.user.id, courseId])) {
        conflict('You already have an enrollment request for this course and term.')
      }
      if (course.enrolled >= course.capacity) conflict('This course is already full.')
      await tx.run('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)', [id, req.user.id, courseId])
      return inTx.publicEnrollment(await inTx.enrollment(id))
    })
    res.status(201).json({ data: enrollment })
  })
  app.patch('/api/enrollments/:id/status', admin, async (req, res) => {
    fields(req.body, ['status'])
    if (!['approved', 'rejected'].includes(req.body.status)) badRequest('status must be approved or rejected.')
    const enrollment = await db.transaction(async (tx) => {
      const inTx = createStore(tx)
      const previous = await inTx.enrollment(req.params.id)
      if (!previous) notFound()
      if (previous.status !== 'pending') conflict('Only pending enrollment requests can be approved or rejected.')
      const course = await inTx.course(previous.courseId)
      if (req.body.status === 'approved' && course.enrolled >= course.capacity) conflict('This course is already full.')
      await tx.run('UPDATE enrollments SET status = ? WHERE id = ?', [req.body.status, previous.id])
      return inTx.publicEnrollment(await inTx.enrollment(previous.id))
    })
    res.json({ data: enrollment })
  })
  app.delete('/api/enrollments/:id', async (req, res) => {
    await db.transaction(async (tx) => {
      const previous = await visibleEnrollment(req, createStore(tx))
      if (await tx.get('SELECT 1 FROM grades WHERE enrollment_id = ?', [previous.id])) {
        conflict('An enrollment with a grade cannot be deleted.')
      }
      if (req.user.role === 'client' && previous.status !== 'pending') {
        conflict('Students can withdraw only pending enrollment requests.')
      }
      if (req.user.role === 'administrator' && previous.status === 'approved') {
        conflict('Only pending or rejected enrollment requests can be deleted.')
      }
      await tx.run('DELETE FROM enrollments WHERE id = ?', [previous.id])
    })
    res.status(204).end()
  })

  app.get('/api/grades', async (req, res) => {
    res.json({ data: await store.grades(req.user.role === 'client' ? req.user.id : null) })
  })
  app.get('/api/grades/:id', async (req, res) => {
    const grade = await store.grade(req.params.id)
    if (!grade || (req.user.role === 'client' && grade.userId !== req.user.id)) notFound()
    res.json({ data: store.publicGrade(grade) })
  })
  app.post('/api/grades', admin, async (req, res) => {
    fields(req.body, ['enrollmentId', 'score'])
    const enrollmentId = text(req.body.enrollmentId, 'enrollmentId', 100)
    const score = scoreInput(req.body.score)
    const id = `g-${randomUUID()}`
    const grade = await db.transaction(async (tx) => {
      const inTx = createStore(tx)
      const enrollment = await inTx.enrollment(enrollmentId)
      if (!enrollment) notFound()
      if (enrollment.status !== 'approved') conflict('Grades require an approved enrollment.')
      await tx.run('INSERT INTO grades (id, enrollment_id, score) VALUES (?, ?, ?)', [id, enrollmentId, score])
      return inTx.publicGrade(await inTx.grade(id))
    })
    res.status(201).json({ data: grade })
  })
  app.put('/api/grades/:id', admin, async (req, res) => {
    fields(req.body, ['score'])
    const score = scoreInput(req.body.score)
    const grade = await db.transaction(async (tx) => {
      const inTx = createStore(tx)
      const previous = await inTx.grade(req.params.id)
      if (!previous) notFound()
      if ((await inTx.enrollment(previous.enrollmentId)).status !== 'approved') conflict('Grades require an approved enrollment.')
      await tx.run('UPDATE grades SET score = ? WHERE id = ?', [score, previous.id])
      return inTx.publicGrade(await inTx.grade(previous.id))
    })
    res.json({ data: grade })
  })
  app.delete('/api/grades/:id', admin, async (req, res) => {
    const result = await db.run('DELETE FROM grades WHERE id = ?', [req.params.id])
    if (!result.changes) notFound()
    res.status(204).end()
  })

  // AI (UC-8). Admin only. The client sends a term; the facts come from the database and the
  // provider key stays in the server environment (GEMINI_API_KEY).
  app.post('/api/ai/at-risk-summary', admin, async (req, res) => {
    fields(req.body, ['term'])
    const term = text(req.body.term, 'term', 20)
    const facts = await riskFacts(db, term)
    const generatedAt = new Date().toISOString()
    if (!facts.length) {
      return res.json({ data: { term, generatedAt, aiGenerated: false,
        overallSummary: `No students have enrollments in term ${term}.`, atRiskStudents: [] } })
    }
    const report = checkedReport(await advisor(term, facts), facts)
    res.json({ data: { term, generatedAt, aiGenerated: true, ...report } })
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
    const constraint = constraintKind(error)
    if (['UNIQUE', 'PRIMARYKEY', 'FOREIGNKEY'].includes(constraint)) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists or is linked to another record.' } })
    }
    if (['CHECK', 'NOTNULL'].includes(constraint)) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'The record violates a data constraint.' } })
    }
    logger(error)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } })
  })
  return app
}
