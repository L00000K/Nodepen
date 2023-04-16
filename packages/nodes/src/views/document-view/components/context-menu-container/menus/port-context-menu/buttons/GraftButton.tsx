import React, { useCallback } from 'react'
import { MenuButton } from '../../../common'
import { STYLES } from '@/constants'

type GraftButtonProps = {
  nodeInstanceId: string
  portInstanceId: string
}

export const GraftButton = ({ nodeInstanceId: _nid, portInstanceId: _pid }: GraftButtonProps) => {
  const handleGraft = useCallback(() => {
    console.log('🐍 Not yet implemented!')
  }, [])

  const icon = (
    <div className="np-w-[18px] np-h-[18px] np-rounded-sm np-bg-light np-border-2 np-border-dark np-flex np-justify-center np-items-center">
      <svg {...STYLES.BUTTON.SMALL} width={14} height={14}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
      </svg>
    </div>
  )

  return <MenuButton icon={icon} label="Graft" action={handleGraft} />
}
