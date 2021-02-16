import React from 'react'
import { Color } from 'three'
import { Line as DreiLine } from '@react-three/drei'

export const SceneGrid = (): React.ReactElement => {
  const extents = 20
  const steps = Array.from('x'.repeat(extents * 2 + 1))

  // Drei Line currently wants a `StencilMask` prop that three.js says is removed
  const Line = DreiLine as any

  return (
    <>
      {steps.map((x, i) => {
        return (
          <>
            <Line
              points={[
                [i - extents, 0, -extents],
                [i - extents, 0, extents],
              ]}
              color={0x98e2c6}
            />
            <Line
              points={[
                [-extents, 0, i - extents],
                [extents, 0, i - extents],
              ]}
              color={0x98e2c6}
            />
          </>
        )
      })}
    </>
  )
}