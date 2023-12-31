import React from 'react'

type MenuButtonProps = {
  icon: React.ReactNode
  label: string
  isSelected?: boolean
  action: () => void
}

export const MenuButton = ({ icon, label, isSelected = false, action }: MenuButtonProps) => {
  return (
    <button
      className={`${
        isSelected ? 'np-bg-grey' : 'np-bg-light'
      } np-w-full np-h-8 np-pl-[6px] np-mb-1 last:np-mb-0 np-flex np-items-center np-rounded-sm hover:np-bg-grey`}
      onClick={action}
    >
      <div className="np-h-full np-w-5 np-min-w-[20px] np-flex np-flex-col np-items-center np-justify-center">
        {icon}
      </div>
      <div className="np-h-full np-pl-2 np-flex np-flex-grow np-items-center np-justify-start">
        <p className="np-font-sans np-font-medium np-text-dark np-text-sm -np-translate-y-px np-whitespace-nowrap np-overflow-hidden">
          {label}
        </p>
      </div>
    </button>
  )
}
