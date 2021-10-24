import React, { useEffect } from 'react'
import { NodePen } from 'glib'
import { useSubscription, gql, useApolloClient } from '@apollo/client'
import { useGraphElements } from '../../store/graph/hooks'
import { useSolutionDispatch, useSolutionMetadata } from '../../store/solution/hooks'
import { useSessionManager } from '@/features/common/context/session'
import { newGuid } from '../../utils'

type SolutionManagerProps = {
  children?: JSX.Element
}

/**
 * Watch for changes in graphSlice.solution.id
 * Expire solutionSlice in response to changes
 * Schedule solution
 * Consume initial results
 * @param param0
 * @returns
 */
export const SolutionManager = ({ children }: SolutionManagerProps): React.ReactElement => {
  const { isAuthenticated } = useSessionManager()

  const client = useApolloClient()

  const elements = useGraphElements()

  const { updateSolution, tryApplySolutionManifest } = useSolutionDispatch()
  const meta = useSolutionMetadata()

  useEffect(() => {
    switch (meta.phase) {
      case 'expired': {
        console.log(`🏃🏃🏃 DETECTED`)

        const newSolutionId = newGuid()

        const validElementTypes: NodePen.ElementType[] = ['static-component', 'static-parameter', 'number-slider']
        const validElements = Object.values(elements).filter((element) =>
          validElementTypes.includes(element.template.type)
        )

        const elementsJson = JSON.stringify(validElements)

        updateSolution({
          meta: {
            id: newSolutionId,
            phase: 'scheduled',
          },
        })

        console.log(`🏃🏃🏃 SCHEDULED ${newSolutionId}`)

        client
          .mutate({
            mutation: gql`
              mutation ScheduleSolutionFromManager($context: ScheduleSolutionInput!) {
                scheduleSolution(context: $context)
              }
            `,
            variables: {
              context: {
                graphId: 'test-id',
                solutionId: newSolutionId,
                graphElements: elementsJson,
              },
            },
          })
          .then(() => {
            // Do nothing
          })
          .catch((err) => {
            console.error(err)

            updateSolution({
              meta: {
                phase: 'idle',
                error: 'Failed to schedule a new solution.',
              },
            })
          })
        break
      }
      case 'scheduled': {
        // Do nothing
        break
      }
      case 'idle': {
        if (meta.error) {
          // TODO: Surface meta.error
          console.log(`🏃🏃🏃 FAILED`)
          console.error(meta.error)
          break
        }

        console.log(`🏃🏃🏃 SUCCEEDED ${meta.id}`)
        break
      }
    }
  }, [meta])

  // Subscribe to all solution events for session
  const { data, error } = useSubscription(
    gql`
      subscription WatchGraphUpdates($graphId: String) {
        onSolution(graphId: $graphId) {
          solutionId
          graphId
          exceptionMessages
          runtimeMessages {
            elementId
            message
            level
          }
        }
      }
    `,
    {
      variables: {
        graphId: 'test-id',
      },
      skip: !isAuthenticated,
      shouldResubscribe: true,
    }
  )

  useEffect(() => {
    if (error) {
      console.error(error)
      return
    }

    if (!data) {
      return
    }

    if (!data.onSolution) {
      return
    }

    // Data arrived from subscription
    const { solutionId: incomingSolutionId, graphId, exceptionMessages, runtimeMessages } = data.onSolution

    if (exceptionMessages) {
      updateSolution({
        meta: {
          phase: 'idle',
          error: exceptionMessages[0],
        },
      })

      // console.error(exceptionMessages[0])

      return
    }

    for (const runtimeMessage of runtimeMessages) {
      console.log(runtimeMessage)
    }

    tryApplySolutionManifest({
      solutionId: incomingSolutionId,
      manifest: {
        duration: 100,
        messages: runtimeMessages,
      },
    })

    // Request values for all `immediate` parameters
  }, [data])

  return <>{children}</>
}
