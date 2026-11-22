import { ApiError } from './errors.js'
import { gpaForGrades, gradeForScore } from './grading.js'

// AI feature (UC-8): flag at-risk students for one term. Runs only on the server; the provider key
// never reaches the web or mobile app. The client sends only { term }; every number comes from the DB.

const riskLevels = ['high', 'medium', 'low']
const LOW_SCORE = 65

export function aiError(status, code, message) {
  return new ApiError(status, code, message)
}

// Facts per student, computed here so the model cannot invent or miscount them.
// Names are NOT sent to the provider: the model sees only the student number.
export async function riskFacts(db, term) {
  const students = await db.all("SELECT id, student_id, name FROM users WHERE role = 'client' ORDER BY student_id")
  const enrollments = await db.all(`SELECT e.student_id AS userId, e.status, c.code, c.title, c.credits,
      g.score FROM enrollments e JOIN courses c ON c.id = e.course_id
      LEFT JOIN grades g ON g.enrollment_id = e.id WHERE c.term = ?`, [term])
  return students.map((student) => {
    const rows = enrollments.filter((row) => row.userId === student.id)
    const graded = rows.filter((row) => row.score !== null)
      .map((row) => ({ ...row, ...gradeForScore(row.score) }))
    return {
      studentId: student.student_id,
      name: student.name,
      gpa: Math.round(gpaForGrades(graded) * 100) / 100,
      gradedCourses: graded.map((row) => ({ code: row.code, credits: row.credits, score: row.score, letter: row.letter })),
      lowScores: graded.filter((row) => row.score < LOW_SCORE).map((row) => row.code),
      approved: rows.filter((row) => row.status === 'approved').map((row) => row.code),
      pending: rows.filter((row) => row.status === 'pending').map((row) => row.code),
      rejected: rows.filter((row) => row.status === 'rejected').map((row) => row.code),
    }
  }).filter((student) => student.approved.length + student.pending.length + student.rejected.length > 0)
}

function prompt(term, facts) {
  const anonymous = facts.map(({ name: _name, ...rest }) => rest)
  return [
    'You are an academic advisor assistant for a university registrar.',
    `Term: ${term}. A score below ${LOW_SCORE} is a warning sign; GPA is on a 4.0 scale.`,
    'For each student below decide if they are at academic risk. Only include students that show a risk.',
    'riskLevel is high, medium or low. reason cites the given facts only (course codes, scores, GPA,',
    'rejected or pending requests). recommendation is one concrete advising action. Keep each under 200 characters.',
    'overallSummary is one sentence for the registrar. Use only these studentId values.',
    'Students (JSON):',
    JSON.stringify(anonymous),
  ].join('\n')
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    overallSummary: { type: 'STRING' },
    atRiskStudents: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          studentId: { type: 'STRING' },
          riskLevel: { type: 'STRING', enum: riskLevels },
          reason: { type: 'STRING' },
          recommendation: { type: 'STRING' },
        },
        required: ['studentId', 'riskLevel', 'reason', 'recommendation'],
      },
    },
  },
  required: ['overallSummary', 'atRiskStudents'],
}

const clip = (value, max) => String(value).trim().slice(0, max)

// Never trust the model's JSON: keep only known students, known risk levels and bounded text,
// and take name and GPA from the database, not from the model.
export function checkedReport(raw, facts) {
  const byId = new Map(facts.map((student) => [student.studentId, student]))
  if (!raw || typeof raw.overallSummary !== 'string' || !Array.isArray(raw.atRiskStudents)) {
    throw aiError(502, 'AI_BAD_RESPONSE', 'The AI service returned an unexpected answer. Please try again.')
  }
  const seen = new Set()
  const atRiskStudents = []
  for (const item of raw.atRiskStudents) {
    const student = byId.get(item?.studentId)
    if (!student || seen.has(student.studentId) || !riskLevels.includes(item.riskLevel)) continue
    if (typeof item.reason !== 'string' || typeof item.recommendation !== 'string') continue
    seen.add(student.studentId)
    atRiskStudents.push({
      studentId: student.studentId, studentName: student.name, gpa: student.gpa,
      riskLevel: item.riskLevel, reason: clip(item.reason, 300), recommendation: clip(item.recommendation, 300),
    })
  }
  const order = { high: 0, medium: 1, low: 2 }
  atRiskStudents.sort((a, b) => order[a.riskLevel] - order[b.riskLevel] || a.studentId.localeCompare(b.studentId))
  return { overallSummary: clip(raw.overallSummary, 400), atRiskStudents }
}

// Calls Google Gemini over REST. Every failure becomes an ApiError with a message safe to show a user;
// the provider's own error text is logged on the server only.
export function createGeminiAdvisor({ apiKey, model = 'gemini-2.5-flash', timeoutMs = 20000,
  fetchImpl = globalThis.fetch, logger = console.error } = {}) {
  return async function advise(term, facts) {
    if (!apiKey) {
      throw aiError(503, 'AI_UNAVAILABLE', 'The AI advisor is not configured on the server.')
    }
    let response
    try {
      response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt(term, facts) }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        })
    } catch (error) {
      logger(`AI request failed: ${error.name}: ${error.message}`)
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw aiError(504, 'AI_TIMEOUT', 'The AI service took too long to answer. Please try again.')
      }
      throw aiError(502, 'AI_FAILED', 'The AI service could not be reached. Please try again later.')
    }
    if (!response.ok) {
      logger(`AI provider answered ${response.status}: ${(await response.text().catch(() => '')).slice(0, 500)}`)
      if (response.status === 429) {
        throw aiError(503, 'AI_RATE_LIMITED', 'The AI service is busy right now. Please try again in a minute.')
      }
      throw aiError(502, 'AI_FAILED', 'The AI service returned an error. Please try again later.')
    }
    let raw
    try {
      const body = await response.json()
      raw = JSON.parse(body.candidates[0].content.parts.map((part) => part.text || '').join(''))
    } catch (error) {
      logger(`AI response could not be parsed: ${error.message}`)
      throw aiError(502, 'AI_BAD_RESPONSE', 'The AI service returned an unexpected answer. Please try again.')
    }
    return raw
  }
}
