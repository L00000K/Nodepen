import type { NodesAppState } from '../state'

export const expireSolution = (state: NodesAppState): void => {
  // Clear all solution data and set new solution id.
  // A change in the solution id indicates that a new solution needs to be requested.
  state.solution = {
    solutionId: crypto.randomUUID(),
    documentRuntimeData: {
      durationMs: 0,
    },
    nodeSolutionData: [],
  }
}
