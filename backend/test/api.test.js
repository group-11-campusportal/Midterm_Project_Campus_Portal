import { after, afterEach, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { createClient } from '@libsql/client'
import { migrations, openDatabase } from '../src/database.js'
import { seedDatabase } from '../src/seed.js'
import { createApp } from '../src/app.js'
import { issueToken } from '../src/auth.js'
import { loadConfig, databaseConfig, databasePath, backendDirectory } from '../src/config.js'
import { gradeForScore, gpaForGrades } from '../src/grading.js'
import { toLetterGrade, computeGpa } from '../../src/utils/grade.js'

const secret = 'test-only-secret-0123456789abcdef0123456789abcdef'
const courseBody = {
  code: 'CS999', title: 'API Testing', credits: 3, term: '2026/2027',
  instructor: 'Test Lecturer', capacity: 1,
}
let directory, template, db, app, dbPath
const users = { admin: 'u1', andi: 'u2', bella: 'u3' }

before(async () => {
  directory = mkdtempSync(join(tmpdir(), 'campus-portal-test-'))
  template = join(directory, 'template.db')
  const initial = await openDatabase({ path: template })
  await seedDatabase(initial)
  initial.close()
})
beforeEach(async () => {
  dbPath = join(directory, 'current.db')
  copyFileSync(template, dbPath)
  db = await openDatabase({ path: dbPath })
  app = createApp({ db, secret, logger: (error) => { throw error } })
})
afterEach(() => db.close())
after(() => {
  try {
    rmSync(directory, { recursive: true, force: true })
  } catch {}
})

function api(method, path, role = 'admin') {
  return request(app)[method](`/api${path}`).set('Authorization', `Bearer ${issueToken(users[role], secret)}`)
}
async function newCourse(overrides = {}) {
  const response = await api('post', '/courses').send({ ...courseBody, ...overrides }).expect(201)
  return response.body.data
}
async function enroll(courseId, role = 'andi') {
  const response = await api('post', '/enrollments', role).send({ courseId }).expect(201)
  return response.body.data
}

test('health is public and CORS preflight supports the configured frontend', async () => {
  await request(app).get('/api/health').expect(200, { status: 'ok', database: 'ok' })
  const response = await request(app).options('/api/courses')
    .set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET').expect(204)
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173')
  const otherOrigin = await request(app).options('/api/courses')
    .set('Origin', 'https://other.example').set('Access-Control-Request-Method', 'GET').expect(204)
  assert.notEqual(otherOrigin.headers['access-control-allow-origin'], 'https://other.example')
})

test('all seeded accounts log in; passwords are hashed and never returned', async () => {
  for (const [username, password, id] of [
    ['admin', 'admin123', 'u1'], ['andi', 'student123', 'u2'], ['bella', 'student123', 'u3'],
  ]) {
    const response = await request(app).post('/api/auth/login').send({ username, password }).expect(200)
    assert.equal(response.body.user.id, id)
    assert.equal(response.body.expiresIn, 3600)
    assert.equal(response.body.tokenType, 'Bearer')
    assert.equal(response.body.user.password, undefined)
    assert.equal(response.body.user.password_hash, undefined)
    const claims = jwt.verify(response.body.token, secret, {
      algorithms: ['HS256'], issuer: 'campus-portal', audience: 'campus-portal-clients',
    })
    assert.equal(claims.sub, id)
    assert.equal(claims.exp - claims.iat, 3600)
    const stored = await db.get('SELECT password_hash FROM users WHERE id = ?', [id])
    assert.notEqual(stored.password_hash, password)
    assert.ok(bcrypt.compareSync(password, stored.password_hash))
  }
})

test('login rejects wrong credentials, SQL injection, missing fields, and role spoofing', async () => {
  for (const body of [
    { username: 'admin', password: 'wrong' }, { username: 'missing', password: 'wrong' },
    { username: "admin' OR 1=1 --", password: 'wrong' },
  ]) {
    const response = await request(app).post('/api/auth/login').send(body).expect(401)
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS')
  }
  for (const body of [{}, { username: 'admin', password: '' },
    { username: 12, password: 'admin123' }, { username: 'admin', password: 'a'.repeat(73) },
    { username: 'admin', password: 'admin123', role: 'administrator' }]) {
    await request(app).post('/api/auth/login').send(body).expect(400)
  }
})

const register = () => request(app).post('/api/auth/register')
const signUp = (overrides = {}) => register().send({
  username: 'budi', email: 'budi@student.campus.edu', password: 'Password!23', ...overrides,
})

test('sign-up creates a student that can log in and only sees their own rows', async () => {
  const response = await signUp({ username: ' Budi.S ', email: ' Budi.S@Student.Campus.edu ' }).expect(201)
  const { user, token } = response.body
  assert.equal(user.role, 'client')
  assert.equal(user.username, 'budi.s')
  assert.equal(user.email, 'budi.s@student.campus.edu')
  assert.match(user.studentId, /^ST[0-9A-F]{10}$/)
  assert.equal(user.password_hash, undefined)
  const stored = await db.get('SELECT password_hash FROM users WHERE id = ?', [user.id])
  assert.ok(bcrypt.compareSync('Password!23', stored.password_hash))
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200)
  assert.equal(me.body.gradedCount, 0)
  const own = await request(app).get('/api/enrollments').set('Authorization', `Bearer ${token}`).expect(200)
  assert.deepEqual(own.body.data, [])
  await request(app).get('/api/students').set('Authorization', `Bearer ${token}`).expect(403)
  await request(app).post('/api/auth/login').send({ username: 'Budi.S', password: 'Password!23' }).expect(200)
})

test('sign-up rejects taken usernames and emails, bad input and role spoofing', async () => {
  await signUp().expect(201)
  for (const overrides of [
    { username: 'andi', email: 'new1@student.campus.edu' }, { username: 'ANDI', email: 'new2@student.campus.edu' },
    { username: 'budi', email: 'new3@student.campus.edu' }, { username: 'carla', email: 'BUDI@student.campus.edu' },
    { username: 'carla', email: 'andi.pratama@student.campus.edu' },
  ]) {
    const taken = await signUp(overrides).expect(409)
    assert.equal(taken.body.error.code, 'CONFLICT')
  }
  const carla = { username: 'carla', email: 'carla@student.campus.edu' }
  for (const overrides of [
    { username: 'ab' }, { username: 'has space' }, { username: 12 },
    { email: 'carla@gmail.com' }, { email: 'carla@campus.edu' }, { email: 'carla@student.campus.edu.evil.com' },
    { email: 'not-an-email' }, { email: '' }, { email: 5 },
    { password: 'short' }, { password: 'A!' + 'a'.repeat(71) }, { password: 'password!23' },
    { password: 'Password123' }, { password: 'Pass word1' }, { role: 'administrator' },
  ]) {
    await signUp({ ...carla, ...overrides }).expect(400)
  }
  for (const body of [{}, { username: 'carla', password: 'Password!23' }]) await register().send(body).expect(400)
  assert.equal(await db.get("SELECT 1 FROM users WHERE username = 'carla'"), undefined)
})

test('sign-ups are limited per network with 429', async () => {
  app = createApp({ db, secret, logger: (error) => { throw error }, limits: { register: { max: 2, windowMs: 60000 } } })
  for (const username of ['one1', 'two2']) await signUp({ username, email: `${username}@student.campus.edu` }).expect(201)
  const blocked = await signUp({ username: 'three', email: 'three@student.campus.edu' }).expect(429)
  assert.ok(Number(blocked.headers['retry-after']) > 0)
})

test('missing, tampered, expired, wrong-algorithm and wrong-audience tokens are rejected', async () => {
  await request(app).get('/api/courses').expect(401)
  const valid = issueToken('u1', secret)
  const payload = { sub: 'u1', iss: 'campus-portal', aud: 'campus-portal-clients' }
  for (const token of [
    'not-a-token', `${valid.slice(0, 10)}x${valid.slice(11)}`,
    jwt.sign(payload, secret, { expiresIn: -1 }),
    jwt.sign(payload, secret, { algorithm: 'HS384' }),
    jwt.sign({ ...payload, aud: 'another-app' }, secret),
    jwt.sign({ ...payload, sub: 'nonexistent-account' }, secret),
    jwt.sign({ ...payload, iss: 'another-issuer' }, secret),
  ]) {
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401)
  }
})

test('student profile has credit-weighted GPA; admin can list students without credentials', async () => {
  const profile = await api('get', '/auth/me', 'andi').expect(200)
  assert.equal(profile.body.user.studentId, 'CS2023001')
  assert.ok(Math.abs(profile.body.gpa - (4 * 3 + 3.3 * 4) / 7) < 1e-12)
  const students = await api('get', '/students').expect(200)
  assert.equal(students.body.data.length, 2)
  assert.ok(!JSON.stringify(students.body).includes('password'))
})

test('database role overrides token role; students cannot use administrator actions', async () => {
  const forgedRole = jwt.sign({ role: 'administrator' }, secret, {
    subject: 'u2', issuer: 'campus-portal', audience: 'campus-portal-clients', expiresIn: '1h',
  })
  await request(app).get('/api/students').set('Authorization', `Bearer ${forgedRole}`).expect(403)
  for (const [method, path, body] of [
    ['get', '/students'], ['post', '/courses', courseBody], ['put', '/courses/c1', courseBody],
    ['delete', '/courses/c1'], ['patch', '/enrollments/e2/status', { status: 'approved' }],
    ['post', '/grades', { enrollmentId: 'e6', score: 80 }],
    ['put', '/grades/g1', { score: 80 }], ['delete', '/grades/g1'],
  ]) await api(method, path, 'andi').send(body).expect(403)
  await api('post', '/enrollments').send({ courseId: 'c1' }).expect(403)
})

test('students see only their own enrollments and grades, including direct ID requests', async () => {
  const all = await api('get', '/enrollments').expect(200)
  assert.equal(all.body.data.length, 8)
  for (const role of ['andi', 'bella']) {
    const studentId = role === 'andi' ? 'CS2023001' : 'CS2023002'
    for (const resource of ['enrollments', 'grades']) {
      const result = await api('get', `/${resource}`, role).expect(200)
      assert.ok(result.body.data.length > 0)
      assert.ok(result.body.data.every((row) => row.studentId === studentId && !Object.hasOwn(row, 'userId')))
    }
  }
  await api('get', '/enrollments/e3', 'andi').expect(404)
  await api('get', '/grades/g3', 'andi').expect(404)
  await api('delete', '/enrollments/e2', 'bella').expect(404)
  await api('get', '/enrollments/e2', 'andi').expect(200)
  await api('get', '/grades/g1', 'andi').expect(200)
})

test('list routes scope by the token and ignore any user id sent by the client', async () => {
  const own = {
    enrollments: (await api('get', '/enrollments', 'andi').expect(200)).body.data,
    grades: (await api('get', '/grades', 'andi').expect(200)).body.data,
  }
  // Bella's identifiers in every place a client could try to send them.
  const spoofs = ['userId=u3', 'user_id=u3', 'studentId=CS2023002', 'student_id=u3', 'id=u3', 'role=administrator']
  for (const resource of ['enrollments', 'grades']) {
    for (const query of spoofs) {
      const result = await api('get', `/${resource}?${query}`, 'andi').expect(200)
      assert.deepEqual(result.body.data, own[resource])
    }
    const viaHeaderAndBody = await api('get', `/${resource}`, 'andi')
      .set('X-User-Id', 'u3').send({ userId: 'u3', studentId: 'CS2023002' }).expect(200)
    assert.deepEqual(viaHeaderAndBody.body.data, own[resource])
    assert.ok(own[resource].length > 0)
    assert.ok(own[resource].every((row) => row.studentId === 'CS2023001'))
  }
  // The profile and GPA also follow the token, not the query string.
  const profile = await api('get', '/auth/me?userId=u3', 'andi').expect(200)
  assert.equal(profile.body.user.id, 'u2')
  // A student cannot create an enrollment for somebody else: the owner is always req.user.id.
  const course = await newCourse()
  await api('post', '/enrollments', 'andi').send({ courseId: course.id, userId: 'u3' }).expect(400)
  const created = await enroll(course.id, 'andi')
  assert.equal(created.studentId, 'CS2023001')
  const bella = (await api('get', '/enrollments', 'bella').expect(200)).body.data
  assert.ok(bella.every((row) => row.id !== created.id && row.studentId === 'CS2023002'))
  // The student directory stays admin-only.
  await api('get', '/students', 'andi').expect(403)
})

test('courses support complete admin CRUD and authenticated student browsing', async () => {
  const course = await newCourse()
  assert.equal(course.enrolled, 0)
  const detail = await api('get', `/courses/${course.id}`, 'andi').expect(200)
  assert.equal(detail.body.data.code, 'CS999')
  const updated = await api('put', `/courses/${course.id}`).send({ ...courseBody, title: 'Updated course' }).expect(200)
  assert.equal(updated.body.data.title, 'Updated course')
  await api('delete', `/courses/${course.id}`).expect(204)
  await api('get', `/courses/${course.id}`).expect(404)
  await api('delete', `/courses/${course.id}`).expect(404)
})

test('course validation and uniqueness reject invalid or duplicate offerings', async () => {
  await newCourse()
  await api('post', '/courses').send(courseBody).expect(409)
  for (const body of [
    { ...courseBody, credits: 0 }, { ...courseBody, credits: 3.5 }, { ...courseBody, capacity: -1 },
    { ...courseBody, capacity: '10' }, { ...courseBody, title: ' ' }, { ...courseBody, enrolled: 0 },
    { code: 'incomplete' },
  ]) await api('post', '/courses').send(body).expect(400)
})

test('enrollment derives identity and term from server data and starts pending', async () => {
  const course = await newCourse()
  const enrollment = await enroll(course.id)
  assert.equal(enrollment.studentId, 'CS2023001')
  assert.equal(enrollment.term, course.term)
  assert.equal(enrollment.status, 'pending')
  assert.match(enrollment.enrolledAt, /^\d{4}-\d{2}-\d{2}$/)
  await api('post', '/enrollments', 'andi').send({ courseId: course.id }).expect(409)
  await api('post', '/enrollments', 'andi').send({ courseId: 'missing' }).expect(404)
  for (const extra of [{ studentId: 'CS2023002' }, { status: 'approved' }, { term: 'wrong' }]) {
    await api('post', '/enrollments', 'andi').send({ courseId: 'c3', ...extra }).expect(400)
  }
})

test('approval enforces capacity; pending requests do not reserve seats', async () => {
  const course = await newCourse()
  const first = await enroll(course.id, 'andi')
  const second = await enroll(course.id, 'bella')
  await api('patch', `/enrollments/${first.id}/status`).send({ status: 'approved' }).expect(200)
  await api('patch', `/enrollments/${second.id}/status`).send({ status: 'approved' }).expect(409)
  assert.equal((await db.get('SELECT status FROM enrollments WHERE id = ?', [second.id])).status, 'pending')
  const updatedCourse = await api('get', `/courses/${course.id}`).expect(200)
  assert.equal(updatedCourse.body.data.enrolled, 1)
  await api('patch', `/enrollments/${second.id}/status`).send({ status: 'rejected' }).expect(200)
})

test('full courses reject new requests and invalid approval transitions are rejected', async () => {
  await api('put', '/courses/c1').send({
    code: 'CS101', title: 'Introduction to Programming', credits: 3,
    term: '2024/2025', instructor: 'Dr. Budi Hartono', capacity: 1,
  }).expect(409)
  const course = await newCourse()
  const first = await enroll(course.id)
  await api('patch', `/enrollments/${first.id}/status`).send({ status: 'approved' }).expect(200)
  await api('post', '/enrollments', 'bella').send({ courseId: course.id }).expect(409)
  await api('patch', `/enrollments/${first.id}/status`).send({ status: 'approved' }).expect(409)
  await api('patch', '/enrollments/e4/status').send({ status: 'approved' }).expect(409) // rejected stays rejected
  await api('patch', '/enrollments/e2/status').send({ status: 'pending' }).expect(400)
  await api('patch', '/enrollments/missing/status').send({ status: 'approved' }).expect(404)
})

test('linked courses retain identity and cannot be deleted', async () => {
  const response = await api('get', '/courses/c1').expect(200)
  const { id, enrolled, ...input } = response.body.data
  assert.equal(enrolled, 2)
  await api('put', `/courses/${id}`).send({ ...input, code: 'NEW' }).expect(409)
  await api('put', `/courses/${id}`).send({ ...input, term: 'NEW' }).expect(409)
  await api('put', `/courses/${id}`).send({ ...input, capacity: 1 }).expect(409)
  await api('delete', `/courses/${id}`).expect(409)
})

test('pending withdrawals, admin cleanup, and graded-enrollment protection work', async () => {
  await api('delete', '/enrollments/e2', 'andi').expect(204)
  await api('get', '/enrollments/e2').expect(404)
  await api('delete', '/enrollments/e4', 'bella').expect(409)
  await api('delete', '/enrollments/e4').expect(204)
  await api('delete', '/enrollments/e1', 'andi').expect(409)
  await api('delete', '/enrollments/e1').expect(409)
  await api('delete', '/enrollments/e3').expect(409)
  await api('delete', '/enrollments/missing').expect(404)
})

test('grades support CRUD, compute letters, and update student GPA', async () => {
  const created = await api('post', '/grades').send({ enrollmentId: 'e3', score: 85 }).expect(201)
  const grade = created.body.data
  assert.equal(grade.letter, 'A')
  assert.equal(grade.points, 4)
  assert.equal(grade.studentId, 'CS2023002')
  await api('get', `/grades/${grade.id}`, 'bella').expect(200)
  const updated = await api('put', `/grades/${grade.id}`).send({ score: 0 }).expect(200)
  assert.equal(updated.body.data.letter, 'F')
  assert.equal(updated.body.data.points, 0)
  const profile = await api('get', '/auth/me', 'bella').expect(200)
  assert.ok(Math.abs(profile.body.gpa - (4 * 3 + 2.7 * 3) / 9) < 1e-12)
  await api('delete', `/grades/${grade.id}`).expect(204)
  await api('get', `/grades/${grade.id}`).expect(404)
  await api('delete', `/grades/${grade.id}`).expect(404)
})

test('grade creation requires an approved enrollment and no existing grade', async () => {
  await api('post', '/grades').send({ enrollmentId: 'e2', score: 80 }).expect(409)
  await api('post', '/grades').send({ enrollmentId: 'e4', score: 80 }).expect(409)
  await api('post', '/grades').send({ enrollmentId: 'e6', score: 80 }).expect(409)
  await api('post', '/grades').send({ enrollmentId: 'missing', score: 80 }).expect(404)
  await api('put', '/grades/missing').send({ score: 80 }).expect(404)
  await api('post', '/grades').send({ enrollmentId: 'e3', score: 100 }).expect(201)
})

test('grade validation rejects coercion, out-of-range values, and derived fields', async () => {
  for (const score of [null, '', '85', true, -1, 101, {}, []]) {
    await api('post', '/grades').send({ enrollmentId: 'e3', score }).expect(400)
    await api('put', '/grades/g1').send({ score }).expect(400)
  }
  await api('post', '/grades').send({ enrollmentId: 'e3', score: 90, letter: 'A' }).expect(400)
  await api('put', '/grades/g1').send({ enrollmentId: 'e3', score: 80 }).expect(400)
  await api('post', '/grades').send({ enrollmentId: 'e3', score: 84.5 }).expect(201)
})

test('grade scale and GPA match the existing frontend including boundaries and empty data', () => {
  for (const score of [0, 39.99, 40, 49.99, 50, 54.99, 55, 59.99, 60, 64.99, 65, 69.99,
    70, 74.99, 75, 79.99, 80, 84.99, 85, 100]) {
    assert.deepEqual(gradeForScore(score), toLetterGrade(score))
  }
  assert.equal(gpaForGrades([]), 0)
  const grades = [{ credits: 3, points: 4 }, { credits: 4, points: 3.3 }]
  assert.equal(gpaForGrades(grades), computeGpa(grades))
})

test('malformed JSON, oversized bodies, and unknown endpoints produce JSON errors', async () => {
  const malformed = await request(app).post('/api/auth/login').set('Content-Type', 'application/json')
    .send('{bad json').expect(400)
  assert.equal(malformed.body.error.code, 'INVALID_JSON')
  await request(app).post('/api/auth/login').send({ password: 'a'.repeat(17000) }).expect(413)
  const missing = await api('get', '/missing').expect(404)
  assert.equal(missing.body.error.code, 'NOT_FOUND')
})

test('SQLite enforces relationships, duplicates, and score constraints', async () => {
  assert.equal((await db.get('PRAGMA foreign_keys')).foreign_keys, 1)
  await assert.rejects(db.run('DELETE FROM courses WHERE id = ?', ['c1']), /FOREIGN KEY/)
  await assert.rejects(db.run('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)',
    ['bad', 'missing', 'c1']), /FOREIGN KEY/)
  await assert.rejects(db.run('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)',
    ['duplicate', 'u2', 'c1']), /UNIQUE/)
  await assert.rejects(db.run('UPDATE grades SET score = ? WHERE id = ?', [-1, 'g1']), /CHECK/)
})

test('a failed transaction rolls back and later transactions still run', async () => {
  await assert.rejects(db.transaction(async (tx) => {
    await tx.run("UPDATE courses SET title = 'changed' WHERE id = 'c1'")
    throw new Error('stop')
  }), /stop/)
  assert.notEqual((await db.get("SELECT title FROM courses WHERE id = 'c1'")).title, 'changed')
  const course = await newCourse({ capacity: 2 })
  const created = await Promise.all([enroll(course.id, 'andi'), enroll(course.id, 'bella')])
  assert.deepEqual(created.map((row) => row.studentId).sort(), ['CS2023001', 'CS2023002'])
})

test('records survive database reopen and repeat seeding never overwrites user changes', async () => {
  const course = await newCourse()
  const enrollment = await enroll(course.id)
  await api('patch', `/enrollments/${enrollment.id}/status`).send({ status: 'approved' }).expect(200)
  const grade = await api('post', '/grades').send({ enrollmentId: enrollment.id, score: 90 }).expect(201)
  await db.run("UPDATE users SET password_hash = 'changed-hash' WHERE id = 'u1'")
  db.close()
  db = await openDatabase({ path: dbPath })
  assert.equal((await seedDatabase(db)).seeded, false)
  assert.equal((await db.get("SELECT password_hash FROM users WHERE id='u1'")).password_hash, 'changed-hash')
  app = createApp({ db, secret })
  const persisted = await api('get', `/grades/${grade.body.data.id}`).expect(200)
  assert.equal(persisted.body.data.score, 90)
  assert.equal(persisted.body.data.courseId, course.id)
})

test('initialization is repeatable and refuses unknown schemas without overwriting tables', async () => {
  const existing = join(directory, 'external.db')
  const external = createClient({ url: `file:${existing}` })
  await external.executeMultiple("CREATE TABLE keep_me (value TEXT); INSERT INTO keep_me VALUES ('saved');")
  external.close()
  await assert.rejects(openDatabase({ path: existing }), /Unversioned database/)
  const unchanged = createClient({ url: `file:${existing}` })
  assert.equal((await unchanged.execute('SELECT value FROM keep_me')).rows[0].value, 'saved')
  unchanged.close()
  await db.run('UPDATE schema_version SET version = 99')
  await assert.rejects(openDatabase({ path: dbPath }), /Unsupported database schema/)
})

test('a Week 10 better-sqlite3 database (PRAGMA user_version = 1) is adopted without data loss', async () => {
  // A real Week 10 file has the v1 tables only, so build one without the later migrations.
  db.close()
  const legacyPath = join(directory, 'legacy.db')
  rmSync(legacyPath, { force: true })
  db = await openDatabase({ path: legacyPath, migrations: [] })
  await seedDatabase(db)
  await db.run('DROP TABLE schema_version')
  await db.run('PRAGMA user_version = 1')
  db.close()
  db = await openDatabase({ path: legacyPath })
  assert.equal((await db.get('SELECT version FROM schema_version')).version, migrations.length + 1)
  assert.equal((await db.get('SELECT count(*) AS count FROM users')).count, 3)
  assert.equal((await db.get("SELECT is_open FROM courses WHERE id = 'c1'")).is_open, 1)
})

test('configuration requires a secret, validates port/origin, and resolves DB paths from backend', () => {
  assert.throws(() => loadConfig({}), /JWT_SECRET/)
  assert.throws(() => loadConfig({ JWT_SECRET: secret, PORT: 'no' }), /PORT/)
  assert.throws(() => loadConfig({ JWT_SECRET: secret, CORS_ORIGIN: 'http://localhost:5173/' }), /CORS_ORIGIN/)
  const config = loadConfig({ JWT_SECRET: secret })
  assert.equal(config.port, 3000)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(databasePath({ DB_PATH: ':memory:' }), ':memory:')
  assert.equal(databasePath({}), join(backendDirectory, 'data/campus.db'))
})

test('configuration selects Turso only when its URL is set and accepts several CORS origins', () => {
  assert.deepEqual(databaseConfig({ DB_PATH: ':memory:' }), { path: ':memory:' })
  assert.deepEqual(databaseConfig({ TURSO_DATABASE_URL: 'libsql://campus-portal.turso.io', TURSO_AUTH_TOKEN: 'token' }),
    { url: 'libsql://campus-portal.turso.io', authToken: 'token' })
  assert.throws(() => databaseConfig({ TURSO_DATABASE_URL: 'libsql://campus-portal.turso.io' }), /TURSO_AUTH_TOKEN/)
  assert.throws(() => databaseConfig({ TURSO_DATABASE_URL: 'campus-portal.turso.io', TURSO_AUTH_TOKEN: 'token' }), /TURSO_DATABASE_URL/)
  assert.equal(loadConfig({ JWT_SECRET: secret }).origin, 'http://localhost:5173')
  assert.deepEqual(loadConfig({ JWT_SECRET: secret, CORS_ORIGIN: 'http://localhost:5173, https://campus.vercel.app' }).origin,
    ['http://localhost:5173', 'https://campus.vercel.app'])
  assert.throws(() => loadConfig({ JWT_SECRET: secret, CORS_ORIGIN: 'http://localhost:5173,https://campus.vercel.app/' }), /CORS_ORIGIN/)
  assert.equal(loadConfig({ JWT_SECRET: secret, RENDER: 'true' }).host, '0.0.0.0')
  assert.equal(loadConfig({ JWT_SECRET: secret, RAILWAY_ENVIRONMENT: 'production' }).host, '0.0.0.0')
  assert.equal(loadConfig({ JWT_SECRET: secret }).host, '127.0.0.1')
  assert.equal(loadConfig({ JWT_SECRET: secret, RENDER: 'true', TURSO_DATABASE_URL: 'libsql://x.turso.io', TURSO_AUTH_TOKEN: 't' }).database.url,
    'libsql://x.turso.io')
})

test('a rejected request can be made again and goes back to pending with the same id', async () => {
  const course = await newCourse()
  const first = await enroll(course.id)
  await api('patch', `/enrollments/${first.id}/status`).send({ status: 'rejected' }).expect(200)
  const again = await enroll(course.id)
  assert.equal(again.id, first.id)
  assert.equal(again.status, 'pending')
  const conflict = await api('post', '/enrollments', 'andi').send({ courseId: course.id }).expect(409)
  assert.match(conflict.body.error.message, /pending or approved/)
})

test('an approved enrollment without a grade can be changed to rejected, a graded one cannot', async () => {
  const course = await newCourse()
  const first = await enroll(course.id)
  await api('patch', `/enrollments/${first.id}/status`).send({ status: 'approved' }).expect(200)
  await api('patch', `/enrollments/${first.id}/status`).send({ status: 'rejected' }).expect(200)
  assert.equal((await api('get', `/courses/${course.id}`).expect(200)).body.data.enrolled, 0)
  await api('patch', '/enrollments/e1/status').send({ status: 'rejected' }).expect(409) // e1 is graded
})

test('credits lock once a course has a grade; other fields can still change', async () => {
  const { id, enrolled: _enrolled, ...input } = (await api('get', '/courses/c1').expect(200)).body.data
  const response = await api('put', `/courses/${id}`).send({ ...input, credits: input.credits + 1 }).expect(409)
  assert.match(response.body.error.message, /Credits cannot change/)
  await api('put', `/courses/${id}`).send({ ...input, title: 'Renamed' }).expect(200)
})

test('a closed course cannot be requested and keeps its flag when an update omits it', async () => {
  const course = await newCourse({ isOpen: false })
  assert.equal(course.isOpen, false)
  const blocked = await api('post', '/enrollments', 'andi').send({ courseId: course.id }).expect(409)
  assert.match(blocked.body.error.message, /closed/)
  const updated = await api('put', `/courses/${course.id}`).send({ ...courseBody, title: 'Still closed' }).expect(200)
  assert.equal(updated.body.data.isOpen, false)
  const reopened = await api('put', `/courses/${course.id}`).send({ ...courseBody, isOpen: true }).expect(200)
  assert.equal(reopened.body.data.isOpen, true)
  await enroll(course.id)
  await api('post', '/courses').send({ ...courseBody, code: 'CS998', isOpen: 'yes' }).expect(400)
  assert.equal((await newCourse({ code: 'CS997' })).isOpen, true)
})

test('repeated failed logins are blocked with 429 and Retry-After; a success resets the count', async () => {
  app = createApp({ db, secret, logger: (error) => { throw error }, limits: { login: { max: 3, windowMs: 60000 } } })
  const login = (password) => request(app).post('/api/auth/login').send({ username: 'andi', password })
  await login('student123').expect(200)
  for (let i = 0; i < 2; i += 1) await login('wrong').expect(401)
  await login('student123').expect(200) // resets
  for (let i = 0; i < 3; i += 1) await login('wrong').expect(401)
  const blocked = await login('student123').expect(429)
  assert.equal(blocked.body.error.code, 'TOO_MANY_REQUESTS')
  assert.ok(Number(blocked.headers['retry-after']) > 0)
  await request(app).post('/api/auth/login').send({ username: 'bella', password: 'student123' }).expect(200)
})

test('a transaction that hangs is abandoned with 503 and never commits; later writes still run', async () => {
  db.close()
  db = await openDatabase({ path: dbPath, transactionTimeoutMs: 100 })
  await assert.rejects(db.transaction(async (tx) => {
    await tx.run("UPDATE courses SET title = 'late' WHERE id = 'c1'")
    await new Promise((done) => setTimeout(done, 300))
  }), (error) => error.status === 503 && error.code === 'DATABASE_BUSY')
  await new Promise((done) => setTimeout(done, 300))
  assert.notEqual((await db.get("SELECT title FROM courses WHERE id = 'c1'")).title, 'late')
  await db.transaction((tx) => tx.run("UPDATE courses SET title = 'next' WHERE id = 'c1'"))
  assert.equal((await db.get("SELECT title FROM courses WHERE id = 'c1'")).title, 'next')
})

test('scores accept up to two decimals and refuse more', async () => {
  const course = await newCourse({ capacity: 3 })
  const ids = []
  for (const role of ['andi', 'bella']) {
    const enrollment = await enroll(course.id, role)
    await api('patch', `/enrollments/${enrollment.id}/status`).send({ status: 'approved' }).expect(200)
    ids.push(enrollment.id)
  }
  const ok = await api('post', '/grades').send({ enrollmentId: ids[0], score: 84.75 }).expect(201)
  assert.equal(ok.body.data.score, 84.75)
  const refused = await api('post', '/grades').send({ enrollmentId: ids[1], score: 84.999 }).expect(400)
  assert.match(refused.body.error.message, /2 decimal places/)
  await api('put', `/grades/${ok.body.data.id}`).send({ score: 70.125 }).expect(400)
  await api('put', `/grades/${ok.body.data.id}`).send({ score: 70.1 }).expect(200)
})

test('web and phone parse a typed score the same way as the API accepts it', async () => {
  const { parseScore: webParse } = await import('../../src/utils/grade.js')
  const { parseScore: phoneParse } = await import('../../mobile-app/src/lib/grading.js')
  const cases = { '85': 85, '85,5': 85.5, '85.25': 85.25, ' 100 ': 100, '0': 0,
    '85.255': null, '101': null, '-1': null, '': null, 'abc': null, '1e2': null }
  for (const [text, expected] of Object.entries(cases)) {
    assert.equal(webParse(text), expected, `web: ${text}`)
    assert.equal(phoneParse(text), expected, `phone: ${text}`)
  }
})
