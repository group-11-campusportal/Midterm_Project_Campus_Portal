import { databaseConfig, describeDatabase } from './config.js'
import { openDatabase } from './database.js'
import { seedDatabase } from './seed.js'

const action = process.argv[2]
if (!['init', 'seed'].includes(action)) {
  console.error('Usage: node src/setup.js init|seed')
  process.exitCode = 1
} else {
  let db
  try {
    const database = databaseConfig()
    // Production is never seeded from code: it already holds real records, and a demo account
    // with a known password must not appear there. Seeding is for a laptop database only.
    if (action === 'seed' && database.url) {
      throw new Error('Refusing to seed: TURSO_DATABASE_URL is set, so this is the production database.')
    }
    db = await openDatabase(database)
    console.log(action === 'seed' ? (await seedDatabase(db)).message : 'Database schema is ready.')
    console.log(`Database: ${describeDatabase(database)}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    db?.close()
  }
}
