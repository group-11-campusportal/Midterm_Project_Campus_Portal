import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { openDatabase } from './database.js'

let db
try {
  const config = loadConfig()
  db = openDatabase(config.dbPath)
  const app = createApp({ db, secret: config.secret, origin: config.origin })
  const server = app.listen(config.port, config.host, () => {
    console.log(`Campus Portal API running at http://${config.host}:${config.port}/api`)
  })
  server.on('error', (error) => {
    console.error(`Could not start the API: ${error.message}`)
    db.close()
    process.exitCode = 1
  })
  const shutdown = () => server.close(() => db.close())
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
} catch (error) {
  console.error(error.message)
  db?.close()
  process.exitCode = 1
}
