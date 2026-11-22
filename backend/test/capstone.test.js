import { after, afterEach, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import request from 'supertest'
import { openDatabase } from '../src/database.js'
import { seedDatabase } from '../src/seed.js'
import { createApp } from '../src/app.js'
import { issueToken } from '../src/auth.js'
import { loadConfig } from '../src/config.js'
import { createGeminiAdvisor } from '../src/ai.js'

const secret = 'test-only-secret-0123456789abcdef0123456789abcdef'
const users = { admin: 'u1', andi: 'u2', bella: 'u3' }
let directory, template, dbPath, db

before(async () => {
  directory = mkdtempSync(join(tmpdir(), 'campus-capstone-'))
  template = join(directory, 'template.db')
  const initial = await openDatabase({ path: template })
  await seedDatabase(initial)
  initial.close()
})
beforeEach(async () => {
  dbPath = join(directory, 'current.db')
  copyFileSync(template, dbPath)
  db = await openDatabase({ path: dbPath })
})
afterEach(() => db.close())
after(() => rmSync(directory, { recursive: true, force: true }))

const quiet = () => {}
const build = (advisor) => createApp({ db, secret, logger: quiet, advisor })
const call = (app, path, role = 'admin') => request(app).post(`/api${path}`)
  .set('Authorization', `Bearer ${issueToken(users[role], secret)}`)

// A fake fetch that answers like Gemini's generateContent endpoint.
function gemini(payload, { status = 200 } = {}) {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify(status === 200
      ? { candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }
      : { error: { message: 'upstream detail that must not leak' } }), { status })
  }
  return { fetchImpl, calls }
}

test('the bare base URL answers 200 with JSON instead of 404', async () => {
  const response = await request(build()).get('/').expect(200)
  assert.equal(response.body.status, 'ok')
  assert.equal(response.body.health, '/api/health')
})

test('a student calling admin routes gets 403 FORBIDDEN, including the AI route', async () => {
  const app = build()
  const student = (method, path) => request(app)[method](`/api${path}`)
    .set('Authorization', `Bearer ${issueToken(users.andi, secret)}`)
  for (const response of [
    await student('get', '/students'),
    await student('post', '/courses').send({}),
    await student('post', '/ai/at-risk-summary').send({ term: '2024/2025' }),
  ]) {
    assert.equal(response.status, 403)
    assert.equal(response.body.error.code, 'FORBIDDEN')
  }
  await request(app).post('/api/ai/at-risk-summary').send({ term: '2024/2025' }).expect(401)
})

test('AI route: report built from database facts; model output is validated', async () => {
  const fake = gemini({
    overallSummary: 'One student needs attention.',
    atRiskStudents: [
      { studentId: 'CS2023002', riskLevel: 'medium', reason: 'Rejected request.', recommendation: 'Pick another elective.' },
      { studentId: 'HACKER', riskLevel: 'high', reason: 'x', recommendation: 'x' },
      { studentId: 'CS2023001', riskLevel: 'catastrophic', reason: 'x', recommendation: 'x' },
    ],
  })
  const advisor = createGeminiAdvisor({ apiKey: 'test-key', fetchImpl: fake.fetchImpl, logger: quiet })
  const response = await call(build(advisor), '/ai/at-risk-summary').send({ term: '2024/2025' }).expect(200)
  const { data } = response.body
  assert.equal(data.aiGenerated, true)
  assert.equal(data.term, '2024/2025')
  assert.deepEqual(data.atRiskStudents.map((s) => s.studentId), ['CS2023002'])
  assert.equal(data.atRiskStudents[0].studentName, 'Bella Kusuma')
  assert.equal(typeof data.atRiskStudents[0].gpa, 'number')
  // Key travels in a header to the provider only; student names are not sent to the provider.
  assert.equal(fake.calls[0].options.headers['x-goog-api-key'], 'test-key')
  assert.ok(!fake.calls[0].url.includes('test-key'))
  assert.ok(!fake.calls[0].options.body.includes('Bella'))
  assert.ok(!JSON.stringify(response.body).includes('test-key'))
})

test('AI route: every LLM failure becomes a clear JSON error, never a 500', async () => {
  const cases = [
    [createGeminiAdvisor({ apiKey: '', logger: quiet }), 503, 'AI_UNAVAILABLE'],
    [createGeminiAdvisor({ apiKey: 'k', logger: quiet, fetchImpl: gemini({}, { status: 500 }).fetchImpl }), 502, 'AI_FAILED'],
    [createGeminiAdvisor({ apiKey: 'k', logger: quiet, fetchImpl: gemini({}, { status: 429 }).fetchImpl }), 503, 'AI_RATE_LIMITED'],
    [createGeminiAdvisor({ apiKey: 'k', logger: quiet, fetchImpl: async () => { throw new TypeError('fetch failed') } }), 502, 'AI_FAILED'],
    [createGeminiAdvisor({ apiKey: 'k', logger: quiet, fetchImpl: async () => {
      throw new DOMException('timed out', 'TimeoutError') } }), 504, 'AI_TIMEOUT'],
    [createGeminiAdvisor({ apiKey: 'k', logger: quiet, fetchImpl: async () => new Response('{"candidates":[]}') }), 502, 'AI_BAD_RESPONSE'],
    [createGeminiAdvisor({ apiKey: 'k', logger: quiet, fetchImpl: gemini({ wrong: true }).fetchImpl }), 502, 'AI_BAD_RESPONSE'],
  ]
  for (const [advisor, status, code] of cases) {
    const response = await call(build(advisor), '/ai/at-risk-summary').send({ term: '2024/2025' })
    assert.equal(response.status, status, code)
    assert.equal(response.body.error.code, code)
    assert.ok(response.body.error.message.length > 10)
    assert.ok(!JSON.stringify(response.body).includes('upstream detail'))
  }
})

test('AI route: input is validated and an empty term does not call the provider', async () => {
  let called = false
  const app = build(async () => { called = true; return {} })
  await call(app, '/ai/at-risk-summary').send({}).expect(400)
  await call(app, '/ai/at-risk-summary').send({ term: '2024/2025', userId: 'u2' }).expect(400)
  const empty = await call(app, '/ai/at-risk-summary').send({ term: '1999/2000' }).expect(200)
  assert.equal(empty.body.data.aiGenerated, false)
  assert.deepEqual(empty.body.data.atRiskStudents, [])
  assert.equal(called, false)
})

test('AI key is read only from the environment and documented only as an empty name', () => {
  assert.equal(loadConfig({ JWT_SECRET: secret, GEMINI_API_KEY: ' abc ' }).ai.apiKey, 'abc')
  assert.equal(loadConfig({ JWT_SECRET: secret }).ai.apiKey, '')
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  assert.match(example, /^GEMINI_API_KEY=$/m)
  assert.match(example, /^TURSO_AUTH_TOKEN=$/m)
})

test('new columns arrive through ALTER TABLE migrations and existing rows are kept', async () => {
  db.close()
  const steps = [{ version: 2, sql: 'ALTER TABLE courses ADD COLUMN description TEXT' }]
  db = await openDatabase({ path: dbPath, migrations: steps })
  assert.equal((await db.get('SELECT version FROM schema_version')).version, 2)
  assert.equal((await db.get('SELECT count(*) AS count FROM courses')).count, 6)
  assert.equal((await db.get("SELECT description FROM courses WHERE id = 'c1'")).description, null)
  db.close()
  db = await openDatabase({ path: dbPath, migrations: steps }) // second start: nothing re-applied
  assert.equal((await db.get('SELECT version FROM schema_version')).version, 2)
  db.close()
  await assert.rejects(openDatabase({ path: dbPath, migrations: [
    ...steps, { version: 3, sql: 'ALTER TABLE nope ADD COLUMN x TEXT' }] }), /Migration to version 3 failed/)
  db = await openDatabase({ path: dbPath, migrations: steps })
  assert.equal((await db.get('SELECT version FROM schema_version')).version, 2)
})

test('the seed command refuses to run against the production database', () => {
  let failure
  try {
    execFileSync(process.execPath, ['src/setup.js', 'seed'], {
      cwd: new URL('..', import.meta.url),
      env: { PATH: process.env.PATH, TURSO_DATABASE_URL: 'libsql://example.turso.io', TURSO_AUTH_TOKEN: 'x', DOTENV_CONFIG_QUIET: 'true' },
      stdio: 'pipe',
    })
  } catch (error) {
    failure = error
  }
  assert.ok(failure, 'seed must exit with an error')
  assert.match(failure.stderr.toString(), /Refusing to seed/)
})
