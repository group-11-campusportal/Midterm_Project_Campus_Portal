import { after, afterEach, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import Database from 'better-sqlite3'
import { openDatabase } from '../src/database.js'
import { seedDatabase } from '../src/seed.js'
import { createApp } from '../src/app.js'
import { issueToken } from '../src/auth.js'
import { loadConfig, databasePath, backendDirectory } from '../src/config.js'
import { gradeForScore, gpaForGrades } from '../src/grading.js'
import { toLetterGrade, computeGpa } from '../../src/utils/grade.js'

const secret = 'test-only-secret-0123456789abcdef0123456789abcdef'
const courseBody = {
  code: 'CS999', title: 'API Testing', credits: 3, term: '2026/2027',
  instructor: 'Test Lecturer', capacity: 1,
}
let directory, template, db, app, dbPath
const users = { admin: 'u1', andi: 'u2', bella: 'u3' }

before(() => {
  directory = mkdtempSync(join(tmpdir(), 'campus-portal-test-'))
  template = join(directory, 'template.db')
  const initial = openDatabase(template)
  seedDatabase(initial)
  initial.close()
})
beforeEach(() => {
  dbPath = join(directory, 'current.db')
  copyFileSync(template, dbPath)
  db = openDatabase(dbPath)
  app = createApp({ db, secret, logger: (error) => { throw error } })
})
afterEach(() => db.close())
after(() => rmSync(directory, { recursive: true, force: true }))

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
    const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id)
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
  assert.equal(db.prepare('SELECT status FROM enrollments WHERE id = ?').get(second.id).status, 'pending')
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
  for (const status of ['approved', 'rejected']) {
    await api('patch', `/enrollments/${first.id}/status`).send({ status }).expect(409)
  }
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

test('SQLite enforces relationships, duplicates, and score constraints', () => {
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1)
  assert.throws(() => db.prepare('DELETE FROM courses WHERE id = ?').run('c1'), /FOREIGN KEY/)
  assert.throws(() => db.prepare('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)')
    .run('bad', 'missing', 'c1'), /FOREIGN KEY/)
  assert.throws(() => db.prepare('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)')
    .run('duplicate', 'u2', 'c1'), /UNIQUE/)
  assert.throws(() => db.prepare('UPDATE grades SET score = ? WHERE id = ?').run(-1, 'g1'), /CHECK/)
})

test('records survive database reopen and repeat seeding never overwrites user changes', async () => {
  const course = await newCourse()
  const enrollment = await enroll(course.id)
  await api('patch', `/enrollments/${enrollment.id}/status`).send({ status: 'approved' }).expect(200)
  const grade = await api('post', '/grades').send({ enrollmentId: enrollment.id, score: 90 }).expect(201)
  db.prepare("UPDATE users SET password_hash = 'changed-hash' WHERE id = 'u1'").run()
  db.close()
  db = openDatabase(dbPath)
  assert.equal(seedDatabase(db).seeded, false)
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id='u1'").get().password_hash, 'changed-hash')
  app = createApp({ db, secret })
  const persisted = await api('get', `/grades/${grade.body.data.id}`).expect(200)
  assert.equal(persisted.body.data.score, 90)
  assert.equal(persisted.body.data.courseId, course.id)
})

test('initialization is repeatable and refuses unknown schemas without overwriting tables', () => {
  const existing = join(directory, 'external.db')
  const external = new Database(existing)
  external.exec('CREATE TABLE keep_me (value TEXT); INSERT INTO keep_me VALUES (\'saved\')')
  external.close()
  assert.throws(() => openDatabase(existing), /Unversioned database/)
  const unchanged = new Database(existing)
  assert.equal(unchanged.prepare('SELECT value FROM keep_me').get().value, 'saved')
  unchanged.close()
  db.pragma('user_version = 2')
  assert.throws(() => openDatabase(dbPath), /Unsupported database schema/)
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
