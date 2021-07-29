import { NodePen } from 'glib'
import { GraphMode } from './GraphMode'

export type GraphState = {
  elements: { [id: string]: NodePen.Element<NodePen.ElementType> }
  selection: string[]
  mode: GraphMode
  registry: {
    move: {
      elements: string[]
      fromWires: string[]
      toWires: string[]
    }
    wire: {
      origin: {
        elementId: string
        parameterId: string
      }
      primary: string
      capture?: {
        elementId: string
        parameterId: string
      }
    }
  }
}
