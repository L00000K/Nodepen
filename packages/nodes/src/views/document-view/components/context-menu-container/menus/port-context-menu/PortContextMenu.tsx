import React, { useCallback } from 'react'
import { useDispatch, useStore } from '$'
import type { ContextMenu, PortContextMenuContext } from '../../types'
import { MenuBody, MenuButton } from '../../common'
import { COLORS } from '@/constants'
import { PortTypeIcon } from '@/components/icons'
import { PinButton } from './buttons'

type PortContextMenuProps = {
    position: ContextMenu['position']
    context: PortContextMenuContext
}

export const PortContextMenu = ({ position, context }: PortContextMenuProps) => {
    const { nodeInstanceId, portInstanceId, portTemplate } = context
    const { __direction: direction, name, nickName } = portTemplate

    const enablePin = direction === 'input'

    return (
        <MenuBody position={position}>
            <div className='np-w-full np-flex np-flex-col np-justify-start'>
                <div className='np-w-full np-flex np-items-center np-pl-1 np-h-8 np-mb-1 np-border-2 np-border-dark np-rounded-sm'>
                    <PortTypeIcon />
                    <p className='np-pl-2 np-font-sans np-font-medium np-text-dark np-text-sm -np-translate-y-px'>
                        {`${name} (${nickName})`}
                    </p>
                </div>
                {enablePin ? <PinButton nodeInstanceId={nodeInstanceId} portInstanceId={portInstanceId} /> : null}
            </div>
        </MenuBody>
    )
}


export default PortContextMenu