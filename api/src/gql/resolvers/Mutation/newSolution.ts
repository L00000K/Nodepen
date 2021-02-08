import axios from 'axios'
import { db } from '../../../db'

type NewSolutionArgs = {
  sessionId: string
  solutionId: string
  graph: string
}

export const newSolution = async (
  parent: never,
  args: NewSolutionArgs
): Promise<string> => {
  const { sessionId, solutionId, graph } = args
  const elements = JSON.parse(graph)

  await createSolutionStatus(sessionId, solutionId)

  await addSolutionToSession(sessionId, solutionId)

  const root = process.env.NP_DISPATCH_URL ?? 'http://localhost:4100'

  const { data } = await axios.post(`${root}/new/solution`, {
    sessionId,
    solutionId,
    graph: elements,
  })

  return JSON.stringify(data)
}

const createSolutionStatus = async (
  sessionId: string,
  solutionId: string
): Promise<void> => {
  const key = `session:${sessionId}:graph:${solutionId}`

  return new Promise<void>((resolve, reject) => {
    db.hset(key, 'status', 'WAITING', (err, reply) => {
      resolve()
    })
  })
}

const addSolutionToSession = async (
  sessionId: string,
  solutionId: string
): Promise<void> => {
  const root = `session:${sessionId}`

  return new Promise<void>((resolve, reject) => {
    const batch = db.multi()

    batch.lpush(`${root}:history`, solutionId)

    batch.exec((err, res) => [resolve()])
  })
}
