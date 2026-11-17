import { fileURLToPath } from 'node:url'
import { isAbsolute, resolve } from 'node:path'
import dotenv from 'dotenv'

export const backendDirectory = fileURLToPath(new URL('../', import.meta.url))
dotenv.config({ path: resolve(backendDirectory, '.env'), quiet: true })

export function databasePath(env = process.env) {
  const value = env.DB_PATH || './data/campus.db'
  return value === ':memory:' || isAbsolute(value) ? value : resolve(backendDirectory, value)
}

// TURSO_DATABASE_URL set -> hosted Turso database (production). Otherwise the local file at DB_PATH.
export function databaseConfig(env = process.env) {
  const url = env.TURSO_DATABASE_URL?.trim()
  if (!url) return { path: databasePath(env) }
  if (!/^(libsql|https|wss):\/\//.test(url)) {
    throw new Error('TURSO_DATABASE_URL must start with libsql://, https:// or wss://.')
  }
  const authToken = env.TURSO_AUTH_TOKEN?.trim()
  if (!authToken) throw new Error('TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set.')
  return { url, authToken }
}

export function describeDatabase(database) {
  return database.url ? `Turso (${new URL(database.url).host})` : database.path
}

// CORS_ORIGIN is one origin or a comma-separated list (local dev, GitHub Pages, Vercel).
function corsOrigins(value) {
  const origins = value.split(',').map((item) => item.trim()).filter(Boolean)
  if (!origins.length) throw new Error('CORS_ORIGIN must contain at least one origin.')
  for (const origin of origins) {
    let parsed
    try { parsed = new URL(origin) } catch { parsed = null }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGIN must list exact HTTP(S) origins without a path or trailing slash, separated by commas.')
    }
  }
  return origins
}

export function loadConfig(env = process.env) {
  const secret = env.JWT_SECRET
  if (!secret || secret.length < 32 || secret.includes('replace-with')) {
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in backend/.env.')
  }
  const port = Number(env.PORT || 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }
  const origins = corsOrigins(env.CORS_ORIGIN || 'http://localhost:5173')
  return {
    // A hosting platform (Railway, Render) needs the server on all interfaces; a laptop stays on loopback.
    host: env.HOST || (env.RAILWAY_ENVIRONMENT || env.RENDER ? '0.0.0.0' : '127.0.0.1'), port, secret,
    origin: origins.length === 1 ? origins[0] : origins,
    database: databaseConfig(env),
    dbPath: databasePath(env),
  }
}
