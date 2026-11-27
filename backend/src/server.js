import { createApp } from './app.js'
import { describeDatabase, loadConfig } from './config.js'
import { openDatabase } from './database.js'
import { createGeminiAdvisor, createGeminiRecommender } from './ai.js'

let db
try {
  const config = loadConfig()
  db = await openDatabase(config.database)
  const advisor = createGeminiAdvisor(config.ai)
  const recommender = createGeminiRecommender(config.ai)
  const app = createApp({ db, secret: config.secret, origin: config.origin, advisor, recommender })
  const server = app.listen(config.port, config.host, () => {
    console.log(`Campus Portal API running at http://${config.host}:${config.port}/api`)
    console.log(`Database: ${describeDatabase(config.database)}`)
    console.log(`AI advisor: ${config.ai.apiKey ? config.ai.model : 'not configured (GEMINI_API_KEY empty)'}`)
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
