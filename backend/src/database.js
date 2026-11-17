import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'

const SCHEMA_VERSION = 1

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

async function migrate(client) {
  const db = queries(client)
  const tables = (await db.all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'libsql_%'",
  )).map((row) => row.name)
  if (!tables.length) {
    const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
    await client.executeMultiple(`BEGIN;\n${schema}\nCOMMIT;`)
    return
  }
  if (!tables.includes('schema_version')) {
    // Databases created by the Week 10 better-sqlite3 backend were versioned with PRAGMA user_version = 1.
    const legacy = await db.get('PRAGMA user_version').catch(() => undefined)
    if (legacy?.user_version !== 1 || !tables.includes('users')) {
      throw new Error('Unversioned database already has tables. Reconcile the schema before using this database.')
    }
    await client.executeMultiple(`CREATE TABLE schema_version (version INTEGER NOT NULL);
      INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});`)
    return
  }
  const version = (await db.get('SELECT version FROM schema_version'))?.version
  if (version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported database schema version ${version}; expected version ${SCHEMA_VERSION}.`)
  }
}

// One code path for both environments (Week 13, S52):
//   development: { path }            -> a local SQLite file through libsql
//   production:  { url, authToken }  -> the hosted Turso database
export async function openDatabase({ url, authToken, path } = {}) {
  if (!url) {
    if (!path) throw new Error('A database path or TURSO_DATABASE_URL is required.')
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    url = path === ':memory:' ? ':memory:' : `file:${path}`
  }
  const client = createClient({ url, authToken, intMode: 'number' })
  let queue = Promise.resolve()
  try {
    await client.execute('PRAGMA foreign_keys = ON')
    await migrate(client)
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
