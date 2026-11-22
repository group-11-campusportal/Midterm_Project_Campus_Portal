import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'

// schema.sql is version 1 and is never edited again: production already has those tables.
// Every later change is appended here as the next version, written as ALTER TABLE / CREATE so the
// rows already in Turso are kept. Never edit or reorder an entry that has been deployed.
// Example: { version: 2, sql: 'ALTER TABLE courses ADD COLUMN description TEXT' }
export const migrations = []

// libsql returns row objects that also carry numeric indexes; the API wants plain objects.
function plain(result) {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column) => [column, row[column]])))
}

// The same three helpers work on the client and on an open transaction.
function queries(executor) {
  const execute = (sql, args = []) => executor.execute({ sql, args })
  return {
    all: async (sql, args) => plain(await execute(sql, args)),
    get: async (sql, args) => plain(await execute(sql, args))[0],
    run: async (sql, args) => ({ changes: (await execute(sql, args)).rowsAffected }),
  }
}

async function migrate(client, steps) {
  const latest = steps.length ? steps[steps.length - 1].version : 1
  const db = queries(client)
  const tables = (await db.all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'libsql_%'",
  )).map((row) => row.name)
  if (!tables.length) {
    const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
    await client.executeMultiple(`BEGIN;\n${schema}\nCOMMIT;`)
    return upgrade(client, steps, 1)
  }
  if (!tables.includes('schema_version')) {
    // Databases created by the Week 10 better-sqlite3 backend were versioned with PRAGMA user_version = 1.
    const legacy = await db.get('PRAGMA user_version').catch(() => undefined)
    if (legacy?.user_version !== 1 || !tables.includes('users')) {
      throw new Error('Unversioned database already has tables. Reconcile the schema before using this database.')
    }
    await client.executeMultiple(`CREATE TABLE schema_version (version INTEGER NOT NULL);
      INSERT INTO schema_version (version) VALUES (1);`)
    return upgrade(client, steps, 1)
  }
  const version = (await db.get('SELECT version FROM schema_version'))?.version
  if (!Number.isInteger(version) || version < 1 || version > latest) {
    throw new Error(`Unsupported database schema version ${version}; this code knows versions 1 to ${latest}.`)
  }
  return upgrade(client, steps, version)
}

// Applies each pending migration in its own transaction together with the version bump,
// so a failed ALTER TABLE leaves the database exactly at the previous version.
async function upgrade(client, steps, from) {
  let current = from
  for (const step of steps) {
    if (step.version <= current) continue
    if (step.version !== current + 1) throw new Error(`Migration ${current + 1} is missing.`)
    const tx = await client.transaction('write')
    try {
      for (const sql of [].concat(step.sql)) await tx.execute(sql)
      await tx.execute({ sql: 'UPDATE schema_version SET version = ?', args: [step.version] })
      await tx.commit()
    } catch (error) {
      await tx.rollback().catch(() => {})
      throw new Error(`Migration to version ${step.version} failed: ${error.message}`)
    } finally {
      tx.close()
    }
    current = step.version
  }
}

// One code path for both environments (Week 13, S52):
//   development: { path }            -> a local SQLite file through libsql
//   production:  { url, authToken }  -> the hosted Turso database
export async function openDatabase({ url, authToken, path, migrations: steps = migrations } = {}) {
  if (!url) {
    if (!path) throw new Error('A database path or TURSO_DATABASE_URL is required.')
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    url = path === ':memory:' ? ':memory:' : `file:${path}`
  }
  const client = createClient({ url, authToken, intMode: 'number' })
  let queue = Promise.resolve()
  try {
    await client.execute('PRAGMA foreign_keys = ON')
    await migrate(client, steps)
  } catch (error) {
    client.close()
    throw error
  }
  return {
    ...queries(client),
    // Runs work(tx) inside one write transaction: commit on success, roll back on any error.
    // Transactions are queued so two requests in this process never interleave their writes.
    transaction(work) {
      const result = queue.then(async () => {
        const tx = await client.transaction('write')
        try {
          const value = await work(queries(tx))
          await tx.commit()
          return value
        } catch (error) {
          await tx.rollback().catch(() => {})
          throw error
        } finally {
          tx.close()
        }
      })
      queue = result.catch(() => {})
      return result
    },
    close: () => client.close(),
  }
}
