import { databasePath } from './config.js'
import { openDatabase } from './database.js'
import { seedDatabase } from './seed.js'

const action = process.argv[2]
if (!['init', 'seed'].includes(action)) {
  console.error('Usage: node src/setup.js init|seed')
  process.exitCode = 1
} else {
  let db
  try {
    const path = databasePath()
    db = openDatabase(path)
    console.log(action === 'seed' ? seedDatabase(db).message : 'Database schema is ready.')
    console.log(`Database: ${path}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    db?.close()
  }
}
