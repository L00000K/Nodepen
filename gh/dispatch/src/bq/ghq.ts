import Queue from 'bee-queue'
import { ClientOpts } from 'redis'
import * as solveHandlers from './solve'

// Configure dispatcher
const opts: ClientOpts = process.env.NP_DB_HOST
  ? {
      host: process.env.NP_DB_HOST,
      port: Number.parseInt(process.env?.NP_DB_PORT),
    }
  : {}

const prefix = process.env?.NP_GLOBAL_PREFIX ?? 'dev'

console.log(`PREFIX: ${prefix}`)

// Create queue connections
const solveQueue = new Queue(`${prefix}:gh:solve`, {
  redis: opts,
  isWorker: true,
})

const saveQueue = new Queue(`${prefix}:gh:save`, {
  redis: opts,
  isWorker: true,
})

const ghq = {
  save: saveQueue,
  solve: solveQueue,
}

// Declare queue handlers
ghq.solve.process(solveHandlers.processJob)
ghq.solve.on('job succeeded', solveHandlers.onJobSucceeded)
ghq.solve.on('job failed', solveHandlers.onJobFailed)

export { ghq }
