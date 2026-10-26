import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    const version = db.pragma('user_version', { simple: true })
    if (version === 0) {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()
      if (tables.length) {
        throw new Error('Unversioned database already has tables. Reconcile the Week 9 schema before using this file.')
      }
      const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
      db.transaction(() => db.exec(schema))()
    } else if (version !== 1) {
      throw new Error(`Unsupported database schema version ${version}; expected version 1.`)
    }
    return db
  } catch (error) {
    db.close()
    throw error
  }
}
