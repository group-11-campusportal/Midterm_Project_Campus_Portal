import { badRequest } from './errors.js'

export function fields(body, allowed, required = allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) badRequest('A JSON object is required.')
  if (Object.keys(body).some((key) => !allowed.includes(key))) badRequest('The request contains an unsupported field.')
  if (required.some((key) => !Object.hasOwn(body, key))) badRequest(`Required fields: ${required.join(', ')}.`)
}

export function text(value, field, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    badRequest(`${field} must be a non-empty string of at most ${max} characters.`)
  }
  return value.trim()
}

function integer(value, field, min, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    badRequest(`${field} must be an integer between ${min} and ${max}.`)
  }
  return value
}

const courseFields = ['code', 'title', 'credits', 'term', 'instructor', 'capacity']

// isOpen is optional: a new course is open by default, and an update keeps the current value.
export function courseInput(body) {
  fields(body, [...courseFields, 'isOpen'], courseFields)
  if (body.isOpen !== undefined && typeof body.isOpen !== 'boolean') badRequest('isOpen must be true or false.')
  return {
    code: text(body.code, 'code', 30), title: text(body.title, 'title'),
    credits: integer(body.credits, 'credits', 1, 12), term: text(body.term, 'term', 40),
    instructor: text(body.instructor, 'instructor'), capacity: integer(body.capacity, 'capacity', 1),
    isOpen: body.isOpen,
  }
}

// At most two decimals, so the stored score is exactly what the registrar typed and sees.
// (Rounding instead could move 84.999 into the next letter band.)
export function scoreInput(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    badRequest('score must be a number between 0 and 100.')
  }
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    badRequest('score may have at most 2 decimal places.')
  }
  return value
}
