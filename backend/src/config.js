import { fileURLToPath } from 'node:url'
import { isAbsolute, resolve } from 'node:path'
import dotenv from 'dotenv'

export const backendDirectory = fileURLToPath(new URL('../', import.meta.url))
dotenv.config({ path: resolve(backendDirectory, '.env'), quiet: true })

export function databasePath(env = process.env) {
  const value = env.DB_PATH || './data/campus.db'
  return value === ':memory:' || isAbsolute(value) ? value : resolve(backendDirectory, value)
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
  const origin = env.CORS_ORIGIN || 'http://localhost:5173'
  const parsedOrigin = new URL(origin)
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
    throw new Error('CORS_ORIGIN must be one exact HTTP(S) origin without a trailing slash.')
  }
  return {
    host: env.HOST || '127.0.0.1', port, secret, origin,
    dbPath: databasePath(env),
  }
}
